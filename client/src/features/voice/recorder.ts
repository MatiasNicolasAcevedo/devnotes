/**
 * Controlador de captura de audio del navegador.
 *
 * Encapsula getUserMedia y MediaRecorder sin depender de React.
 * En producción usa las APIs reales; en pruebas se inyectan dobles.
 * No transcribe ni sube el audio: entrega el blob completo y su estado al consumidor.
 */

/** Estado de la máquina de captura. */
export type CaptureState = 'idle' | 'requesting' | 'recording' | 'stopping' | 'error'

export interface CaptureResult {
  /** Blob con el audio completo (WebM/Opus). */
  blob: Blob
  /** Duración real en segundos (reloj monótono). */
  durationSeconds: number
  /** Tamaño en bytes del blob. */
  sizeBytes: number
  /** Generación que produjo este resultado; el consumidor la compara para descartar respuestas obsoletas. */
  generation: number
}

export interface CaptureControllerOptions {
  /** Límite máximo de duración en segundos (S-105: 600). */
  maxDurationSeconds?: number
  /** Límite máximo de tamaño en bytes (S-105: 20 MiB = 20971520). */
  maxAudioBytes?: number
  /** Lista de MIME preferidos; el primero soportado se usa. */
  mimeTypes?: string[]
  /** getUserMedia inyectable (solo pruebas). */
  getUserMedia?: () => Promise<MediaStream>
  /** MediaRecorder constructor inyectable (solo pruebas). */
  MediaRecorder?: typeof MediaRecorder
  /** isTypeSupported inyectable (solo pruebas). */
  isTypeSupported?: (type: string) => boolean
  /** performance.now inyectable (solo pruebas). */
  now?: () => number
}

const DEFAULT_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm']
const DEFAULT_MAX_DURATION = 600
const DEFAULT_MAX_BYTES = 20_971_520 // 20 MiB

/** Error lanzado cuando el navegador no soporta los MIME requeridos. */
export class UnsupportedMimeTypeError extends Error {
  constructor() {
    super('El navegador no soporta los formatos de audio requeridos.')
    this.name = 'UnsupportedMimeTypeError'
  }
}

/** Error lanzado cuando getUserMedia no está disponible. */
export class GetUserMediaNotFoundError extends Error {
  constructor() {
    super('getUserMedia no está disponible en este navegador.')
    this.name = 'GetUserMediaNotFoundError'
  }
}

/** Error lanzado cuando el permiso del micrófono es denegado. */
export class PermissionDeniedError extends Error {
  constructor() {
    super('El permiso del micrófono fue denegado.')
    this.name = 'PermissionDeniedError'
  }
}

/** Error lanzado cuando se excede el límite de duración. */
export class MaxDurationExceededError extends Error {
  readonly durationSeconds: number
  constructor(seconds: number) {
    super(`Se excedió la duración máxima (${seconds} s).`)
    this.name = 'MaxDurationExceededError'
    this.durationSeconds = seconds
  }
}

/** Error lanzado cuando se excede el límite de tamaño. */
export class MaxSizeExceededError extends Error {
  readonly sizeBytes: number
  constructor(bytes: number) {
    super(`Se excedió el tamaño máximo (${bytes} bytes).`)
    this.name = 'MaxSizeExceededError'
    this.sizeBytes = bytes
  }
}

interface Listener {
  (state: CaptureState, result?: CaptureResult, error?: Error): void
}

export class CaptureController {
  private _state: CaptureState = 'idle'
  private _stream: MediaStream | null = null
  private _recorder: MediaRecorder | null = null
  private _chunks: Blob[] = []
  private _startTime: number = 0
  private _timerId: number | null = null
  private _listeners: Set<Listener> = new Set()
  private _generation = 0
  private _mimeTypes: string[]
  private _maxDuration: number
  private _maxBytes: number
  private _getUserMedia: () => Promise<MediaStream>
  private _MediaRecorder: typeof MediaRecorder
  private _isTypeSupported: (type: string) => boolean
  private _now: () => number

