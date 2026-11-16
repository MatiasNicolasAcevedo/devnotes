---
id: T-071
status: in_review
priority: P1
size: S
milestone: M6
spec: S-112
depends_on: [T-070]
branch: codex/t-071-ocr-first-real-test
role: implementer
executor: frontier
pr: 74
---

# T-071 · Primera prueba real de OCR.space en local

## Objetivo

Medir la extracción contra OCR.space Free en un SHA de main congelado. Entregar resultados de precisión, latencia y recorrido en capturas ficticias. Dependencia: T-070 MERGED y conciliada.

## Alcance e intervención del dueño

| Momento | Responsable y configuración |
|---|---|
| Primera prueba real, después de T-070 | Frontera confirma SHA, prepara stack aislado con datos ficticios y comunica que el paso siguiente depende del dueño. El dueño autoriza el envío de esas muestras y confirma cuenta Free/cuota disponible. Crea la clave en OCR.space y carga `OCR_SPACE_API_KEY` como secreto en el entorno privado del proceso que inicia Compose para el stack de ensayo, heredado solo por el servicio `server`. También habilita `DEVNOTES_OCR_ENABLED=true` y `DEVNOTES_OCR_ALLOWED_SPACES` con el espacio aprobado para el ensayo. Puede confirmar «cargada», sin enviarla por chat. |
| Configuración posterior de Render | Tras veredicto local y solo con autorización expresa del dueño sobre **SHA exacto y ventana**. El dueño carga `OCR_SPACE_API_KEY` y configura los flags acordados en **Render Dashboard → devnotes-pilot → Environment**, en el servicio que ejecuta el backend. Usar **Save only** para guardar sin disparar un deploy, luego aplicar en un deploy explícito por SHA dentro de la ventana autorizada. La carga en local, las pruebas y el veredicto de precisión son hitos separados de esta operación. |

