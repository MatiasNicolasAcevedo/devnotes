---
id: T-049
status: mergeable
priority: P1
size: S
executor: frontier
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-049-voice-retest
pr: 48
depends_on: [T-048]
---
# T-049 · Reensayo sintético de voz con Groq y el dueño

## Objetivo

Demostrar voz real en el entorno local del dueño con el adaptador corregido y entrada sintética. El resultado y el SHA se registran en [VOICE-RELEASE](../VOICE-RELEASE.md). El veredicto «Aceptada con mejoras» de T-039 queda como evidencia de su ronda.

## Alcance y decisiones resueltas

- La primera ronda parte del squash de T-048 confirmado MERGED en GitHub, o del `main` vigente si las fuentes coinciden con ese squash. Ante el fallo de silencio observado, la reanudación requiere el SHA con la corrección acotada descrita en el checkpoint y un nuevo presupuesto explícito del dueño. Registrar SHA, navegador y versión, proxy y modelo. Usar la UI/API reales en Chromium de escritorio con OIDC ficticio y proveedor Groq real (`DEVNOTES_VOICE_TEST_PROVIDER=false`).
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
| Gate de cierre | Desde raíz/Git Bash: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main`; con corrección del adaptador, sumar las pruebas dirigidas y negativas del checkpoint | Checks OK y clasificación registrada sobre el diff final. Con código se aplica el cierre temporal de TESTING y se conserva FULL integrado diferido |

«Voz real verificada» requiere las cuatro muestras favorables, con evidencia observable y confirmación del dueño en el SHA ensayado. La sonda de capabilities comprueba configuración. La evidencia del ensayo valida Groq con entrada sintética en ese entorno.

## Checkpoint vigente

2026-11-10. Frontera en Codex Desktop (GPT-6, variante y esfuerzo no expuestos), con PowerShell, Windows Speech Synthesis, Git, `gh`, Git Bash, Node 24.21.0 y consulta web. Avance documental, sin cambios en comportamiento, API, permisos de la aplicación, persistencia ni UI. Base de la rama y SHA objetivo `6f423e37be71d8fd9bb48561b3a74bfcb80c2421`, confirmado en [T-048](T-048-groq-multipart-fix.md#checkpoint-vigente). Worktree documental separado del checkout original que usa el stack persistente.

El dueño autorizó hasta cuatro muestras sintéticas y 120 s de captura. Confirmó organización Free, ausencia de gasto nuevo, `Inference APIs ZDR` activo y cuota efectiva suficiente. Groq publica compatibilidad de `whisper-large-v3-turbo` con WebM y español, máximo Free de 25 MB, cuota Free de 20 solicitudes/min, 2.000/día, 7.200 s de audio/h y 28.800 s/día, y elegibilidad ZDR para transcripciones. [Modelo y formatos](https://console.groq.com/docs/speech-to-text) · [Cuotas](https://console.groq.com/docs/rate-limits) · [Retención](https://console.groq.com/docs/your-data)

Preparación local en `.orchestrator/t049-synthetic-fixtures/` del checkout original, ruta ignorada. `node .orchestrator/t049-synthetic-fixtures/prepare-silence.mjs` terminó con exit 0 y verificó WAV PCM mono de 16 bits: breve 14,93 s, técnica 27,74 s, silencio 4,00 s y segunda breve 13,15 s (59,82 s total de las fuentes). `node --check .orchestrator/t049-synthetic-fixtures/observe-transcription.js` terminó con exit 0. La prueba aislada del observador con `node:vm` confirmó registro mínimo para 200, 422 `VOICE_NO_SPEECH` y fallo de red, con bloqueo de un segundo POST. Para el cleanup, retirar solo los cuatro WAV propios y los perfiles separados de esta ronda después de cerrarlos, además de las notas ficticias identificadas en el ensayo.

El dueño aplicó el SHA objetivo y retomó `starter-dev-devnotes-preview-1027` desde el checkout original con `dev.sh down`, `up` y `check` en modo `local`, proxy `nginx`, origen `http://127.0.0.1:5175` y OIDC ficticio. El stack informó `Local API/DB/OIDC check passed`. En Edge con perfil separado, la consulta autenticada de capabilities devolvió HTTP 200, `recordingEnabled: true` y `reason: null`. El observador inició en cero y el dueño reconfirmó cero intentos previos, Groq Free, cuota suficiente, `Inference APIs ZDR` activo y ausencia de gasto nuevo.

