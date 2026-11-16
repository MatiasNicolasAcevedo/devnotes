---
id: T-069
status: mergeable
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-068]
branch: codex/t-069-ocr-workspace
role: merger
executor: frontier
pr: 72
---

# T-069 · Copiar texto de una captura desde Notas

## Objetivo

Abrir la herramienta sin salir de la nota, pegar/elegir una captura, examinarla, extraer, editar y copiar en escritorio ancho, escritorio al 25 % y móvil. Toda la sesión de extracción es transitoria.

## Alcance y decisiones resueltas

Implementar la [entrada y tres composiciones de S-112](../specs/S-112-screenshot-ocr.md#entrada-diseño-y-comportamiento) aplicando frontend-design antes de codificar. Reusar el tema único, la infraestructura de diálogo, el cliente `http.ts` con CSRF/aborto y el clipboard existente donde conserve la semántica. La API de T-068 gobierna disponibilidad por espacio. Mostrar la opción deshabilitada con explicación si corresponde y evitar tráfico de extracción. Mantener la edición y el guardado de la nota independientes.

## Leer antes

[S-112](../specs/S-112-screenshot-ocr.md), [client/AGENTS](../../client/AGENTS.md), [DailyNotesPage](../../client/src/features/daily/DailyNotesPage.tsx), [AppShell](../../client/src/app/AppShell.tsx) y [clipboard](../../client/src/shared/ui/useCopyToClipboard.ts).

## Archivos y pasos

1. Conciliar T-068 y tomar la tarea solo tras su MERGED. Añadir cliente y diálogo en `client/src/features/ocr/` y el punto de entrada en `DailyNotesPage.tsx`.
2. Implementar selección/preview/estado y descartes por generación, foco, cierre e interacción táctil. Integrar los errores y mantener la edición ante rechazo del portapapeles.
3. Ejecutar dirigidos y prueba de disposición en navegador, con capturas ficticias saneadas. Registrar SHA/base y perfil del diff, y publicar para revisión independiente.

## Aceptación y pruebas

| Escenario | Resultado y capa |
|---|---|
| Elegir PNG/JPEG, pegar imagen en la zona, cancelar selector, elegir otra imagen, rechazar extensión/tipo o tamaño, pegar texto en el resultado | Componente. Preview local antes del POST. Se sube solo la imagen actual al pulsar Extraer. Cancelar/invalidar conserva la selección previa y avisa. Un cambio válido descarta estados previos y confirma si había edición sin copiar. |
| Extraer, editar `T-055`, `ERR_CONNECTION_RESET` y `/src/api/foo-bar.ts`, copiar; portapapeles denegado | Componente. El valor copiado es el actual. Ante fallo, el campo, su edición y la alternativa de copia manual siguen disponibles. |
| 400/413/415, sin texto, timeout, cuota, error lógico o parcial, doble clic y respuesta vieja con cambio de imagen/cierre/fecha/espacio/identidad | Componente con bordes HTTP simulados. Mensaje asociado al estado real, un POST por gesto, abort y generación controlados, sin resultado anterior o cruzado. |
| Abrir/cerrar con borrador, undo y cursor; teclado y tacto | Componente para montaje y foco. En navegador, inspeccionar 400/480/640 y 1280 de escritorio, y 360/375/390 de móvil. Previo a T-070, comprobar con infraestructura de desarrollo propia o render local aislado del componente con estado de ejemplo y captura ficticia. T-070 automatiza geometría y recorre la API real. |

Desde `client/`:

```bash
npm test -- --run src/features/ocr/OcrDialog.test.tsx src/features/ocr/api.test.ts src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyNotesToolbar.test.tsx src/features/daily/DailyDraftNavigation.test.tsx src/services/http.test.ts
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Desde raíz, `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Aplicar [TESTING](../TESTING.md#regla-general-fuera-de-la-excepción) y las instrucciones vigentes del dueño al cierre. Los tests de integración del componente simulan HTTP en Vitest. El navegador de T-070 usará backend real. Ninguna clave real en este paso.

## Checkpoint vigente

2026-11-15 (Buenos Aires). Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Node 24.21.0 y skill `frontend-design`. Base remota `b8ba81f950dd190851b9b5430e479691e19361df`. [T-068 conciliada](T-068-ocr-api.md#conciliación) con STARTER conservado. El cambio afecta la UI de Notas y consume la API OCR existente; los archivos y el texto OCR son transitorios. El gate acumulado de I5 sigue diferido y la clave real corresponde a T-071.

[Revisión independiente R1 favorable](#revisión-independiente-r1). El veredicto canónico queda en [PR72](https://github.com/MatiasNicolasAcevedo/devnotes/pull/72), asociado al HEAD documental final, la base y su `verify-required`. La confirmación de MERGED habilita T-070.

## Evidencia del FULL de cierre

Candidato `398801f76835e61b56f3ee840ec0faeee5cc4b30`, árbol `237272abebb8c5d4297a6c718489df786400bc11`, base `b8ba81f950dd190851b9b5430e479691e19361df`. En el checkout limpio `.orchestrator/t069-full-corrected-n1115-697e` pasaron `node scripts/docs-check.mjs` y `git diff --check origin/main...HEAD`. `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` dio `FULL/APPLICATION`, 9 rutas técnicas de 12. Se aisló el checkout para preservar el directorio preexistente `trailer/`, cuyo `CLAUDE.md` interfiere con docs-check en el árbol local original.

El 2026-11-15 a las 20:19 de Buenos Aires, Git Bash explícito, Node 24 y Docker Desktop Linux ejecutaron `COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container COMPOSE_PROJECT_NAME=starter-verify-t069-full-corrected-n1115-697e STARTER_E2E_PROJECT=starter-e2e-t069-full-corrected-n1115-697e bash scripts/verify.sh` con fixtures ficticias. **`verify=0 cleanup=0`**. Docs en verde, 629 Surefire y 308 Failsafe con PostgreSQL 18.6, Spotless y JaCoCo. Cliente con typecheck, lint, formato, cobertura, build y 827 pruebas. Playwright 77/77 (39 escritorio, 38 móvil) con cero fallos, errores u omitidos en el JUnit saneado, incluido SP-06/SP-07 móvil.

El lanzador `.orchestrator/t069-full-corrected-n1115-697e.ps1` cotejó SHA, árbol y base antes y después. Ambos proyectos quedaron en `0/0/0` contenedores, redes y volúmenes y ninguno de los 34 IDs propios de Testcontainers seguía presente. Logs y exit en `.orchestrator/t069-full-corrected-n1115-697e{,-cleanup}.log` y `.orchestrator/t069-full-corrected-n1115-697e.exit`. JUnit en `e2e/artifacts/starter-e2e-t069-full-corrected-n1115-697e/sanitized/junit.xml` dentro del checkout. Antes de publicar, GitHub reconfirmó PR71 MERGED y `main` en la base probada.

## Verificación dirigida

- Los seis archivos indicados en el contrato dieron 90/90, incluido el POST explícito con CSRF, cancelación/validación, aborto y descarte al cambiar de imagen, fecha, espacio o cuenta, cierre de sesión, cuota, timeout, edición y portapapeles. `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build` salieron 0. El build avisó por tamaño del chunk principal. Log de Vitest en `.orchestrator/t069-directed.log`.
- Chromium con una captura y resultado ficticios en un render local aislado. El selector nativo entregó el PNG completo y el ensayo de disposición hizo cero peticiones a la API. Escritorio 400/480/640 en una columna y 1280 en dos, con 496 px útiles de texto. Táctil 360/375/390 y horizontal 640×280 en pantalla completa, con campo de 16 px, controles de 48 px y sin desborde horizontal. A 1280 se conservaron nodo editable, borrador, posición del cursor y undo, con foco de vuelta en Herramientas. Script y registro en `.orchestrator/t069-layout.mjs` y `.orchestrator/t069-layout.log`. El recorrido con backend real corresponde a T-070.
- `bash scripts/e2e.sh --grep 'SP-06/SP-07' --project desktop` y el mismo filtro con `--project mobile` dieron 1/1 y exit 0 sobre `398801f`. Logs y exits en `.orchestrator/t069-sp0607-{desktop,mobile}-n1115-697e.*` y cleanup `0/0/0` de ambos proyectos en `.orchestrator/t069-sp0607-n1115-697e-cleanup.log`.

## Correcciones de implementación

| Problema y causa | Arreglo y evidencia |
|---|---|
| El diálogo incluía «Cerrar» en el nombre accesible porque el botón estaba dentro del título. | El cierre queda junto al encabezado, con nombre propio. Vitest encuentra el diálogo por su título y comprueba el retorno de foco a Herramientas. |
| El tope de ancho predeterminado de MUI dejaba 32 px de margen a cada lado en escritorio angosto. El evento nativo `cancel` del selector tampoco llegaba al manejador React del input. | El papel usa el ancho previsto con margen de 12 px y se escucha `cancel` en el input. Chromium midió 376 px de diálogo a 400 px de ventana. Vitest comprueba el aviso y que se conserva la captura anterior. |
| SP-06/SP-07 registró 1 petición privada donde esperaba 0 en `spaces.spec.ts:425`. Al armar el listener en la misma pestaña recién restaurada por `goForward`, la ventana de observación incluía tráfico posible de la nota válida. | Cada URL inválida se visita directamente en una pestaña nueva de la misma sesión, con listener propio antes de navegar. Se conservan la pantalla esperada y la aserción de cero peticiones para ambos casos, sin cambios en plazos ni retries. Se conserva el rojo del FULL sobre `0f1b5a1` en `.orchestrator/t069-full-n1115-a8d3.log` y el JUnit saneado del proyecto E2E. Cleanup `0/0/0` en ambos proyectos y 0 de 34 IDs propios de Testcontainers. |

## Revisión independiente R1

2026-11-15 (Buenos Aires). Frontera reviewer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Node 24.21.0 y Chromium. Checkout propio `.orchestrator/t069-review-r1-codex`. GitHub confirmó [PR72](https://github.com/MatiasNicolasAcevedo/devnotes/pull/72) OPEN contra `main`, HEAD de entrada `6eda796fba579afa96b0d39ca1e062f0b7e5712e`, base `b8ba81f950dd190851b9b5430e479691e19361df`, [`verify-required` SUCCESS sobre ese HEAD](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43778413393/job/133009886620) y cero hilos de revisión. La UI consume la API y los permisos de T-068 y mantiene captura y resultado en memoria transitoria.

- Cotejé el [FULL de cierre](#evidencia-del-full-de-cierre), su árbol, base y salida `verify=0 cleanup=0`. El JUnit saneado contiene 77 casos, 39 escritorio y 38 móvil, con cero fallos, errores u omisiones. Los logs confirman 629 Surefire, 308 Failsafe y 827 pruebas de cliente. Los proyectos quedaron en 0/0/0 y sobrevivieron 0 de 34 IDs propios de Testcontainers. Con `node scripts/ci/classify-diff.mjs --base b8ba81f --head 6eda796 --phase FULL` se conservan las 9 rutas técnicas de 12 y `FULL/APPLICATION`. El delta `398801f..6eda796` es `DOCS_ONLY/DOCUMENTATION` y modifica únicamente STATUS y T-069. Coinciden todas las fuentes y la base del FULL.
- Repetí en el checkout del HEAD publicado los seis archivos de Vitest del contrato. Pasaron **90/90**. El POST exige acción explícita y CSRF, con un solo campo `file`. Revisé disponibilidad por cuenta y espacio, limpieza y aborto por generación, desmontaje al cambiar fecha, espacio o cuenta y al terminar sesión, y rechazo de respuestas tardías. Invalidar o cancelar la selección conserva la captura anterior. Se confirma el descarte de ediciones y se conserva el resultado si falla el portapapeles.
- Repetí el render aislado de Chromium con fixtures y cero llamadas a la API. Escritorio 400/480/640 en una columna y 1280 en dos con 496 px de texto. Táctil 360/375/390 y 640×280 en pantalla completa, sin desborde horizontal y con campo de 16 px y cierre de 48 px. En 1280 verifiqué Escape con texto editado, confirmación de descarte, foco devuelto a Herramientas y conservación del nodo, borrador, selección, scroll y undo del editor. Registro en `.orchestrator/t069-review-r1-browser.log`. T-070 comprueba el recorrido con API propia real y doble externo.
- En SP-06/SP-07 se mantienen historial, pestañas y logout. Las dos visitas inválidas conservan el mismo contexto de sesión y comprueban el aviso y cero peticiones privadas, cada una con listener propio antes de navegar. El rojo anterior registró una petición privada en una ventana de observación que también incluía la pestaña con la ruta válida restaurada. Cotejé los dos dirigidos verdes y los dos casos verdes del FULL en el JUnit. La comprobación física de SP-06 con teclado y zoom sigue pendiente del dueño.

Revisión favorable, sin bloqueantes. Se conserva el [STARTER de T-068](T-068-ocr-api.md#evidencia-de-starter-de-b-2-y-traspaso-a-r3) y el gate acumulado de I5 sigue diferido. La clave real corresponde a T-071 y la activación en Render requiere su autorización separada.

## Cierre y siguiente tarea

Tras MERGED confirmado, habilita [T-070](T-070-ocr-journey.md).
