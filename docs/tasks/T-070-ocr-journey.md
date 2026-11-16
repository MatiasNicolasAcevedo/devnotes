---
id: T-070
status: in_review
priority: P1
size: S
milestone: M6
spec: S-112
depends_on: [T-069]
branch: codex/t-070-ocr-journey
role: implementer
executor: frontier
pr: 73
---

# T-070 · Recorrido OCR real en navegador con doble externo

## Objetivo

Acreditar el flujo en Chromium con API de DevNotes real, PostgreSQL 18/OIDC ficticio y un doble de OCR.space dentro de la red privada del stack. Verificar la cabida de la herramienta y la retoma del editor en el escritorio al 25 % y móvil.

## Alcance y decisiones resueltas

Reusar el harness y el servicio privado ya iniciado para el proveedor ficticio de Voz. Agregar un path OCR separado al doble, con respuesta determinista basada en una fixture PNG/JPG y respuesta controlada de cuota. Mantener las rutas y pruebas de voz. El overlay e2e fuerza una clave ficticia, flag y espacios de test. Conectar mediante un adaptador o configuración fija limitada al perfil `e2e`, sin URL arbitraria en perfiles ordinarios, con bloqueo explícito de tráfico real hacia el proveedor en E2E. El runner habla con la API propia a través del proxy habitual.

## Leer antes