  constructor(options: CaptureControllerOptions = {}) {
    this._mimeTypes = options.mimeTypes ?? DEFAULT_MIME_TYPES
    this._maxDuration = options.maxDurationSeconds ?? DEFAULT_MAX_DURATION
    this._maxBytes = options.maxAudioBytes ?? DEFAULT_MAX_BYTES
    this._getUserMedia =
      options.getUserMedia ??
      (() => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new GetUserMediaNotFoundError()
        }
        return navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } })
      })
    this._MediaRecorder =
      options.MediaRecorder ??
      (typeof MediaRecorder !== 'undefined'
        ? MediaRecorder
        : ((() => {
            throw new Error('MediaRecorder no está disponible.')
          }) as unknown as typeof MediaRecorder))
    this._isTypeSupported =
      options.isTypeSupported ??
      (() => {
        if (
          typeof MediaRecorder !== 'undefined' &&
          typeof MediaRecorder.isTypeSupported === 'function'
        ) {
          return MediaRecorder.isTypeSupported
        }
        return () => false
      })()
    this._now = options.now ?? (() => performance.now())
  }

  get state(): CaptureState {
    return this._state
  }

  /** Suscríbete a cambios de estado. */
  subscribe(listener: Listener): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  /**
   * Inicia la captura. Lanza si ya está grabando o si no se puede obtener el micrófono.
   * Idempotente: llamar dos veces sin stop intermedio no duplica la captura.
   */
  async start(): Promise<void> {
    if (this._state === 'recording' || this._state === 'requesting' || this._state === 'stopping') {
      return
    }

    const generation = ++this._generation
    this._transition('requesting')

    try {
      const stream = await this._getUserMedia()
      if (generation !== this._generation) {
        this._stopTracks(stream)
        return
      }
      this._stream = stream
      for (const track of stream.getTracks()) {
        track.addEventListener('ended', this._trackEnded)
      }

      const mimeType = this._selectMimeType()
      this._chunks = []
      this._recorder = new this._MediaRecorder(stream, { mimeType })

      this._recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this._chunks.push(event.data)
        }
      }

      this._recorder.onstop = () => {
        // onstop se dispara después de stop(); el resultado se construye en stop().
      }

      this._recorder.onerror = () => {
        this._forceStop(new Error('Error del MediaRecorder.'))
      }

      this._recorder.start(1000) // timeslice de 1 segundo
      this._startTime = this._now()
      this._transition('recording')

      // Timer de límite de duración
      const durationMs = this._maxDuration * 1000
      this._timerId = setTimeout(() => {
        // Si sigue grabando, se detiene y notifica.
        if (this._state === 'recording') {
          this._forceStop(new MaxDurationExceededError(this._maxDuration))
        }
      }, durationMs) as unknown as number
    } catch (err) {
      if (generation !== this._generation) return
      this._cleanup()
      const error = err instanceof Error ? err : new Error(String(err))
      if (error instanceof PermissionDeniedError) {
        this._transition('error', undefined, error)
      } else if (err instanceof DOMException && err.name === 'NotAllowedError') {
        this._transition('error', undefined, new PermissionDeniedError())
      } else {
        this._transition('error', undefined, error)
      }
    }
  }

  /**
   * Detiene la captura y devuelve el resultado.
   * Idempotente: llamar dos veces devuelve el mismo resultado.
   * Espera el último fragmento dataavailable antes de resolver.
   */
  stop(): Promise<CaptureResult> {
    if (this._state === 'stopping') {
      // Ya se está deteniendo; devolver la promesa existente.
      return this._pendingStop ?? Promise.reject(new Error('Stop en curso.'))
    }

    if (this._state !== 'recording') {
      return Promise.reject(new Error(`No se puede detener en estado ${this._state}.`))
    }

    return this._doStop()
  }

  private _pendingStop: Promise<CaptureResult> | null = null
  private _cancelStop: (() => void) | null = null

  private async _doStop(): Promise<CaptureResult> {
    const generation = this._generation
    const pending = this._doStopInner()
    this._pendingStop = pending
    try {
      return await pending
    } catch (error) {
      if (generation === this._generation) {
        this._forceStop(error instanceof Error ? error : new Error('Error al detener la captura.'))
      }
      throw error
    } finally {
      if (this._pendingStop === pending) this._pendingStop = null
    }
  }

  private async _doStopInner(): Promise<CaptureResult> {
    this._transition('stopping')

    // Cancelar timer de duración
    if (this._timerId !== null) {
      clearTimeout(this._timerId)
      this._timerId = null
    }

    const recorder = this._recorder
    if (!recorder) {
      this._cleanup()
      return Promise.reject(new Error('No hay MediaRecorder activo.'))
    }

    const gen = this._generation

    // Si el recorder ya está parado (ej. onerror), ensamblar directamente.
    if (recorder.state === 'inactive') {
      const result = this._assembleResult(gen)
      return Promise.resolve(result!)
    }

    // Esperar el último fragmento. MediaRecorder dispara dataavailable + onstop de forma asíncrona.
    return new Promise((resolve, reject) => {
      this._cancelStop = () => reject(new DOMException('Captura cancelada.', 'AbortError'))
      recorder.onstop = () => {
        this._cancelStop = null
        try {
          const result = this._assembleResult(gen)
          resolve(result!)
        } catch (e) {
          reject(e)
        }
      }
      recorder.stop()
    })
  }

  private _assembleResult(gen: number): CaptureResult {
    const durationMs = this._now() - this._startTime
    const durationSeconds = Math.round(durationMs / 1000) / 1000

    const blob = new Blob(this._chunks, { type: this._recorder?.mimeType ?? 'audio/webm' })
    const sizeBytes = blob.size

    // Verificar límites
    if (sizeBytes === 0) {
      this._cleanup()
      throw new Error('El audio capturado está vacío.')
    }

    if (sizeBytes > this._maxBytes) {
      this._cleanup()
      throw new MaxSizeExceededError(sizeBytes)
    }

    // Limpiar recursos
    this._cleanup()

    // Si la generación cambió (nuevo start mientras se detenía), descartar.
    if (gen !== this._generation) {
      throw new Error('Resultado obsoleto: nueva captura en curso.')
    }

    const result: CaptureResult = {
      blob,
      durationSeconds,
      sizeBytes,
      generation: gen,
    }

    this._transition('idle', result)
    return result
  }

  /**
   * Cancela una solicitud de permiso pendiente.
   * Invalida la generación actual y detiene tracks si llegan después.
   */
  cancelRequest(): void {
    if (this._state !== 'requesting') return

    const stream = this._stream
    if (stream) {
      this._stopTracks(stream)
      this._stream = null
    }

    this._generation++
    this._transition('idle')
  }

  /**
   * Detiene la captura por fuerza (límite, error, logout, etc.).
   * No devuelve resultado; limpia todo y transiciona a error o idle.
   */
  dispose(error?: Error): void {
    if (this._state === 'idle') return
    this._forceStop(error)
  }

  private _trackEnded = () => this._forceStop(new Error('El micrófono se desconectó.'))

  private _forceStop(error?: Error): void {
    this._generation++
    this._cancelStop?.()
    this._cancelStop = null
    if (this._timerId !== null) {
      clearTimeout(this._timerId)
      this._timerId = null
    }

    const recorder = this._recorder
    this._cleanup()
    if (recorder && recorder.state !== 'inactive') recorder.stop()

    if (error) {
      this._transition('error', undefined, error)
    } else {
      this._transition('idle')
    }
  }

  private _cleanup(): void {
    if (this._recorder) {
      this._recorder.ondataavailable = null
      this._recorder.onstop = null
      this._recorder.onerror = null
    }
    this._recorder = null
    this._chunks = []
    if (this._stream) {
      this._stopTracks(this._stream)
      this._stream = null
    }
  }

  private _stopTracks(stream: MediaStream): void {
    for (const track of stream.getTracks()) {
      track.removeEventListener('ended', this._trackEnded)
      track.stop()
    }
  }

  private _transition(state: CaptureState, result?: CaptureResult, error?: Error): void {
    this._state = state
    for (const listener of this._listeners) {
      listener(state, result, error)
    }
  }

  private _selectMimeType(): string {
    for (const mime of this._mimeTypes) {
      if (this._isTypeSupported(mime)) {
        return mime
      }
    }
    throw new UnsupportedMimeTypeError()
  }
}
