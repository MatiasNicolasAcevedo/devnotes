---
id: T-048
status: in_progress
priority: P1
size: S
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-048-groq-multipart-fix
pr: null
depends_on: [T-039]
---
# T-048 · Corregir el multipart del adaptador Groq

## Objetivo

Completar la solicitud que DevNotes envía a Groq al detener la grabación. T-039 observó HTTP 502 `VOICE_INVALID_RESPONSE`. El adaptador enviaba solo `file` y omitía el `model` obligatorio. El estado HTTP de Groq quedó indeterminado. El protocolo corregido se demuestra contra un doble HTTP local y luego se reensaya con Groq en [T-049](T-049-voice-retest.md).

## Alcance y decisiones resueltas

- En el `POST /openai/v1/audio/transcriptions` saliente, enviar las cinco partes definidas en S-105 una vez por campo. Conservar los bytes de `file` y usar un boundary válido y consistente entre cabecera y cuerpo, con delimitador final y CRLF.
- Mantener destino, transporte, autenticación Bearer del servidor, límites y mapeos de S-105. La API de DevNotes sigue recibiendo solo `file` con sesión y CSRF. Limitar los cambios de código a la serialización saliente y su prueba. Usar credenciales y audio ficticios en todas las pruebas automáticas.

## Leer antes

1. [server/AGENTS](../../server/AGENTS.md).
2. [S-105 · Adaptador y errores](../specs/S-105-voice-notes.md#adaptador-y-errores).
3. [BACKLOG · Hallazgos de T-039](../BACKLOG.md#hallazgos-de-t-039).
4. [TESTING · Gate de cierre](../TESTING.md#frecuencia-y-alcance-del-gate).

## Archivos y pasos

`server/src/main/java/com/example/devnotes/voice/infrastructure/GroqTranscriptionClient.java` y `server/src/test/java/com/example/devnotes/voice/infrastructure/GroqTranscriptionClientTest.java`.

1. Usar el `HttpServer` loopback del test existente. Inspeccionar la solicitud HTTP con el boundary de la cabecera y validar por parte, sin depender del orden ni buscar substrings sueltos en el audio. Comprobar POST, Bearer ficticio, nombres y valores exactos, una parte por campo y bytes/MIME/nombre del archivo. Hacer que el doble devuelva 400 si falta el modelo o falla el contrato y 200 con una respuesta `verbose_json` ficticia válida solo cuando se cumple.
2. Ejecutar la regresión dirigida antes de tocar el adaptador. Registrar el rechazo por ausencia de `model`, el fallo de la expectativa de transcripción y el exit distinto de 0. Conservar el diagnóstico sin cuerpos ni cabeceras crudas.
3. Corregir el multipart y ejecutar el mismo test y la clase completa. Conservar los casos existentes de error, silencio y límites. Ejecutar FULL una vez al cerrar las fuentes, con checkpoint previo, base/SHA, namespaces propios verificados, logs saneados y cleanup según TESTING y SETUP.

## Aceptación y pruebas

| Criterio observable | Capa | Comando | Resultado |
|---|---|---|---|
| Contrato saliente con rechazo de multipart incompleto | HTTP local en Surefire | Desde `server/`, Git Bash/JDK 21: `./mvnw -q test -Dtest=GroqTranscriptionClientTest#transcribeSendsGroqMultipartContract` | Rojo con el adaptador anterior (400 del doble por modelo ausente), verde con las cinco partes y la transcripción ficticia esperada |
| Casos existentes del adaptador | Surefire | Desde `server/`, Git Bash/JDK 21: `./mvnw -q test -Dtest=GroqTranscriptionClientTest` | Exit 0 |
| Gate de aplicación | FULL | Desde la raíz en Git Bash, `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t048 STARTER_E2E_PROJECT=starter-e2e-t048 STARTER_SERVER_TESTS=container bash scripts/verify.sh` | Exit 0, incluidos IT PostgreSQL y Playwright real con doble externo. Clasificar con `bash scripts/verify.sh --policy origin/main` sobre el commit final |

## Checkpoint vigente

Contrato y conciliación de T-039 preparados el 2026-11-10 por frontera en Codex Desktop (GPT-6, variante y esfuerzo no expuestos).

Sesión de implementación en Codex Desktop (GPT-6, variante y esfuerzo no expuestos), con PowerShell, Git Bash, Maven Wrapper/JDK 21, Git, `gh`, Node y Docker. Impacto en el cuerpo HTTP saliente de voz, sin cambios de API pública, permisos, persistencia ni UI. `gh pr view 46` confirmó `MERGED` contra `main`, squash `c5e37cc4b73ad038ac35edf29c66131416bb4a34`. `git ls-remote` confirmó esa base y el HEAD inicial `8699877c9491654a2f9e376d9e3596352232a228` de la rama de T-048.

### Gate de cierre

Checkpoint previo a FULL. Base `c5e37cc4b73ad038ac35edf29c66131416bb4a34`. Huellas Git de las fuentes: adaptador `76bbe99c0e55c5c13401f27341bacbe9cac0ad7c` y prueba `a2e71c008ab88ee29ccc3604ba23e4e4bba56417`. Comando FULL de la tabla desde la raíz con Git Bash explícito y Node 24.21.0 en PATH según SETUP. Log saneado en `.orchestrator/t048/full.log` (ignorado). Los namespaces `starter-verify-t048` y `starter-e2e-t048` estaban libres de contenedores, redes y volúmenes por label exacto. Revalidar antes del arranque. E2E usa el cleanup del harness. Para el runner de verificación, `docker compose --env-file .env.example -p starter-verify-t048 --profile verify down --volumes --remove-orphans`. Verificar ambos namespaces vacíos después y comparar huellas. Si pasa, publicar las fuentes y preparar el PR para revisión independiente.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-10 / `8699877` + prueba local | El adaptador solo enviaba `file`. | Agregar los cuatro campos de texto definidos en S-105 al mismo multipart con boundary aleatorio. | Desde `server/`, `./mvnw -q test -Dtest=GroqTranscriptionClientTest#transcribeSendsGroqMultipartContract`: rojo exit 1 (HTTP 400, `missing model part`, 1 fallo de la expectativa de transcripción), luego verde exit 0. `./mvnw -q test -Dtest=GroqTranscriptionClientTest`: 16/16, exit 0. |

## Cierre y siguiente tarea

Publicar un único PR a `main` tras el gate, con revisión independiente y merge según AUTONOMY. Con MERGED confirmado, la sesión de [T-049](T-049-voice-retest.md) concilia T-048 en su rama y coordina el reensayo con el dueño. El FULL acredita el circuito con doble externo. El estado «Voz real verificada» se decide por la evidencia de T-049.