[S-112](../specs/S-112-screenshot-ocr.md), [harness E2E](../../scripts/e2e.sh), [overlay E2E](../../docker-compose.e2e.yml), [doble de voz](../../e2e/fixtures/voice-provider.mjs) y [T-065](T-065-spaces-journey.md#revisión-independiente-r1).

## Archivos y pasos

1. Conciliar MERGED de T-069. Añadir endpoint ficticio, fixture reproducible pequeña, conexión de perfil e2e y `e2e/tests/ocr.spec.ts`.
2. Verificar contrato en navegador, con cuerpos ficticios. Capturar vistas a 400/480/640 y 1280 desktop y 360/375/390 mobile, incluida una altura reducida y zoom simulado. Comprobar área segura, orden del foco y ausencia de desbordes.
3. Conservar evidencias y cleanup del harness, clasificar y publicar para revisión independiente.

## Aceptación y pruebas

- Desktop. Abrir Herramientas con teclado, pegar en la zona, observar preview sin POST, extraer una vez, editar y copiar. Cambiar a un ancho que permita comparar captura y texto. Cerrar y comprobar mismo borrador, foco devuelto, cursor/undo y ausencia de escritura OCR sobre la nota. Verificar cuota visible con doble sin recurrir a un proveedor alternativo.
- Mobile. Elegir PNG/JPG con el input nativo, extraer, tocar el resultado, editar y copiar. Comprobar que campo y acción quedan alcanzables con altura reducida. Cerrar y volver a la nota. Registrar emulación y reservar el IME/zoom nativo para la comprobación física. Probar portapapeles denegado en componente según T-069 si el navegador de ensayo no permite configurar ese permiso de forma reproducible.
- En ambos. Proxy, autenticación y backend propios, cero interceptación de la API propia, cabecera ficticia en el doble. Conservar nombres/textos de fixtures solamente y pruebas de voz existentes.

Desde raíz, Git Bash, Node >=24 y Docker Linux, usar namespaces propios vacíos. Guardar JUnit/capturas saneados y comprobar ausencia de contenedores, redes y volúmenes por los labels exactos antes y después.

```bash
STARTER_E2E_PROJECT=starter-e2e-t070-ocr-desktop bash scripts/e2e.sh --grep 'screenshot OCR:' --project desktop
STARTER_E2E_PROJECT=starter-e2e-t070-ocr-mobile bash scripts/e2e.sh --grep 'screenshot OCR:' --project mobile
node --test e2e/fixtures/voice-provider.test.mjs
node scripts/docs-check.mjs
git diff --check
node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL
```

Ejecutar en serie. Si un namespace está ocupado, elegir otro propio. Por instrucción del dueño del 2026-11-16, la entrega de T-070 a revisión se acredita con Chromium dirigido, pruebas unitarias, docs-check, diff-check y clasificación. El dueño canceló la matriz completa y difirió STARTER para esta entrega. Antes de operaciones largas guardar checkpoint con SHA/base, namespaces, logs y cleanup. Esta tarea usa el doble y no requiere una clave del dueño.

## Checkpoint vigente

2026-11-16 (Buenos Aires). Frontera implementer en Codex Desktop, GPT-6 con variante y esfuerzo sin dato expuesto, PowerShell, Git/gh, Node 24.21.0, Git Bash y Docker Desktop Linux. [T-069 conciliada](T-069-ocr-workspace.md#conciliación). Base remota verificada `4f212efd4fe295290ddefb785b8d8edaf0b2b5ae`. El cambio cubre el transporte OCR del perfil E2E y el recorrido de navegador. Conserva la API, permisos, persistencia y UI de aplicación de T-068/T-069. Las capturas y el texto son ficticios. El teclado físico y zoom nativo siguen pendientes.

Dirigidos Chromium y unitarios verdes. Separación de perfiles local/E2E comprobada. Candidato técnico `5cc203aa952426d7c4e7a3b079397ae0970f2593`. Base remota reconfirmada y cleanup de la matriz cancelada completo. [PR73](https://github.com/MatiasNicolasAcevedo/devnotes/pull/73) entregado a revisión independiente bajo la decisión del dueño. El delta desde el candidato técnico solo documenta la evidencia y el traspaso. Se conserva la evidencia STARTER de T-068 y el gate acumulado de I5 sigue diferido.

## Evidencia dirigida

- `node --test e2e/fixtures/voice-provider.test.mjs` salió 0, **9/9**. Conserva los escenarios de Voz y prueba la clave ficticia, el multipart exacto, el rechazo de campos extra y tipo discordante, respuestas deterministas para PNG y JPEG y cuota HTTP 429. El servicio carece de puerto publicado. El perfil backend `e2e` fija su endpoint privado, solo transmite la clave ficticia y carece de fallback. Los demás perfiles mantienen la URL fija de OCR.space.
- La etapa backend del candidato final ejecutó las unitarias de OCR con **25/25** (`OcrConfigurationTest` 2, `OcrScreenshotValidatorTest` 3 y `OcrSpaceClientTest` 20) y `OcrExtractionApiIT` con PostgreSQL **4/4**.
- `STARTER_E2E_PROJECT=starter-e2e-t070-ocr-desktop-c3d4 bash scripts/e2e.sh --grep 'screenshot OCR:' --project desktop` y su par `STARTER_E2E_PROJECT=starter-e2e-t070-ocr-mobile-c3d4 bash scripts/e2e.sh --grep 'screenshot OCR:' --project mobile` salieron `verify=0 cleanup=0` en serie. Checkout `.orchestrator/t070-ocr-n1116-c3d1`, SHA `52065eddaa03d09c21f7f857032bd83599f7f70b`, árbol `f8992fde58b51ffb582880e258c42c4788dd9339`. El delta de fuentes al candidato de cierre es solo `compose.local.yml`, que estos dirigidos no cargan. Cada JUnit saneado contiene un caso sin error, fallo ni omisión en `e2e/artifacts/<namespace>/sanitized/junit.xml`. PNG recortados al diálogo ficticio en `e2e/artifacts/<namespace>/ocr-layout/`. Logs y exits en `.orchestrator/t070-ocr-n1116-c3d1-c3d4-*`. Ambos namespaces dieron 0/0/0 contenedores/redes/volúmenes por label exacto antes y después.
- Escritorio en Trabajo. Teclado y secuencia de foco, evento de pegado de Chromium con el PNG ficticio byte a byte, aviso y vista previa con cero POST, una extracción real por el proxy, edición y portapapeles real. Una columna a 400/480/640 CSS px, dos a 1280 con al menos 400 px para texto y 200 % simulado con 640×384 CSS px y DPR 2. Escape devuelve el foco a Herramientas. Se preservaron editor, cursor, borrador, undo y la nota persistida. El caso de cuota devolvió HTTP 429 `OCR_QUOTA_EXHAUSTED` y un aviso visible, con un único POST para ese gesto.
- Móvil en Personal. Selector de archivo de Chromium y JPEG ficticio, extracción por el proxy y foco en texto solo tras tocarlo. Se verificaron 360/375/390 CSS px y 640×280 con insets emulados no nulos. Desplazamiento para editar y copiar el resultado y cierre accesible. La nota conservó texto y revisión. IME, selector del sistema y zoom nativo de Android físico quedan para la comprobación física. El negativo de portapapeles denegado está en la prueba de componente de T-069.
- `docker compose --env-file scripts/fixtures/local-assay.env.example -p starter-dev-test-t070-profile -f docker-compose.yml -f compose.auth-test.yml -f compose.local.yml --profile oidc --profile local config --format json` y el equivalente con `scripts/fixtures/e2e.env.example`, proyecto `starter-e2e-t070-config`, `docker-compose.e2e.yml` y perfil Compose `e2e`. Se cotejaron ambos perfiles Spring, emisores ficticios, PostgreSQL y ausencia de puertos del doble. Salida saneada del assert: `local=e2e e2e=e2e db=postgres:18.6` exit 1 antes, `local=test e2e=e2e db=postgres:18.6` exit 0 después. Estos comandos solo resuelven configuración.

## Cierre para revisión independiente

Candidato `5cc203aa952426d7c4e7a3b079397ae0970f2593`, árbol `bef0e2ae89996ca2233f75538ab9579739f728fc`, base `4f212efd4fe295290ddefb785b8d8edaf0b2b5ae`, en `.orchestrator/t070-starter-n1116-c3dh`. `node scripts/docs-check.mjs` y `git diff --check origin/main...HEAD` verdes. `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` salió 0 y dio `FULL/STARTER`, nueve rutas técnicas de dieciocho.

Registro de la ejecución parcial iniciada antes del cambio de instrucción del dueño. Git Bash explícito desde PowerShell:

```bash
COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container \
COMPOSE_PROJECT_NAME=starter-verify-t070-c3dh STARTER_LOCAL_TEST_PREFIX=starter-dev-test-t070-c3dh \
STARTER_E2E_PROJECT=starter-e2e-t070-ocr-starter-c3dh bash scripts/verify.sh --starter
```

Docs, backend (629 unitarias, 308 Failsafe, Spotless y JaCoCo), cliente (827, con typecheck, lint, formato, cobertura y build) y tooling salieron 0. La matriz Chromium se detuvo a pedido del dueño y la etapa E2E devolvió 143. Una ejecución de escritorio de `copy-previous.spec.ts`, caso «requires a new click for a changed source and protects a remote destination», había fallado esperando el botón de copia anterior. El recorrido OCR dirigido cuenta con su propio JUnit verde en ambos proyectos. STARTER queda **interrumpido**, con salida agregada `verify=1 cleanup=0`, y la revisión usa la evidencia dirigida autorizada.

Log, exit y cleanup en `.orchestrator/t070-ocr-n1116-c3d1-c3dh-starter.*`. La verificación posterior confirmó 0/0/0 contenedores/redes/volúmenes en los nueve proyectos propios registrados y 0 de 68 IDs propios de Testcontainers. Coincidieron HEAD, árbol y base antes y después. GitHub reconfirmó PR72 MERGED, `main` en la base probada y la ausencia de otros PR abiertos antes de publicar.

## Correcciones de implementación

| Problema y causa | Arreglo y prueba |
|---|---|
| Chromium desktop sobre `c869f34` llegó hasta copiar y falló en la primera medición: el nombre parcial «Captura» coincidía también con el título del diálogo. | Localizador exacto en `43a680a`. El mismo commit añade insets de área segura no nulos en Chromium móvil. Primer intento `verify=1 cleanup=0`, JUnit saneado del proyecto `starter-e2e-t070-ocr-desktop-c3d1` y 0/0/0 al terminar. |
| El encabezado de la captura y el textarea tenían 14 px de diferencia por el padding del campo en la vista compacta. | Comparar encabezados equivalentes y seguir midiendo por separado el ancho útil del textarea en `2a9fd3a`. Rojo en el proyecto `starter-e2e-t070-ocr-desktop-c3d2` con cleanup 0/0/0. Verde en ambos proyectos `*-c3d3` con cleanup 0/0/0. El lanzador usa ruta absoluta para iniciar el segundo ensayo desde el directorio cambiado por el primero. |
| El PNG de zoom de `2a9fd3a` incluyó parte de la pantalla de Notas porque el capturador del locator cambió el viewport durante el override de CDP. | Ajustar el viewport de Playwright a las mismas dimensiones y capturar por CDP con clip de la caja del diálogo en `52065ed`. La captura de zoom anterior queda fuera de la evidencia. |
| `dev.sh --mode local` heredaba `e2e` de `compose.auth-test.yml` y habría fijado OCR al doble durante el ensayo local de T-071. El assert de configuración efectiva dio rojo. | `compose.local.yml` fija el perfil `test`, que conserva OIDC ficticio y selecciona el endpoint OCR ordinario en `5cc203a`. El assert pasó y el overlay de navegador conserva `e2e`. Se canceló STARTER `c3dg` durante backend (exit 143 de esa etapa), antes de cliente, tooling y Playwright. Cleanup final 0/0/0 de proyectos y 0 de 27 IDs propios de Testcontainers tras esperar a Ryuk. |

## Cierre y siguiente tarea

Tras MERGED, declarar el recorrido con doble acreditado y pasar a [T-071](T-071-ocr-first-real-test.md). Actualizar STATUS para avisar al dueño en cuanto la prueba de precisión dependa de su autorización y configuración privada.
