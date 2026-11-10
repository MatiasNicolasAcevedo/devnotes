---
id: T-049
status: in_progress
priority: P1
size: S
executor: frontier
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-049-voice-retest
pr: null
depends_on: [T-048]
---
# T-049 · Reensayo sintético de voz con Groq y el dueño

## Objetivo

Demostrar voz real en el entorno local del dueño con el adaptador corregido y entrada sintética. El resultado y el SHA se registran en [VOICE-RELEASE](../VOICE-RELEASE.md). El veredicto «Aceptada con mejoras» de T-039 queda como evidencia de su ronda.

## Alcance y decisiones resueltas

- Partir del squash de T-048 confirmado MERGED en GitHub, o del `main` vigente si las fuentes coinciden con ese squash. Registrar SHA, navegador y versión, proxy y modelo. Usar la UI/API reales en Chromium de escritorio con OIDC ficticio y proveedor Groq real (`DEVNOTES_VOICE_TEST_PROVIDER=false`).
- Antes de enviar, confirmar con el dueño el permiso para esta ronda sintética, su plan Free sin gasto nuevo y sus controles de retención aceptados. Revalidar modelo, cuota y retención según VOICE-RELEASE. El dueño aplica el SHA y carga la clave en privado con la receta y parámetros originales de su stack, conservando el volumen. Si hace falta recrearlo, lo hace el dueño desde su checkout original. Verificar solo la configuración visible y los resultados saneados.
- Cuatro muestras de VOICE-RELEASE, en el orden de la tabla. Una detención y como máximo una inferencia por muestra, con tope total de 120 s de captura. Usar TTS local o audio sintético no personal, en un perfil Chromium separado. Ante falta de autorización, de entrada sintética o de observación fiable, detener y registrar el pendiente. Detener también ante el primer resultado fuera de criterio, 429, error de credenciales o timeout. Una muestra indeterminada consume su intento. Registrar las restantes como pendientes.

## Leer antes

