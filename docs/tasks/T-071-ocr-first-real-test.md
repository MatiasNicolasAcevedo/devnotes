---
id: T-071
status: draft
priority: P1
size: S
milestone: M6
spec: S-112
depends_on: [T-070]
branch: codex/t-071-ocr-first-real-test
role: implementer
executor: frontier
pr: null
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

Draft por T-070. Primera prueba local y Render tienen configuraciones y permisos separados. STATUS debe señalar al dueño cuando el siguiente paso dependa de su carga privada. La prueba real, el acceso al panel y un despliegue siguen pendientes.

## Cierre y siguiente tarea

Evidencia técnica y veredicto de precisión en esta tarea. Si el resultado cumple o el dueño acepta la limitación, llevar la evidencia documental a revisión y conciliar el MERGED antes de retomar [T-072](T-072-writing-provider-evaluation.md). Render espera SHA y ventana expresamente autorizados.
