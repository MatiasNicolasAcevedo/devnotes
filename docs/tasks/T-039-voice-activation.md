---
id: T-039
status: ready
priority: P1
size: S
executor: frontier
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-039-voice-activation
pr: null
depends_on: [T-037]
---
# T-039 · Activación de Groq y pruebas personales de M2-RC1

## Objetivo

El dueño activa la transcripción real con Groq en su stack persistente local, se hace el ensayo externo acotado y el dueño prueba M2-RC1 con su uso real. El resultado queda registrado en [VOICE-RELEASE](../VOICE-RELEASE.md) junto con su veredicto. Pertenece a S-105 / M2-RC1 y sigue a T-037 (MERGED, squash `aef4213`).

La siguiente tarea es [T-040](T-040-daily-timestamps.md), que abre la portabilidad `.xlsx` ([S-107](../specs/S-107-xlsx-portability.md)). Esta tarea vuelve a frontera solo si las pruebas encuentran un defecto que impide aceptar la versión, según VOICE-RELEASE §Congelación: pérdida de texto, fuga de datos, micrófono activo o guardado falso. En ese caso frontera inserta tareas de corrección antes de T-040.

## Alcance y decisiones resueltas

- **Tarea del dueño, guiada por un agente.** No hay cambios de código. Al final, solo Markdown en VOICE-RELEASE, en esta tarea, en STATUS y, si hay hallazgos, en BACKLOG.
- **Proveedor.** Groq (con q), modelo y límites según S-105. Antes de enviar audio, el dueño confirma lo que exige VOICE-RELEASE §Habilitación: cuenta propia, nivel sin pago, permiso para el ensayo con audio sintético y retención aceptada. El agente revalida en las páginas oficiales los modelos, la cuota y la retención, y registra solo los valores públicos.
- **Secretos.** El agente nunca pide, lee ni imprime la clave. El dueño la carga en **su propia terminal** Git Bash, sin historial visible, y recrea su stack con los mismos parámetros:

  ```bash
  read -rs GROQ_API_KEY && export GROQ_API_KEY && export DEVNOTES_VOICE_ENABLED=true
  bash scripts/dev.sh down --mode local --proxy nginx --project starter-dev-local-nginx
  bash scripts/dev.sh up --mode local --proxy nginx --project starter-dev-local-nginx
  bash scripts/dev.sh check --mode local --proxy nginx --project starter-dev-local-nginx
  ```

  `down` conserva el volumen. Si el dueño creó su stack con otro proyecto, proxy o `--env-file`, se usan exactamente esos parámetros.
- **Comprobación sin exponer la clave.** Con sesión abierta en el navegador, `GET /api/v1/voice/capabilities` debe devolver `recordingEnabled: true` y `reason: null`. No se usan `env`, `docker inspect` ni logs para verificarlo.
- **Ensayo externo.** Exactamente las cuatro muestras de VOICE-RELEASE §Ensayo externo: audio sintético o TTS no personal, como máximo 120 s en total y un intento por muestra, sin forzar 429. Si no hay una fuente sintética disponible, se registra como pendiente, y el dueño decide si prueba directamente con su voz en la matriz personal.
- **Matriz personal.** Las once filas de VOICE-RELEASE §Matriz, en Chromium de escritorio sobre el SHA `aef4213` o el main vigente si solo cambió Markdown. El dueño la ejecuta, y el agente anota resultado, navegador y SHA sin contenido privado.

## Leer antes

1. [VOICE-RELEASE](../VOICE-RELEASE.md) completo.
2. [S-105 · Adaptador y errores](../specs/S-105-voice-notes.md#adaptador-y-errores).
3. [SETUP · stack persistente](../SETUP.md).
4. [T-037 · Checkpoint](T-037-voice-release.md#checkpoint-vigente).

## Archivos y pasos

Archivos: `docs/VOICE-RELEASE.md` (tabla de evidencia y veredicto), esta tarea, `docs/STATUS.md` y `docs/BACKLOG.md` (solo hallazgos).

1. Confirmar con el dueño las condiciones de habilitación y revalidar en la documentación oficial de Groq. Si algo cambió materialmente, como el modelo, la cuota o la retención, hacer checkpoint a frontera sin activar.
2. El dueño carga las variables y recrea su stack. El agente comprueba `capabilities` y hace el ensayo externo, registrando fecha, modelo, formato, duraciones, éxito o fallo, latencia aproximada y observaciones.
3. El dueño recorre la matriz personal. Se registra cada fila, y los hallazgos van a BACKLOG con pasos, esperado, observado, navegador y SHA.
4. Registrar el veredicto del dueño, que puede ser «aceptada», «aceptada con mejoras» o «no aceptada» con un defecto bloqueante. Actualizar el estado de VOICE-RELEASE y publicar un PR solo de documentación.

## Aceptación y pruebas

| Criterio observable | Capa | Comando / acción | Resultado esperado |
|---|---|---|---|
| Voz activa sin exponer la clave | Manual sobre la API real | GET `/api/v1/voice/capabilities` desde la sesión del navegador | `recordingEnabled: true`, `reason: null` |
| Ensayo externo acotado | Manual con UI real | Cuatro muestras de VOICE-RELEASE | Fila de evidencia completa, o pendiente con motivo |
| Pruebas personales | Manual del dueño | Matriz de once filas | Resultado por fila y veredicto explícito del dueño con SHA |
| Documentación | DOCS_ONLY | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | OK, perfil DOCUMENTATION |

No se fabrica ningún resultado: lo que no se ejecutó figura como pendiente. CI verde no equivale a aceptación del dueño.

## Checkpoint vigente

2026-11-10. `ready`. Contrato preparado por frontera (Claude Code, Claude Opus 5.5) al conciliar T-037. Activación externa pendiente del dueño. Siguiente: sesión nueva con el prompt de STATUS.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

Un PR documental con el veredicto. Se revisa y mergea según AUTONOMY: la revisión independiente comprueba que la evidencia esté saneada y sea coherente. Tras MERGED, la siguiente sesión concilia done y toma [T-040](T-040-daily-timestamps.md), salvo que el veredicto sea «no aceptada»: en ese caso vuelve a frontera con los hallazgos bloqueantes.