`01-breve` favorable, un intento. El dueño confirmó «Grabando» durante unos 16 s, texto editable con sentido en español y el identificador 1279, corrección y copia verificadas, y colección sin cambios antes de guardar. El observador registró una detención, un POST, HTTP 200, código `null`, 1.184 ms desde la detención, `audio/webm;codecs=opus` y cero escrituras de notas en la transcripción. El dueño guardó explícitamente una sola nota de prueba con la marca `[T-049-01-breve]`; la captura mostró confirmación de guardado y revisión 1. Conservarla hasta verificar la independencia de las dos notas y luego retirar solo las del ensayo.

`02-tecnico` favorable, segundo intento. En el perfil separado el observador inició en cero y luego registró una detención, un POST, HTTP 200, código `null`, 941 ms desde la detención, `audio/webm;codecs=opus` y cero escrituras de notas. El dueño confirmó texto con sentido en español y conservación de PostgreSQL, Spring Boot, CSRF y 1279, y «Grabando» durante unos 29 s. Se dejó sin guardar.

`03-silencio` fuera de criterio, tercer intento. En perfil separado el observador inició en cero y registró una detención, un POST, HTTP 200, código `null`, 452 ms desde la detención, `audio/webm;codecs=opus` y cero escrituras de notas. El dueño no habló y observó «Gracias.» en el editor. Se esperaba HTTP 422 `VOICE_NO_SPEECH`, mensaje visible y editor vacío. Una sonda de solo lectura con Node confirmó que `03-silencio.wav` contiene 4,00 s de PCM mono de 16 bits a 44.100 Hz, con todas las muestras en cero. La duración de captura no se midió de forma independiente. El binario de Edge instalado informó `157.0.4341.42`.

