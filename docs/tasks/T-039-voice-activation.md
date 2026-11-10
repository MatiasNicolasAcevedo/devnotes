---
id: T-039
status: mergeable
priority: P1
size: S
executor: frontier
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-039-voice-activation
pr: 46
depends_on: [T-037]
---
# T-039 · Activación de Groq y pruebas personales de M2-RC1

## Objetivo

El dueño activa la transcripción real con Groq en su stack persistente local, se hace el ensayo externo acotado y el dueño prueba M2-RC1 con su uso real. El resultado queda registrado en [VOICE-RELEASE](../VOICE-RELEASE.md) junto con su veredicto. Pertenece a S-105 / M2-RC1 y sigue a T-037 (MERGED, squash `aef4213`).

La portabilidad `.xlsx` ([S-107](../specs/S-107-xlsx-portability.md)) empieza en [T-040](T-040-daily-timestamps.md). VOICE-RELEASE §Congelación define los defectos que impiden aceptar la versión. La retoma acordada tras las pruebas figura en [Cierre y siguiente tarea](#cierre-y-siguiente-tarea).

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

Ejecución del 2026-11-10. Frontera en Codex Desktop con GPT-6 (variante y esfuerzo no expuestos), PowerShell, Git, `gh`, Node, Docker, Edge y consulta web. Impacto observado: grabación habilitada por la configuración local y transcripción externa bloqueada. El PR registra evidencia en Markdown.

- Base `c63038d8c8d0820396b6ea94e78f61671175a040`. `git status --short --branch` mostró main limpio antes de `git switch --create codex/t-039-voice-activation main`. `git merge-base --is-ancestor aef4213 main` salió 0. `git ls-remote --heads origin main codex/t-039-voice-activation` confirmó ese main y la ausencia de rama remota. `gh pr view 44 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName,statusCheckRollup` confirmó `MERGED`, squash `aef4213db2fe7f676591811b7ee67a22757b64b0`, `mergedAt` 2026-11-10T16:37:31Z y `verify-required` SUCCESS sobre `ad548bc`. `gh pr list --repo MatiasNicolasAcevedo/devnotes --state open` mostró solo PR38 de una conciliación anterior. `git diff --name-only aef4213..main` mostró solo Markdown.
- Revalidación pública registrada en [VOICE-RELEASE](../VOICE-RELEASE.md#habilitación-segura-del-proveedor). El dueño informó haber completado los pasos de alta y configuración, creado la clave y pedido continuar tras la guía de plan Free e `Inference APIs ZDR`. La consola del dueño se mantiene como fuente de los límites efectivos.
- `docker container ls --all` y `docker volume ls`, filtrados por las etiquetas `io.starter.local.owner=v1` e `io.starter.local.source` de este checkout, identificaron `starter-dev-devnotes-preview-1027` (`nginx`, origen `http://127.0.0.1:5175`, OIDC 8090), con cuatro servicios detenidos y su volumen `starter-dev-devnotes-preview-1027_db-data`. Coincide con el proyecto documentado en [SETUP](../SETUP.md#prueba-manual-en-windows). Conservar ese proyecto y los parámetros originales al retomarlo.
- La sonda local de Windows Speech Synthesis en PowerShell 5.1 produjo un WAV `es-ES` en memoria, sin guardar archivos ni enviar audio. Para el ensayo se eligió TTS local con WAV como entrada de micrófono sintético en un perfil Chromium separado. La captura en la UI sigue pendiente.
- Muestras preparadas con Windows Speech Synthesis y silencio PCM, verificadas con Node leyendo cabecera RIFF/WAVE, formato y longitud del bloque `data`: breve 14,80 s, técnica 30,02 s, silencio 4,00 s y segunda nota 14,65 s (63,48 s total antes de captura). Recursos propios: `.orchestrator/t039-audio-2ac491a947364153996e1007053d73b9/`, ruta ignorada. Tras el ensayo, retirar solo estos cuatro WAV y el perfil de navegador temporal que se cree para la prueba. Ninguna muestra enviada todavía.
- `node scripts/docs-check.mjs` y `git diff --check` pasaron sobre el avance local. El verificador PowerShell de SETUP ejecutó `bash scripts/verify.sh --policy origin/main` con `changed=0` porque HEAD sigue en la base. La clasificación del diff documental se hará sobre el commit de entrega.
- Primer intento de `down` reportado por el dueño: `Local project ownership mismatch; no resources changed.` La terminal era Ubuntu/WSL bajo `/mnt/wsl/docker-desktop-bind-mounts/`, mientras el stack se identificó por la etiqueta de origen `/c/D/matias/proyectos-ia/devnotes`. La cadena con `&&` se detuvo en `down`.
- El dueño retomó desde Git Bash de Windows en `/c/D/matias/proyectos-ia/devnotes` y cargó las variables en privado. Su captura de la secuencia `down`, `up` y `check` muestra el proyecto `starter-dev-devnotes-preview-1027` listo y `Local API/DB/OIDC check passed`. Sonda HTTP de frontera en el mismo origen: `GET /api/v1/system/info` 200 y `GET /api/v1/voice/capabilities` sin sesión 401.
- Primer login del dueño desde el navegador habitual: `ERR_CONNECTION_TIMED_OUT` al conectar con `host.docker.internal:8090`. La sonda de solo lectura desde el host a `127.0.0.1:8090/default/.well-known/openid-configuration` devolvió 200. Usar Edge con perfil separado y resolución por proceso según [SETUP](../SETUP.md#prueba-manual-en-windows).
- `GET /api/v1/voice/capabilities` desde la sesión local de Edge muestra `recordingEnabled: true`, `reason: null`, `mimeTypes: ["audio/webm"]` y `language: "es"` en la captura del dueño. La sonda autenticada de frontera en el perfil temporal confirmó HTTP 200, `recordingEnabled: true` y `reason: null`.
- Ensayo desde HEAD/base `c63038d`: `node .orchestrator/t039-audio-2ac491a947364153996e1007053d73b9/voice-smoke.mjs` contra `http://127.0.0.1:5175`. Edge separado con WAV como micrófono. La captura breve se detuvo una vez, pero el observador falló al consultar la página y no recuperó estado HTTP, latencia ni texto. El marcador local conserva el intento e impide repetirlo.
- Se verificó la sonda antes de grabar y se ejecutó el mismo comando con `--remaining`. La muestra técnica produjo HTTP 502 `VOICE_INVALID_RESPONSE`, WebM/Opus, captura 30,4 s y respuesta en ~0,4 s desde Detener. El proceso se detuvo en el primer HTTP distinto de 200; conserva su marcador de intento.
- `node --check` del guion y ejecución con `--remaining --from-silence`. Ambos intentos devolvieron HTTP 502 `VOICE_INVALID_RESPONSE`. El guion salió 1 por el resultado de las muestras. Se registró [evidencia saneada](../VOICE-RELEASE.md#resultado-de-t-039) y el [defecto de multipart](../BACKLOG.md#hallazgos-de-t-039), confirmado por lectura de `GroqTranscriptionClient` y comparación con la documentación oficial. El ensayo no midió el estado HTTP upstream.
- Cleanup: cero WAV y cero perfiles de ensayo tras eliminar únicamente los cuatro ficheros propios de la ruta comprobada. Sin notas de ensayo creadas ni cambios a contenedores o volumen del dueño. Guion y marcadores de intento locales e ignorados.
- Prueba de Voz sin clave, HEAD/base `c63038d`: tras comprobar ausencia de recursos por label exacto, ejecutar desde la raíz con Git Bash `DEVNOTES_VOICE_ENABLED=true GROQ_API_KEY= bash scripts/dev.sh up --mode local --proxy nginx --project starter-dev-t039-unconfigured-5d73b9 --env-file .orchestrator/t039-audio-2ac491a947364153996e1007053d73b9/unconfigured.env`. Puertos de ensayo 18175/18176/21090 y OIDC ficticio. Log local ignorado `unconfigured-up.log` en el mismo directorio. Cleanup: `dev.sh down` con los mismos argumentos, eliminar solo el volumen ficticio de este proyecto tras verificar etiqueta y comprobar cero contenedores, redes y volúmenes propios.
- Arranque del stack de prueba con exit 0, `Local API/DB/OIDC check passed` y origen `http://127.0.0.1:18175`. La revisión del 502 confirmó en la referencia de Groq que el modelo va en una parte multipart obligatoria. El contrato de corrección quedó en [BACKLOG](../BACKLOG.md#hallazgos-de-t-039).
- Cleanup del stack sin clave: `dev.sh down` con el mismo proyecto y archivo de puertos, y `docker volume rm starter-dev-t039-unconfigured-5d73b9_db-data` tras cotejar el nombre y las etiquetas exactas del ensayo. Las consultas finales por proyecto dieron cero contenedores, redes y volúmenes propios. El stack principal tenía cuatro contenedores en ejecución.
- Veredicto explícito del dueño el 2026-11-10: «Aceptada con mejoras». Dio por concluida esta ronda y pidió retomar las pruebas de voz tras corregir el 502. Matriz y ensayo registrados en [VOICE-RELEASE](../VOICE-RELEASE.md).
- Publicación: [PR46](https://github.com/MatiasNicolasAcevedo/devnotes/pull/46) contra `main`, evidencia inicial en `f7061b1`. `node scripts/docs-check.mjs` y `git diff --check` pasaron. `bash scripts/verify.sh --policy origin/main` dio `policy=DOCS_ONLY`, `profile=DOCUMENTATION`, cuatro Markdown.

### Revisión independiente

2026-11-10. Reviewer en sesión nueva, Codex Desktop (GPT-6, variante y esfuerzo no expuestos), PowerShell, Git, `gh`, Git Bash, Node y consulta web. Revisión favorable. El PR documenta la ronda y su seguimiento sin cambios de comportamiento, API, permisos, datos o UI.

- `gh pr view 46 --repo MatiasNicolasAcevedo/devnotes` y `git ls-remote --heads origin refs/heads/main refs/heads/codex/t-039-voice-activation` confirmaron HEAD de entrada `d23206b61d04aea98a3ce13c1bd6afc0ab252bc3` y base `c63038d8c8d0820396b6ea94e78f61671175a040`. PR abierto, listo para revisión, sin hilos. [verify-required SUCCESS en el HEAD de entrada](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42880871715/job/130056495482).
- `bash scripts/verify.sh --policy origin/main` dio `DOCS_ONLY / DOCUMENTATION` con cuatro Markdown. `node scripts/docs-check.mjs` y `git diff --check origin/main...HEAD` pasaron. Las fuentes del gate STARTER de T-037 (`8775ac9`) coinciden con las de la entrega `aef4213` y la base de T-039. Se conserva la evidencia de ese gate para esas fuentes.
- VOICE-RELEASE separa el resultado de configuración, el ensayo externo (tres 502 y una muestra indeterminada) y el veredicto del dueño «Aceptada con mejoras». La lectura del adaptador en la base confirma que el multipart contiene solo `file`. Groq exige `model` y documenta los metadatos de silencio con `verbose_json`. El estado HTTP de Groq quedó indeterminado. [Seguimiento y regresión esperada](../BACKLOG.md#hallazgos-de-t-039) · [Contrato del proveedor](https://console.groq.com/docs/speech-to-text#using-the-api)
- Siguiente acción: comprobar el HEAD publicado de esta transición, repetir el gate documental, esperar `verify-required` y publicar el veredicto ligado al HEAD y base finales antes de aplicar AUTONOMY.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-10 / `c63038d` | La huella del checkout WSL difería de la etiqueta del stack persistente creado en Windows. | Usar Git Bash de Windows desde el checkout original con el mismo proyecto y proxy. | `up` listo y `Local API/DB/OIDC check passed` en la captura del dueño. |
| 2026-11-10 / `c63038d` | El navegador habitual agotó el tiempo al acceder al proveedor local por `host.docker.internal`. | Abrir Edge con perfil separado y `--host-resolver-rules="MAP host.docker.internal 127.0.0.1"`. | El dueño volvió a DevNotes con sesión OIDC ficticia y servidor conectado. |

## Cierre y siguiente tarea

Con «Aceptada con mejoras», el dueño cerró esta ronda y pidió retomar el ensayo de voz después de corregir el 502. Tras confirmar MERGED del PR documental, una sesión nueva de frontera concilia T-039 y prepara el contrato de corrección y reensayo. La dependencia de T-040 se resuelve en esa planificación.