1. [VOICE-RELEASE · Habilitación](../VOICE-RELEASE.md#habilitación-segura-del-proveedor).
2. [VOICE-RELEASE · Ensayo externo](../VOICE-RELEASE.md#ensayo-externo-acotado).
3. [SETUP · Prueba manual en Windows](../SETUP.md#prueba-manual-en-windows).
4. [T-048 · Cierre](T-048-groq-multipart-fix.md#cierre-y-siguiente-tarea).

## Archivos y pasos

1. Confirmar MERGED de T-048, conciliarla en esta rama y acordar con el dueño las condiciones del ensayo. Preparar cuatro muestras ficticias con duraciones medidas y un perfil separado. Antes de grabar, comprobar que el observador puede contar los POST y capturar estado, código y latencia desde «Detener y transcribir» sin registrar cuerpos, headers ni credenciales.
2. Con el SHA corregido activo, comprobar `GET /api/v1/voice/capabilities` desde la sesión local. Ejecutar la matriz una vez y comprobar con el dueño que los tres textos hablados son útiles en español y que el silencio deja el editor sin transcripción. Guardar explícitamente la primera muestra breve tras comprobar que la transcripción sola no crea nota. Usar otra nota ficticia para la segunda muestra breve.
3. Registrar en VOICE-RELEASE fecha, SHA, navegador, formato, modelo, duración y latencia aproximada por muestra, HTTP/código, resultado funcional y confirmación del dueño. Limpiar solo muestras, perfil y notas ficticias propios previamente identificados. Conservar evidencia y retoma en esta tarea y actualizar STATUS.

## Aceptación y pruebas

| Criterio | Acción | Resultado |
|---|---|---|
| Configuración disponible | `GET /api/v1/voice/capabilities` autenticado | HTTP 200, `recordingEnabled: true`, `reason: null` |
| Español breve y técnico | Grabar y detener una vez por muestra | Un POST por muestra, HTTP 200 y texto editable en español que conserva el sentido y el identificador ficticio. Revisar números, puntuación y términos técnicos con el dueño. El texto se puede corregir y copiar, y la colección cambia solo al guardar |
| Silencio sintético | Grabar 3–5 s y detener | Un POST, HTTP 422 `VOICE_NO_SPEECH`, mensaje visible y editor sin texto atribuido al silencio |
| Segunda nota breve | Grabar y detener, editar/copiar/guardar, reabrir las dos notas y borrar las de prueba | Un POST de transcripción, HTTP 200 con otro texto editable y dos notas ficticias independientes tras el guardado explícito. Tras el cleanup desaparecen solo esas notas |
| Gate documental | Desde raíz/Git Bash: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` | OK, DOCUMENTATION sobre el diff final, con gate de T-048 conservado si base/fuentes cumplen TESTING |

«Voz real verificada» requiere las cuatro muestras favorables, con evidencia observable y confirmación del dueño en el SHA ensayado. La sonda de capabilities comprueba configuración. La evidencia del ensayo valida Groq con entrada sintética en ese entorno.

## Checkpoint vigente

2026-11-10. Frontera en Codex Desktop (GPT-6, variante y esfuerzo no expuestos), con PowerShell, Windows Speech Synthesis, Git, `gh`, Git Bash, Node 24.21.0 y consulta web. Avance documental, sin cambios en comportamiento, API, permisos de la aplicación, persistencia ni UI. Base de la rama y SHA objetivo `6f423e37be71d8fd9bb48561b3a74bfcb80c2421`, confirmado en [T-048](T-048-groq-multipart-fix.md#checkpoint-vigente). Worktree documental separado del checkout original que usa el stack persistente.

El dueño autorizó hasta cuatro muestras sintéticas y 120 s de captura. Confirmó organización Free, ausencia de gasto nuevo, `Inference APIs ZDR` activo y cuota efectiva suficiente. Groq publica compatibilidad de `whisper-large-v3-turbo` con WebM y español, máximo Free de 25 MB, cuota Free de 20 solicitudes/min, 2.000/día, 7.200 s de audio/h y 28.800 s/día, y elegibilidad ZDR para transcripciones. [Modelo y formatos](https://console.groq.com/docs/speech-to-text) · [Cuotas](https://console.groq.com/docs/rate-limits) · [Retención](https://console.groq.com/docs/your-data)

Preparación local en `.orchestrator/t049-synthetic-fixtures/` del checkout original, ruta ignorada. `node .orchestrator/t049-synthetic-fixtures/prepare-silence.mjs` terminó con exit 0 y verificó WAV PCM mono de 16 bits: breve 14,93 s, técnica 27,74 s, silencio 4,00 s y segunda breve 13,15 s (59,82 s total de las fuentes). `node --check .orchestrator/t049-synthetic-fixtures/observe-transcription.js` terminó con exit 0. La prueba aislada del observador con `node:vm` confirmó registro mínimo para 200, 422 `VOICE_NO_SPEECH` y fallo de red, con bloqueo de un segundo POST. Pendiente validar en Chromium con la aplicación real. Para el cleanup, retirar solo los cuatro WAV propios y los perfiles separados de esta ronda después de cerrarlos, además de las notas ficticias identificadas en el ensayo.

Pendiente: el dueño aplica el SHA objetivo y retoma su stack desde el checkout original con la clave cargada en privado, `DEVNOTES_VOICE_ENABLED=true` y `DEVNOTES_VOICE_TEST_PROVIDER=false`. Tras su confirmación, verificar capabilities autenticado y la sonda de observación en Chromium separado antes de grabar. Cero intentos consumidos. FULL integrado diferido hasta después de T-044 MERGED.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

Con resultado favorable, actualizar VOICE-RELEASE a «Voz real verificada» con el SHA ensayado y publicar el PR documental único para revisión independiente. Si el resultado es fallido, indeterminado o pendiente, registrar causa, evidencia, intentos consumidos y la próxima decisión en STATUS, con T-040 en espera. Tras T-049 favorable y MERGED, la siguiente sesión concilia `done` y toma [T-040](T-040-daily-timestamps.md).