Ronda detenida con **3 de 4 intentos consumidos**. `04-segunda-nota` queda sin intentar. El adaptador del SHA ensayado comprueba `no_speech_prob` solo si el texto está en blanco, como anticipó el [hallazgo de revisión](../BACKLOG.md#hallazgos-de-t-039). La prueba no midió las probabilidades de la respuesta de Groq ni inspeccionó el audio WebM enviado, por lo que la causa exacta del resultado sigue abierta. Quedan identificados para el cleanup la nota `[T-049-01-breve]`, los cuatro WAV y los perfiles propios ya abiertos. Las ventanas pueden cerrarse sin perder la nota guardada. T-040 sigue en espera. FULL integrado diferido hasta después de T-044 MERGED.

### Corrección preparada en frontera

- Prueba local en una copia ignorada del backend de `6f423e37be71d8fd9bb48561b3a74bfcb80c2421`, en `.orchestrator/t049-proof/server`. El doble HTTP con loopback quedó impedido por el entorno restringido. Se usó en su lugar un doble del transporte JDK inyectado que devolvió JSON ficticio y ejecutó el adaptador real, sin red ni Groq. Desde esa copia, `mvnw.cmd -o -Daether.syncContext.named.factory=rwlock-local -Dtest=SilenceProbeTest test` dio rojo (exit 1, el adaptador devolvió texto cuando debía lanzar `NoSpeech`). Con el cambio candidato dio verde (exit 0, 2/2): texto no vacío con segmentos 0,60 y 0,90 rechazado, texto con segmentos 0,90 y 0,59 conservado.
- Siguiente sesión de implementación: integrar solo la corrección de silencio según [S-105](../specs/S-105-voice-notes.md#adaptador-y-errores) en el worktree de T-049. Conservar el mapeo a 422 `VOICE_NO_SPEECH` y el resto del adaptador. Usar la copia candidata como referencia, reproducir rojo en la rama antes de cambiar el código, y correr la regresión y la suite de adaptador con `./mvnw -Dtest=GroqTranscriptionClientTest test` desde `server/` en Git Bash, más los checks de [cierre temporal](../TESTING.md#aplazamiento-de-full-hasta-t-044). Incorporar las pruebas a la suite existente con sus fixtures ficticias. La copia ignorada contiene el experimento, no es un resultado publicable. Retirarla tras integrar la corrección.
- Con SHA corregido y pruebas dirigidas verdes, preparar un nuevo ensayo con presupuesto explícito del dueño antes de enviar audio. Registrar sus cuatro resultados sobre ese SHA para que la evidencia sea comparable. Mantener un único PR de T-049, contra `main`, tras resultado favorable, y revisión independiente antes de merge.

### Corrección integrada

2026-11-10. Implementer en Claude Code de escritorio (Claude Fable 5.2, esfuerzo no expuesto), con Git Bash, JDK 21.0.9, Maven Wrapper, Git y `gh`. Cambia el comportamiento del adaptador de voz: una respuesta con texto y todos los segmentos en el umbral de silencio o por encima pasa de HTTP 200 a 422 `VOICE_NO_SPEECH`. Sin cambios en el contrato de la API, permisos, persistencia ni UI. Sin red hacia Groq.

- Base comprobada: `gh pr view 47` devolvió `MERGED`, `mergedAt` 2026-11-10T19:49:49Z y `mergeCommit` `6f423e37be71d8fd9bb48561b3a74bfcb80c2421`, ancestro de la rama.
- SHA corregido: `8d787c167571e65ce896b8cfe217d92b39f650c2`. Toca solo `GroqTranscriptionClient` y `GroqTranscriptionClientTest`.
- Rojo en la rama antes del cambio, desde `server/` en Git Bash: `./mvnw -q -Dtest=GroqTranscriptionClientTest test`, exit 1, 19 pruebas y 1 fallo en `nonBlankTextWithAllSegmentsAtOrAboveThresholdReturnsNoSpeech` (el adaptador devolvió «Gracias.» con segmentos 0,60 y 0,90).
- Verde con el cambio: `./mvnw -q spotless:apply` exit 0 y `./mvnw -Dtest='GroqTranscriptionClientTest,VoiceTranscriptionServiceTest' test` exit 0, 23/23 (adaptador 19, servicio 4). Negativos nuevos: texto conservado con un segmento en 0,59 y con un segmento sin `no_speech_prob`. Las pruebas usan el servidor HTTP ficticio en loopback de la suite existente.
- Cierre temporal: `node scripts/docs-check.mjs` OK (102 Markdown, 50 tareas), `git diff --check` exit 0 y `bash scripts/verify.sh --policy origin/main` exit 0 con `policy=FULL`, `profile=APPLICATION`, 2 rutas técnicas. FULL registrado como diferido. Pendiente: retirar la copia ignorada `.orchestrator/t049-proof`, que sigue en disco porque el borrado no se autorizó en esta sesión.
- No ejecutado: `VoiceTranscriptionApiIT` y `clean verify` (Failsafe/JaCoCo). El mapeo de `NoSpeech` a 422 no se modificó. FULL integrado diferido hasta después de T-044 MERGED.
- La regla de S-105 «texto no vacío sin segmentos válidos → 502» sigue sin aplicarse y quedó en [BACKLOG](../BACKLOG.md#hallazgos-de-t-039), fuera de esta corrección.

Paso de reensayo para el dueño: dar presupuesto explícito para una ronda nueva de cuatro muestras, aplicar `8d787c167571e65ce896b8cfe217d92b39f650c2` en el stack `starter-dev-devnotes-preview-1027` desde su checkout original conservando el volumen, y repetir la matriz completa en el orden de VOICE-RELEASE para que la evidencia sea comparable. El silencio debe dar un POST, HTTP 422 `VOICE_NO_SPEECH`, mensaje visible y editor vacío. Si Groq devuelve texto con algún segmento por debajo de 0,6, el resultado seguirá fuera de criterio y vuelve a frontera con las probabilidades medidas.

### Segunda ronda sobre `8d787c1`

2026-11-10. Implementer en Claude Code de escritorio (Claude Fable 5.2, esfuerzo no expuesto), con PowerShell, Git Bash, Node 24.21.0, Docker, Git y `gh`. Sin cambios de código, API, permisos, persistencia ni UI. **Ronda detenida en `03-silencio`, fuera de criterio, con 3 de 4 intentos consumidos.** `04-segunda-nota` queda sin intentar.

- Base: `origin/codex/t-049-voice-retest` en `c94abea` contiene `8d787c167571e65ce896b8cfe217d92b39f650c2`; `gh pr view 47` devolvió `MERGED` con `mergeCommit` `6f423e3`, ancestro de ese SHA. Entre `8d787c1` y `c94abea` solo cambian tres Markdown.
- Autorización: el dueño dio presupuesto para la ronda de cuatro muestras y delegó la ejecución completa en esta sesión. Plan Free, ausencia de gasto nuevo y `Inference APIs ZDR` constan por sus declaraciones del mismo día en la primera ronda; no las repitió en esta sesión. La entrada fue solo audio sintético.
- Aplicación del SHA: a pedido del dueño, esta sesión movió el checkout original a `8d787c1` (árbol limpio, HEAD separado). El dueño ejecutó en su Git Bash `dev.sh down`, `up` y `check` de `starter-dev-devnotes-preview-1027` (modo `local`, proxy `nginx`) y cargó clave e interruptor de voz en privado; la sesión no vio valores. Primer intento sin variables: capabilities `recordingEnabled: false`, `reason: disabled`, sin grabar. Segundo intento con variables: `Local API/DB/OIDC check passed`, imagen del server creada 21:02:34Z y contenedor iniciado 21:06:20Z, posteriores al commit (20:52:47Z). Volumen conservado: la colección mantuvo las cuatro notas previas, incluida `[T-049-01-breve]`.
- Método: Edge 157.0.4341.42 con un perfil separado nuevo por muestra y el WAV como micrófono sintético (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`, `--use-file-for-fake-audio-capture=<wav>%noloop`), conducido por DevTools Protocol en loopback desde `t049-cdp.mjs` y `r2-launch.ps1` de `.orchestrator/t049-synthetic-fixtures/` (ruta ignorada). Clics reales sobre «Grabar» y «Detener y transcribir», el mismo `observe-transcription.js` y lectura de estados visibles, sin cuerpos, headers ni credenciales. Antes de la ronda: ensayo en seco de 3 s con «Cancelar grabación» (cero POST) y sonda local de niveles de `01-breve` sin envío (señal durante ~12,5 s y luego cero).
- Antes de cada muestra: capabilities autenticado HTTP 200, `recordingEnabled: true`, `reason: null`, y observador en cero.

| Muestra | Captura | Observador | Resultado |
|---|---|---|---|
| `01-breve` | 15,0 s, `audio/webm;codecs=opus` | 1 detención, 1 POST, HTTP 200, código `null`, 844 ms | Favorable. Texto en español con sentido y 1279; única diferencia con la fuente, una coma en lugar de punto y coma. Colección en 4 notas tras transcribir. Corrección y copia verificadas (portapapeles idéntico al editor). Guardado explícito: «Nota guardada correctamente», revisión 1, colección en 5. Nota `[T-049-R2-01-breve]` |
| `02-tecnico` | 28,0 s, `audio/webm;codecs=opus` | 1 detención, 1 POST, HTTP 200, código `null`, 682 ms, 0 escrituras | Favorable. Conserva PostgreSQL, Spring Boot, CSRF y 1279; el deletreo «ce ese erre efe» salió como «CSRF» repetido. Sin guardar |
| `03-silencio` | 4,0 s, `audio/webm;codecs=opus` | 1 detención, 1 POST, HTTP 200, código `null`, 421 ms, 0 escrituras | **Fuera de criterio.** Editor con «Gracias.», sin mensaje de falta de voz. Se esperaba HTTP 422 `VOICE_NO_SPEECH` y editor vacío |
| `04-segunda-nota` | — | — | Sin intentar |

Captura total ~47 s. La confirmación del dueño sobre la utilidad de los textos de `01` y `02` queda pendiente. Con la corrección activa, el resultado de silencio indica que la respuesta de Groq trae texto y al menos un segmento con `no_speech_prob` por debajo de 0,6, sin probabilidad válida, o ningún segmento; son los casos que `allSegmentsIndicateSilence` conserva como voz. Es una inferencia desde el código: las probabilidades reales siguen sin medirse, los logs del server no registran la respuesta y no se inspeccionó la clase dentro del contenedor.

Vuelve a frontera/dueño según el paso de reensayo. La medición siguiente resolvió la primera incógnita. Decisión pendiente: qué señal distinta de `no_speech_prob` usa S-105 para el silencio. No repetir la matriz sin esa decisión y un presupuesto nuevo.

#### Medición de la respuesta real

El dueño autorizó después una inferencia adicional de silencio para medir la respuesta. Se grabaron 4 s de `03-silencio.wav` con el `MediaRecorder` de Edge en un perfil separado, fuera de la aplicación (`audio/webm;codecs=opus`, 1.289 bytes). Ese WebM se envió una sola vez a Groq con `curl` desde dentro del contenedor del server, con los mismos campos del adaptador (`whisper-large-v3-turbo`, `language=es`, `temperature=0`, `verbose_json`). La clave se usó por referencia a la variable del contenedor y no se leyó ni imprimió. Resultado: HTTP 200 en ~0,45 s.

| Campo | Valor medido |
|---|---|
| `text` | « Gracias.» |
| `language` / `duration` | `Spanish` / 4,56 s |
| `segments` | 1 segmento, de 0 a 1 s |
| `no_speech_prob` | **0** |
| `avg_logprob` | −0,297 |
| `compression_ratio` | 0,529 |

Conclusión: para silencio digital Groq devuelve texto alucinado con `no_speech_prob` 0. Ninguna regla de S-105 basada en ese campo puede rechazarlo, cualquiera sea el umbral, y `8d787c1` actúa según su contrato. `avg_logprob` tampoco separa este caso de voz real con un umbral habitual. La corrección exige otra señal, que es decisión de frontera/dueño: por ejemplo, detectar ausencia de señal en el cliente antes de enviar, o filtrar en el backend por una regla distinta. Es una sola medición con silencio digital exacto; no cubre ruido ambiente ni un micrófono real. Con esta inferencia la sesión suma cuatro envíos a Groq.

#### Decisión del dueño y cierre de la matriz

Ante la medición, el dueño eligió «Filtrar en el backend» como señal futura y después quitó prioridad al silencio: «no me preocupa demasiado ver que el silencio funcione de cierta u otra manera, porque rara vez voy a enviar silencio. Yo voy a hablar lo que necesito». Pidió seguir con el plan. El silencio queda como **limitación conocida aceptada por el dueño**, con el filtro en [BACKLOG](../BACKLOG.md#hallazgos-de-t-049) sin tarea asignada. No bloquea T-040.

Con esa decisión se ejecutó `04-segunda-nota`, dentro del presupuesto original de cuatro muestras y sobre el mismo stack y SHA. Capabilities HTTP 200, `recordingEnabled: true`, `reason: null`; observador en cero; colección en 5 notas.

| Muestra | Captura | Observador | Resultado |
|---|---|---|---|
| `04-segunda-nota` | 14,0 s, `audio/webm;codecs=opus` | 1 detención, 1 POST, HTTP 200, código `null`, 1.018 ms | Favorable. Texto en español con sentido y 1280, idéntico a la fuente. Colección en 5 tras transcribir. Corrección y copia verificadas. Guardado explícito: «Nota guardada correctamente», revisión 1, colección en 6. Al reabrir, `[T-049-R2-01-breve]` y `[T-049-R2-04-segunda]` conservaron cada una su texto y revisión 1. Borradas solo esas dos por la UI con confirmación: colección en 4, con `[T-049-01-breve]` y las demás notas previas intactas |

Resultado de la tarea: tres muestras habladas favorables (un POST y HTTP 200 cada una, 682–1.018 ms desde la detención) y silencio fuera de criterio, aceptado por el dueño como limitación conocida. Captura total de la ronda ~61 s y cinco envíos a Groq en la sesión, contando la medición. Sobre los textos, el dueño respondió «Bien» al informe que los incluía; no hizo una revisión palabra por palabra. El criterio estricto de «cuatro muestras favorables» no se cumple: VOICE-RELEASE registra «Voz real verificada para dictado en español» con la limitación de silencio explícita.

Cleanup pendiente, sin borrar en esta sesión: `/tmp/t049-silence.webm` y `/tmp/t049-resp.json` dentro del contenedor del server (desaparecen al recrearlo); `r2-silence.webm` y `r2-silence-response.json` en la carpeta de fixtures; nota `[T-049-01-breve]` de la primera ronda en el volumen del dueño; cuatro WAV, perfiles `edge-*` y `edge-r2-*` (cerrados), `t049-cdp.mjs`, `r2-launch.ps1` y `r2-*.json` en `.orchestrator/t049-synthetic-fixtures/`; `.orchestrator/t049-apply.ps1` (no usado) y `.orchestrator/t049-proof`. El checkout original queda en `8d787c1` con HEAD separado y el stack del dueño activo con voz habilitada.

### Revisión independiente

2026-11-10. Reviewer en Claude Code de escritorio (Claude Fable 5.2, esfuerzo no expuesto), sesión distinta de la implementación, con Git Bash, JDK 21, Maven Wrapper, Node, Git y `gh`. Sin cambios de código, API, permisos, datos ni UI. Revisado el HEAD publicado `64b2afbe88aba5f2ab86711b7701980e14dfba9f` contra la base `6f423e37be71d8fd9bb48561b3a74bfcb80c2421`, con árbol limpio.

- Desde `server/` en Git Bash: `./mvnw -Dtest='GroqTranscriptionClientTest,VoiceTranscriptionServiceTest' test` exit 0, 23/23 (adaptador 19, servicio 4); `./mvnw -q spotless:check` exit 0. Desde la raíz: `node scripts/docs-check.mjs` OK, `git diff --check origin/main...HEAD` exit 0, `bash scripts/verify.sh --policy origin/main` con `policy=FULL`, `profile=APPLICATION`. `verify-required` SUCCESS sobre `64b2afb`. No ejecutado: `VoiceTranscriptionApiIT`, `clean verify` ni FULL, diferido según TESTING.
- Favorable sin bloqueantes. El código cumple la regla de S-105 sobre segmentos. El criterio de cuatro muestras favorables no se cumple y el cierre se apoya en la decisión del dueño, registrada con su cita. Observaciones no bloqueantes, con archivo y línea, en el veredicto del [PR48](https://github.com/MatiasNicolasAcevedo/devnotes/pull/48): alinear la etiqueta «Voz real verificada» y una fila obsoleta de VOICE-RELEASE, y precisar en S-107 qué muestra STATUS mientras T-040 es la tarea portadora.
- `mergeable` no habilita el merge por sí solo: lo decide el dueño según AUTONOMY sobre el SHA del veredicto.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-10 · sin SHA | Con `8d787c1` activo, `03-silencio` volvió a dar HTTP 200 con «Gracias.». Medido: Groq devuelve un segmento con `no_speech_prob` 0, fuera del alcance de cualquier umbral sobre ese campo. | Sin cambio de código. El dueño aceptó la limitación y dejó el filtro de backend en BACKLOG. | «Medición de la respuesta real» |
| 2026-11-10 · `8d787c1` | `03-silencio` devolvió HTTP 200 con «Gracias.». El adaptador consultaba `no_speech_prob` solo con texto en blanco, por lo que aceptaba texto aunque todos los segmentos indicaran silencio. La respuesta real de Groq no se midió. | `parseResponse` lanza `NoSpeech` con texto en blanco o con todos los segmentos en `no_speech_prob` ≥ 0,6 (S-105). Segmentos ausentes, vacíos o sin probabilidad válida no cuentan como silencio. | Rojo y verde de `GroqTranscriptionClientTest` en «Corrección integrada» |

## Cierre y siguiente tarea

Cierre con la decisión del dueño del 2026-11-10: VOICE-RELEASE registra el resultado sobre `8d787c1` con la limitación de silencio, y el PR único de T-049 va a revisión independiente. Tras T-049 MERGED, la siguiente sesión concilia `done` y toma [T-040](T-040-daily-timestamps.md) en la rama compartida de S-107.
