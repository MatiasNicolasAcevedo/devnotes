import { isSpace, type Space } from './space'

/**
 * Preferencia de interfaz por dispositivo y cuenta (S-109 §5): solo el enum, bajo
 * `devnotes:last-space:<id de la cuenta>`. Nada de texto, correo, fechas ni cachés. Si el navegador niega el
 * almacenamiento, quien llama sigue con su memoria; un valor guardado fuera del enum cuenta como ausente.
 */
const PREFIX = 'devnotes:last-space:'

export function spacePreferenceKey(owner: string): string {
  return `${PREFIX}${owner}`
}

export function readSpacePreference(owner: string): Space | null {
  if (!owner) return null
  try {
    const stored = window.localStorage.getItem(spacePreferenceKey(owner))
    return isSpace(stored) ? stored : null
  } catch {
    return null
  }
}

/** Devuelve false si el navegador no permitió guardar; la aplicación sigue funcionando sin la preferencia. */
export function writeSpacePreference(owner: string, space: Space): boolean {
  if (!owner || !isSpace(space)) return false
  try {
    window.localStorage.setItem(spacePreferenceKey(owner), space)
    return true
  } catch {
    return false
  }
}

/** Al cerrar sesión o expirar: borra solo la clave de esa identidad. */
export function clearSpacePreference(owner: string): void {
  if (!owner) return
  try {
    window.localStorage.removeItem(spacePreferenceKey(owner))
  } catch {
    // Almacenamiento denegado: no hay nada persistido que borrar.
  }
}