Configurar el secreto local en el entorno privado de un Git Bash iniciado por el dueño o desde su gestor de secretos, fuera del chat, de `.env.example`, del archivo de puertos y de cualquier variable `VITE_*`. El agente usa solo una confirmación declarativa y el estado autenticado de capacidades. El flag y el estado disponible demuestran configuración. La primera extracción demuestra acceso al proveedor. El dueño puede iniciar el stack ya preparado desde su sesión privada y Frontera verificar por el navegador sin inspeccionar su proceso o credenciales. [Configuración de Render, consultada el 2026-11-14](https://render.com/docs/configure-environment-variables).

El dueño puede solicitar la clave Free por correo desde el formulario oficial de OCR.space. La carga se necesita recién en T-071, cuando estén confirmados el SHA, el entorno local y las muestras ficticias del ensayo. [Alta de clave Free](https://ocr.space/ocrapi/freekey) · [Confirmación de entrega por correo](https://ocr.space/ocrapi/confirmation).

## Leer antes

[S-112](../specs/S-112-screenshot-ocr.md), [SETUP](../SETUP.md#requisitos-del-host), [T-070](T-070-ocr-journey.md), [DEPLOYMENT](../DEPLOYMENT.md#primer-deploy-y-aceptación-del-dueño).

## Pasos y pruebas

1. Confirmar el cierre remoto de T-070. Preparar checkout aislado sobre el squash confirmado, credenciales OIDC ficticias. Revisar límites/privacidad de S-112 y capacidad Free declarada. Registrar SHA, autorización y cuota disponible cuando el dueño las confirme. Si falta permiso o clave, pasar a blocked sin PR, actualizar la tarea y STATUS e indicar en el chat la variable y el lugar de carga.
2. Desde raíz, Git Bash privado del dueño con variables cargadas, usar un namespace propio vacío. Proponer `starter-dev-ocr-real-071` con archivo de parámetros local ignorado `.orchestrator/ocr-t071.local` que contiene solo `CLIENT_PORT=15175`, `CLIENT_DEV_PORT=15176`, `LOCAL_OIDC_PORT=18090` y `STARTER_API_DOCS_ENABLED=false`. Comprobar puertos/labels antes de arrancar. Si están ocupados, registrar reemplazos libres antes de ejecutar. El modo local conserva OIDC ficticio y el endpoint OCR real.

```bash
bash scripts/dev.sh up --mode local --proxy nginx --project starter-dev-ocr-real-071 --env-file .orchestrator/ocr-t071.local
bash scripts/dev.sh check --mode local --proxy nginx --project starter-dev-ocr-real-071 --env-file .orchestrator/ocr-t071.local
```

3. Usar **Extraer texto** una vez por muestra. Máximo cuatro solicitudes en total con la autorización inicial. La cuarta queda disponible para repetir una muestra de letra pequeña con `scale=true` en una revalidación local controlada por Frontera si la variante está implementada y fue autorizada para el ensayo. Si el adaptador publicado fija `scale=false`, registrar la variante como candidata sin cambiar de SHA durante la prueba. Detener ante cuota, clave inválida o timeout. No reproducir contra el proveedor agotamiento, errores artificiales o tamaños inválidos.
4. Registrar estado HTTP/resultado, milisegundos por muestra, tasa de caracteres errados (distancia de edición / cantidad esperada), tokens exactos preservados y edición necesaria. Registrar veredicto del dueño. Hacer cleanup del stack y solamente de sus volúmenes ficticios con labels exactos y rutas propias, tras comprobar que pertenece al ensayo. Confirmar ausencia de recursos. Detener el stack con el comando de abajo, que conserva el volumen. Eliminar solo el volumen ficticio de este ensayo después de comprobar su nombre, el label exacto de proyecto y su pertenencia al checkout. Registrar los recursos propios identificados antes del arranque y tras detenerlo. Conservar solo evidencia saneada.

```bash
bash scripts/dev.sh down --mode local --proxy nginx --project starter-dev-ocr-real-071 --env-file .orchestrator/ocr-t071.local
node scripts/docs-check.mjs
git diff --check
```

| Muestra ficticia | Esperado antes de editar |
|---|---|
| Navegador PNG, fondo claro, texto español | `T-055`, «Revisar conexión» y `https://devnotes.example.test/tickets/T-055` |
| Terminal PNG oscuro, letra chica | `ERR_CONNECTION_RESET` y `/src/api/foo-bar.ts` |
| IDE JPG oscuro, mezcla español/inglés | `T-055`, `handleRetry()`, `/src/api/foo-bar.ts` y «Revisar el timeout» |

Criterio propuesto para la muestra de viabilidad: las tres capturas producen texto utilizable y revisable, conservan exactamente ID/error/ruta/URL/identificador entre las muestras y permiten editar y copiar por UI. Registrar divergencias de diacríticos/puntuación/saltos con la tasa indicada. Frente a cualquier pérdida crítica o texto ausente, guardar el resultado observado y volver a Frontera para ajustar o aceptar explícitamente una limitación. La medición describe el corpus y el SHA del ensayo.

Como validación de UX separada, revisar Android físico con selector, perspectiva estrecha, IME, giro y zoom nativo. Usar el recorrido con doble de T-070 como control en Chromium. Agendar la prueba física por separado si el dispositivo no puede alcanzar el servidor loopback del ensayo. Para demostrar precisión, conservar escritorio y móvil según posibilidad y registrar la plataforma probada. El resultado de esta herramienta y SP-06 de I5 se documentan por separado.

## Checkpoint vigente

Frontera implementer en Codex, con PowerShell, Git/gh, Docker Compose, Git Bash y Node 24.21.0. Variante de modelo y esfuerzo sin dato expuesto. La entrega mide el flujo existente y registra evidencia documental. El ensayo usa una base PostgreSQL ficticia y envía únicamente las muestras autorizadas a OCR.space.

[T-070 conciliada](T-070-ocr-journey.md#conciliación). Checkout `.orchestrator/t071-ocr-real`, rama `codex/t-071-ocr-first-real-test`, HEAD/base `ec216bb5714ed4bd73403fb894cb2ee38ac1826b`. Preflight de Docker Desktop 28.5.1/Compose v2.40.2-desktop.1: 0 contenedores, 0 redes, 0 volúmenes con el label exacto `com.docker.compose.project=starter-dev-ocr-real-071`; puertos 15175, 15176 y 18090 libres. Compose local configura Spring `test`, OIDC ficticio y PostgreSQL 18.6. El adaptador selecciona `https://api.ocr.space/parse/image` en ese perfil. La ruta al doble es exclusiva de `e2e`.

`dev.sh up`, `check` y `down` salieron 0 con OCR desactivado. La sonda verificó API, DB y OIDC. Dentro del stack se confirmó Spring `test`, PostgreSQL 18.6 e imagen del OIDC ficticio `ghcr.io/navikt/mock-oauth2-server:3.0.3`. El `down` retiró contenedores y red. Quedó el volumen ficticio `starter-dev-ocr-real-071_db-data` con label de origen del checkout para el arranque privado. Log saneado: `.orchestrator/ocr-t071-preflight.log` dentro del checkout.

Corpus ficticio generado y cotejado visualmente en `.orchestrator/ocr-t071-samples/`. Las líneas siguen el orden de la tabla. Adaptador con motor 2, idioma automático y el parámetro `scale` omitido, que usa `false` por defecto. `scale=true` queda como candidata fuera de este SHA. El proveedor publica 500 solicitudes diarias por IP, 25.000 mensuales y 1 MB por archivo en Free. Declara que elimina imágenes tras procesarlas y conserva la IP un mes. [Documentación de OCR.space](https://ocr.space/ocrapi) · [Privacidad](https://ocr.space/privacypolicy).

| Archivo | Dimensiones y tamaño | SHA-256 |
|---|---|---|
| `navegador.png` | 840 × 256, 6.908 bytes | `5d84b5e1f2cde4c2928573bc5856e78ec8b4764e7229df42c7105612b2c41eee` |
| `terminal.png` | 620 × 132, 2.136 bytes, Consolas 13 px | `411edc331b36317ffbeb1d19c73a4ec1c25fd174f87da29b3c79f9aba0de15be` |
| `ide.jpg` | 770 × 205, 10.918 bytes | `3c013ec2531f72ca2d9f2cbe405779ec4236d28fa5238fe39d07531f28bca19f` |

Retoma del 2026-11-16. El dueño autorizó los tres archivos y confirmó cuota Free y un único espacio aprobado. Los tres SHA-256 locales coinciden con la tabla. GitHub devolvió [PR73](https://github.com/MatiasNicolasAcevedo/devnotes/pull/73) `MERGED` contra `main`, con squash `ec216bb5714ed4bd73403fb894cb2ee38ac1826b`, igual a `HEAD` y `origin/main` locales. El filtro por label exacto mostró 0 contenedores, 0 redes y solo el volumen ficticio `starter-dev-ocr-real-071_db-data`. `docker volume inspect` con formato limitado verificó los labels `io.starter.local.owner=v1`, `io.starter.local.source` del checkout, proyecto exacto y volumen `db-data`. Las sondas de `GET http://127.0.0.1:15175/login` devolvieron `ECONNREFUSED` desde el host. Pendiente el arranque desde el Git Bash privado del dueño y confirmar si el espacio habilitado es `work` o `personal`. Hasta este checkpoint hubo 0 solicitudes a OCR.space.

Recomprobación de esta sesión del 2026-11-16: `gh pr view 73 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName` salió 0: `MERGED`, base `main`, HEAD publicado `86f13b2d04a3f0cf65b244c0629072809a66a7f3`, squash `ec216bb5714ed4bd73403fb894cb2ee38ac1826b`, `mergedAt=2026-11-16T20:28:24Z`. `gh api repos/MatiasNicolasAcevedo/devnotes/git/ref/heads/main` confirmó ese squash como punta remota y `gh pr checks 73` informó `verify-required` pass. Coinciden HEAD y `origin/main` locales. La consulta Docker por label exacto volvió a mostrar 0 contenedores, 0 redes y solo el volumen ficticio con los labels de propietario/origen esperados. Se preservaron los tres cambios documentales previos. El dueño consultó cómo arrancar y qué claves cargar: se indicó el checkout y proyecto aislados, solo `OCR_SPACE_API_KEY` mediante entrada oculta en su Git Bash privado, flags y un único espacio; Groq no interviene en este ensayo. Sigue pendiente la confirmación declarativa de arranque y espacio, con 0 solicitudes al proveedor.

Con el stack listo, ejecutar `node .orchestrator/ocr-t071-run.mjs capability <espacio>` y luego `node .orchestrator/ocr-t071-run.mjs extract <espacio>` si la capacidad autenticada coincide con el espacio autorizado. El controlador local ignorado pasó `node --check`; la extracción conserva el resultado local en `.orchestrator/ocr-t071-results.json` y capturas saneadas del diálogo antes de editar y tras copiar. HTTP y latencia corresponden al POST de DevNotes observado en el navegador. La tasa usa distancia de Levenshtein por caracteres Unicode, saltos CRLF/CR normalizados a LF, NFC y exclusión de un salto final; conserva también texto original y esperado. Recursos propios para cleanup: proyecto exacto `starter-dev-ocr-real-071`, volumen `starter-dev-ocr-real-071_db-data`, fuente `/c/D/matias/proyectos-ia/devnotes/.orchestrator/t071-ocr-real`; `dev.sh down` conserva el volumen y su eliminación exige recotejar labels antes. `node scripts/docs-check.mjs` y `git diff --check` pasaron en este checkpoint. Sin cambios en fuentes técnicas, STARTER de T-068 conservado y gate acumulado de I5 diferido.

Arranque informado por el dueño. `docker ps -a`, `docker network ls` y `docker volume ls` con el label exacto del ensayo mostraron cuatro contenedores activos (`client`, `server` y `db` sanos; `oidc` activo), una red y el volumen ficticio esperado. `GET http://127.0.0.1:15175/login` devolvió HTTP 200. Se entregó al dueño el comando de [Edge con perfil separado](../SETUP.md#prueba-manual-en-windows) adaptado al puerto 15175 para usar el login ficticio. HTTP 200 solo acredita la pantalla de login. Falta la confirmación del espacio habilitado antes de la capacidad autenticada y el POST; 0 solicitudes a OCR.space.

El dueño aclaró que arrancó sin configurar `DEVNOTES_OCR_ALLOWED_SPACES`. Se comprobó que `dev.sh up` reutiliza los contenedores activos. Para aplicar los flags y la clave, el dueño hará `down`, `up` y `check` del proyecto aislado desde su Git Bash privado, con los mismos parámetros. `down` preserva el volumen ficticio. Falta confirmar el reinicio y el único espacio habilitado. El primer POST sigue pendiente.

El dueño confirmó el reinicio privado con `work`. El inventario del label exacto encontró los cuatro servicios activos, la red y el volumen ficticio previstos. HEAD y `origin/main` siguen en `ec216bb5714ed4bd73403fb894cb2ee38ac1826b`. `node .orchestrator/ocr-t071-run.mjs capability work` salió 0 mediante OIDC ficticio. Ambos GET devolvieron HTTP 200, `available=true` para Trabajo y `available=false` para Personal, con 0 POST. Siguiente paso: `node .orchestrator/ocr-t071-run.mjs extract work` para las tres muestras, con evidencia saneada en `.orchestrator/ocr-t071-results.json` y capturas locales del diálogo. Al terminar se verificará el retiro del stack y del volumen ficticio por los labels del checkpoint.

`node .orchestrator/ocr-t071-run.mjs extract work` salió 1 en verificación de edición/copia, tras un solo POST y 0 escrituras a notas. Se preservó la primera medición en el JSON local. El controlador local quedó preparado para `node .orchestrator/ocr-t071-run.mjs resume work`: valida SHA, espacio y muestra ya enviada, omite esa muestra, registra cada fase de edición y copia, y tolera solo la representación CRLF de saltos del portapapeles de Windows. El SHA técnico y los recursos para cleanup siguen iguales.

El recorrido real y el cleanup terminaron. El dueño aceptó el cierre con las limitaciones medidas y pidió dejar el ajuste de precisión pendiente. La entrega documental pasa a revisión independiente.

## Resultado real del 2026-11-16

SHA de ejecución `ec216bb5714ed4bd73403fb894cb2ee38ac1826b`, Chrome 157.0.8103.52 sobre Windows, escritorio 1280 × 800, Trabajo y OIDC ficticio. `resume work` salió 0 después de las dos muestras pendientes. Total: **3 POST a DevNotes con OCR.space Free**, uno por archivo. Las tres respuestas tuvieron `Cache-Control: no-store`. Se verificaron la vista previa y el aviso de envío completo en cada caso. La latencia corresponde al request completo en el navegador hasta el final de la respuesta de DevNotes.

| Archivo | HTTP | Latencia | Error de caracteres | Tokens exactos antes de editar | Divergencias y edición necesaria | Edición y copia en UI |
|---|---|---:|---:|---|---|---|
| `navegador.png` | 200 | 1.499 ms | 2/66 (3,03 %) | URL completa `https://devnotes.example.test/tickets/T-055` | Corregir `T-O55` a `T-055` y `conexion` a `conexión`. | Resultado cotejado con el campo editable. La comprobación de edición y copia quedó inconclusa al detenerse el controlador. |
| `terminal.png` | 200 | 1.178 ms | 2/40 (5,00 %) | `/src/api/foo-bar.ts` | Unir `ERR_` y `_CONNECTION_RESET` y quitar el guion bajo duplicado para recuperar `ERR_CONNECTION_RESET`. | Corrección, texto copiado y lectura del portapapeles verificados. |
| `ide.jpg` | 200 | 604 ms | 0/58 (0,00 %) | `T-055`, `handleRetry()`, `/src/api/foo-bar.ts` | Ninguna corrección de OCR. Se añadió una línea ficticia para demostrar la edición. | Edición, texto copiado y lectura del portapapeles verificados. |

El total fue de 4 ediciones sobre 164 caracteres esperados (2,44 %). Dos de las tres muestras perdieron un token crítico exacto. El resultado incumple el criterio propuesto de conservación de tokens. El recorrido de terminal e IDE comprobó que el botón copia el texto editado, devuelve el foco a Herramientas al cerrar y conserva la nota sin escrituras. Android físico queda como validación separada. `scale=true` sigue como candidata y no se envió una cuarta solicitud.

Bitácora: el primer proceso registró el punto de fallo como `edicion-y-copia-navegador.png` y finalizó después de guardar HTTP, latencia, resultado y captura. La fase combinaba acciones y aserciones, por lo que no permite identificar el paso exacto que falló. Para las muestras restantes se separaron etapas y se normalizó CRLF del portapapeles a LF antes de la comparación exacta. El portapapeles devolvió CRLF en las dos y la verificación pasó. Ese resultado explica el ajuste del controlador local, sin atribuirle una causa comprobada al fallo inicial. Las tres muestras se enviaron una sola vez y no se modificaron fuentes de la app.

Evidencia saneada local, fuera del PR: `.orchestrator/ocr-t071-results.json` y cinco capturas `ocr-t071-*-raw.png` / `ocr-t071-*-copied.png` dentro del checkout. Se retuvo solo contenido del corpus ficticio y el diálogo.

**Cleanup.** `bash scripts/dev.sh down --mode local --proxy nginx --project starter-dev-ocr-real-071 --env-file .orchestrator/ocr-t071.local` salió 0. Se cotejaron nombre, proyecto, volumen, `owner=v1`, origen del checkout, modo, proxy, origen HTTP y puerto OIDC del volumen antes y después de `down`. Quedaron 0 contenedores y 0 redes por label, y únicamente `starter-dev-ocr-real-071_db-data`. `docker volume rm starter-dev-ocr-real-071_db-data` salió 0 con esa huella comprobada. Inventario final por `com.docker.compose.project=starter-dev-ocr-real-071`: **0 contenedores, 0 redes y 0 volúmenes**.

## Cierre del tramo OCR

**Veredicto del dueño, 2026-11-16.** Acepta cerrar T-071 con la evidencia obtenida y registrar las pérdidas de precisión y la comprobación de copia inconclusa en el navegador. La evaluación de mejoras queda [pendiente en BACKLOG](../BACKLOG.md#pendientes-tras-t-071). La aceptación corresponde al ensayo local y permite revisar el PR documental. Conciliar T-071 al confirmar `MERGED` en GitHub.

Entrega en [PR74](https://github.com/MatiasNicolasAcevedo/devnotes/pull/74), base `main` en `ec216bb5714ed4bd73403fb894cb2ee38ac1826b`. `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` verifican el gate `DOCS_ONLY / DOCUMENTATION`. El cambio conserva las fuentes del squash del ensayo, el STARTER de T-068 y el gate acumulado de I5 diferido. [T-072](T-072-writing-provider-evaluation.md) queda en pausa por el dueño. La [activación de OCR en Render](../DEPLOYMENT.md#preparación-de-ocr-en-render) espera SHA y ventana autorizados. El squash documental debe incluir `[skip render]` en su mensaje para que el auto-deploy de `main` no lo publique.
