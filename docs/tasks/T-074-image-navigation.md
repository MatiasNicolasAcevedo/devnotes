---
id: T-074
status: in_review
priority: P1
size: S
milestone: M6
spec: S-112
depends_on: [T-073]
branch: codex/t-074-image-navigation
role: implementer
executor: frontier
pr: 77
---

# T-074 · Imagen en la navegación principal

## Objetivo

Entrar a **Imagen** directamente desde la barra, pegar o elegir y extraer texto sin abrir el editor de Notas.

## Alcance

- Ruta privada `/image` con el espacio de la navegación existente. Imagen entre Referencias e Historial en escritorio y móvil. En móvil, cinco celdas de igual ancho con icono y etiqueta, selección ámbar, 48 CSS px de alto y áreas seguras. Preservar orden de los otros destinos.
- Reusar la captura, previsualización, extracción y resultado editables de T-073. Caja con foco y `Ctrl+V`, **Pegar** por gesto explícito y **Elegir imagen**. Lectura de imágenes del portapapeles solo ante clic en **Pegar**. Si el navegador bloquea o carece de lectura directa, devolver foco a la caja y ofrecer el atajo o selector. Nunca leer el portapapeles al abrir o cambiar de espacio.
- Conservar el [estado vacío de S-112](../specs/S-112-screenshot-ocr.md#seguimiento--imagen-como-destino-principal) verificado en T-073 al pasar del diálogo a la pantalla propia.
- Retirar OCR de Herramientas en Notas. Conservar los borradores de Notas y el espacio activo al pulsar Imagen. Al salir de Imagen o cambiar cuenta/espacio, invalidar resultados pendientes, liberar la captura y proteger la edición sin copiar según S-112. Cotejo lado a lado si hay ancho útil, una columna en ventana angosta y móvil. El estado no disponible sigue visible desde Imagen.

- Ofrecer arrastre desde el explorador de Windows en la zona de Captura. Reusar validación de selección, estado válido previo y confirmación de reemplazo. No abrir ni cargar archivos al soltarlos. Mantener el selector accesible en móvil. [Diseño](../design/WRITING-WORKSPACES.md#imagen).

## Aceptación y pruebas

- Desde `client/`: `npm test -- --run src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx src/features/ocr/OcrDialog.test.tsx`. Adaptar las pruebas OCR a la pantalla nueva preservando regresiones. Cotejar orden, `aria-current`, espacio, salida con edición, permiso denegado de **Pegar** y navegación por teclado.
- Actualizar el caso OCR de E2E. Pasar `bash scripts/e2e.sh --grep 'screenshot OCR:' --project=desktop` y el mismo filtro con `--project=mobile` en proyectos efímeros distintos y con doble externo. Verificar Notas al salir, amplitud a 320/360/375/390 CSS px y 768 en escritorio, sin scroll horizontal. Verificar en Windows dos caminos reales con datos ficticios, soltar un PNG del explorador y pegar tras volver de Recortes, sin llamada externa hasta extraer. Agregar en Chromium un drop válido y los negativos múltiple, URL y tipo inválido. Aplicar el [gate dirigido](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16) y cleanup. Usar STARTER_E2E_PROJECT=starter-e2e-t074-desktop o starter-e2e-t074-mobile según el proyecto.

## Evidencia de implementación

2026-11-21. Frontera implementer en Codex Desktop, GPT-6.2 Sol con esfuerzo alto, PowerShell, Git/gh, Git Bash, Node 24.21 y Docker Desktop. Impacto: ruta privada `/image`, cinco destinos principales, selección y previsualización local con teclado, portapapeles y arrastre. Se reutilizaron la sesión, el espacio, el guardado de Notas y la API de OCR. La extracción inicia al pulsar **Extraer texto**. No se incorpora almacenamiento de capturas o resultados.

[PR #77](https://github.com/MatiasNicolasAcevedo/devnotes/pull/77) contra `main@74d987d1cd7f1d4e0d1f2a8994fe7d656cc47e30`. Fuentes probadas: `3fbf34989ac9f3259751f23ef16db733791d3aa4`. `gh pr view 77 --repo MatiasNicolasAcevedo/devnotes` (0) confirmó ese HEAD y [verify-required](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/44955832058/job/137003605434) verde. `gh pr view 76 --repo MatiasNicolasAcevedo/devnotes`, `git fetch origin main`, `git merge-base --is-ancestor 74d987d1cd7f1d4e0d1f2a8994fe7d656cc47e30 origin/main` y `gh pr list --repo MatiasNicolasAcevedo/devnotes --state open`: exit 0. PR #76 mergeado contra `main` y cero PR abiertos al partir. Primer commit de la rama `7e65e77`: T-073 en `done`, T-074 en `in_progress`.

- Cliente: `npm test -- --run src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx src/features/ocr/OcrDialog.test.tsx` (0, 52/52), `npm run typecheck` y ESLint dirigido (0). Se conservan los casos de pegado sin extensión, validación, foco, texto editable, cuota e invalidación de solicitudes tardías. Se añadieron permisos denegados de Pegar y confirmación de salida, cambio de espacio y cierre voluntario de sesión.
- `STARTER_E2E_PROJECT=starter-e2e-t074-desktop bash scripts/e2e.sh --grep 'screenshot OCR:' --project desktop` (0, 1/1). Chromium prueba Pegar por gesto, Ctrl+V desde un botón, arrastre válido, múltiples archivos, URL, texto, formato y tamaño inválidos. El aviso precede al POST. Cubre extracción real a través del proxy, API propia, PostgreSQL 18 y OIDC local con doble externo OCR, copia editada, 429, vuelta a Notas y guardado del borrador en Trabajo.
- `STARTER_E2E_PROJECT=starter-e2e-t074-mobile bash scripts/e2e.sh --grep 'screenshot OCR:' --project mobile` (0, 1/1). Selector JPEG, extracción deliberada y edición/copia en Personal. Cotejo de la barra y áreas seguras con 320/360/375/390 CSS px y 640 × 280 CSS px. Se verificaron cinco celdas de igual ancho, objetivo táctil de 48 CSS px, selección ámbar y ausencia de desborde horizontal.
- Cotejo frontend-design en el shell ejecutado con fixtures: vacía y enfocada en Chrome Windows 158.0.8127.36, compacta a 768 CSS px y dos columnas a 1280 CSS px en Chromium, más los anchos móviles y zoom 200 % simulado de escritorio. Se verificaron selector de espacio, estado, cuenta y foco. Los E2E aprobaron readiness, saneado y comprobación posterior de 0 contenedores, redes y volúmenes por cada label.
- `node scripts/docs-check.mjs` y `git diff --check origin/main HEAD` (0). `bash scripts/verify.sh --policy origin/main` (0): `APPLICATION / FULL`, clasificación informativa.

| Causa o evidencia | Ajuste | Comprobación |
|---|---|---|
| Primer build (exit 2) y ambos scripts E2E (exit 1) rechazaron `exact` de Playwright en consultas de Testing Library. ESLint marcó un parámetro sin uso en el contexto de edición. | Consultas de rol con el matcher de Testing Library y firma tipada del contexto. | Typecheck, ESLint y build de los proyectos efímeros (0). |
| Primer E2E móvil con stack (exit 1) detectó redondeo subpíxel entre celdas con insets, tras pasar los cuatro anchos móviles. | Tolerancia de 0,05 CSS px para comparar el ancho y conservar la verificación de 48 CSS px de alto. | Proyecto móvil (0); escritorio repetido (0), incluye guardado al navegar y zoom simulado. |
| Chrome devolvió «Se está abriendo en una sesión de navegador existente» al retomar el perfil anterior (exit 1). | Crear un perfil temporal nuevo para este ensayo. | Chrome 158.0.8127.36 abrió Imagen con el OIDC ficticio. La sonda terminó con exit 0 y se retiró su perfil. |

### Ensayo nativo de Windows del PR #77

2026-11-21. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Playwright como sonda y control de aplicaciones Windows para observar y cerrar Chrome. El dueño realizó y confirmó ambos gestos. La prueba ejercitó la entrada y previsualización de la misma ruta Imagen, con cuenta y archivos ficticios, API y OIDC locales, PostgreSQL 18 y doble externo. Sin cambios de producto, API, permisos o datos en esta sesión.

`gh pr view 77 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid` (0) confirmó el borrador `e1d517d5cf5feb702e061707e51103d4ecebd8d4` contra `main@74d987d1cd7f1d4e0d1f2a8994fe7d656cc47e30`. `git merge-base --is-ancestor 3fbf34989ac9f3259751f23ef16db733791d3aa4 e1d517d5cf5feb702e061707e51103d4ecebd8d4` (0) y `git diff --exit-code 3fbf34989ac9f3259751f23ef16db733791d3aa4 e1d517d5cf5feb702e061707e51103d4ecebd8d4 -- client/ e2e/` (0) ligan el ensayo a las fuentes del gate anterior. [verify-required de entrada](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/44956355893/job/137005232203) en SUCCESS.

| Gesto del dueño | Evento y archivo en Chrome | Foco al gesto | Vista previa natural | POST de extracción |
|---|---|---|---|---|
| Soltar `T074-captura-ficticia.png` de Explorador sobre Captura | `drop` nativo (`isTrusted=true`), un ítem `file`, `image/png`, 3.738 bytes | Chrome activo, Zona para pegar una captura | 440 × 142 px | 0 |
| Volver de Recortes y pulsar Ctrl+V en Captura | `paste` nativo (`isTrusted=true`), un ítem `file`, `image/png`, 13.704 bytes | Chrome activo, Zona para pegar una captura | 492 × 210 px, reemplazó la anterior | 0 |

La caja arrancó enfocada y vacía. La sonda midió cada vista previa después de decodificar la URL nueva y registró cero `POST /api/v1/ocr/extractions` desde la apertura hasta el cierre. **Extraer texto** quedó disponible tras recibir la imagen. La extracción deliberada con el doble está cubierta por el E2E dirigido anterior.

Retoma local desde este worktree: `& .orchestrator/t074-windows/stack.ps1 up` (0, readiness verde) y `node .orchestrator/t074-windows/check.mjs` (0 tras cerrar Chrome). PNG ficticio local en `.orchestrator/t074-windows/T074-captura-ficticia.png`. Cleanup con `& .orchestrator/t074-windows/stack.ps1 down` (0) y consultas Docker (0) por `com.docker.compose.project=starter-e2e-t074-windows`: 0 contenedores, 0 redes, 0 volúmenes. Se retiró el perfil creado para este ensayo. Los archivos de trabajo están ignorados.

Gate diario de retoma: `node scripts/docs-check.mjs` (0), `git diff --check origin/main HEAD` (0) y `bash scripts/verify.sh --policy origin/main` (0, `APPLICATION / FULL` informativo). Siguiente paso: revisión independiente del PR #77.

FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit sigue vigente.

## Checkpoint vigente

2026-11-21. Frontera implementer de corrección en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, Node 24.21 y Docker Desktop. [PR #77](https://github.com/MatiasNicolasAcevedo/devnotes/pull/77), base `main@74d987d1cd7f1d4e0d1f2a8994fe7d656cc47e30`. Fuentes del gate y de la corrección `7fb517fe9660963c79a83e7c96c575cd2c09cf11`. El impacto se limita al comportamiento de Captura al soltar un archivo con texto adjunto. API, permisos y datos conservan el contrato de S-112.

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| [R1-1](https://github.com/MatiasNicolasAcevedo/devnotes/pull/77#issuecomment-7070508900). Un PNG acompañado por `text/uri-list` o `text/plain` se admitía como captura. | Captura cancela el evento y rechaza la entrega si contiene algún ítem de texto, antes de seleccionar el archivo. | Dos negativos de Chromium parten de un JPEG seleccionado con resultado ya extraído. Ambos muestran «Soltá un solo archivo PNG o JPG.», conservan la URL de la vista previa y el resultado, mantienen la ruta y registran cero POST después de la extracción de preparación. El recorrido existente acepta un solo PNG y registra el primer POST al activar **Extraer texto**. |

- Entrada (exit 0): `gh pr view 77 --repo MatiasNicolasAcevedo/devnotes` confirmó `OPEN`, `isDraft=false` y la base exacta. `git fetch origin codex/t-074-image-navigation` y `git log -1 --format=%H origin/codex/t-074-image-navigation -- docs/STATUS.md` confirmaron el checkpoint publicado `fd37bff4c07ddc71622abab51d4c8089d8296550`, descendiente del HEAD revisado `1b5f3f784e7a7f912ade408a1f37d600fd598475`.
- Rojo antes del cambio: `STARTER_E2E_PROJECT=starter-e2e-t074-r1-red bash scripts/e2e.sh --grep 'screenshot OCR: reject a mixed PNG drop' --project desktop` (1, 2 fallos). Ambas trazas llegan al drop cancelado y fallan al esperar el mensaje. Informe saneado local en `e2e/artifacts/starter-e2e-t074-r1-red/sanitized/`.
- Cliente: `npm test -- --run src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx src/features/ocr/OcrDialog.test.tsx src/features/spaces/SpaceNavigation.test.tsx` (0, 71/71), `npm run typecheck` (0) y ESLint y Prettier dirigidos a `ImageWorkspace.tsx` (0).
- Gate E2E: `STARTER_E2E_PROJECT=starter-e2e-t074-r1-desktop bash scripts/e2e.sh --grep 'screenshot OCR:' --project desktop` (0, 3/3) y `STARTER_E2E_PROJECT=starter-e2e-t074-r1-mobile bash scripts/e2e.sh --grep 'screenshot OCR:' --project mobile` (0, recorrido móvil aprobado y dos casos de arrastre de escritorio omitidos por proyecto). Readiness, exportación saneada y cleanup por los labels exactos (0 contenedores, 0 redes y 0 volúmenes tras cada corrida). API, PostgreSQL y OIDC locales con doble externo de OCR.
- Evidencia nativa: el ensayo de Explorador registró un único ítem `file`, que sigue la misma validación de PNG/JPEG. El ensayo de Recortes ejercitó `paste`, cuyo manejador conserva las mismas fuentes. Se cotejaron ambos gestos documentados con el diff. La prueba actual en Chromium ejercita `DataTransfer` y preserva las mediciones nativas del ensayo anterior.
- `node scripts/docs-check.mjs` y `git diff --check 74d987d1cd7f1d4e0d1f2a8994fe7d656cc47e30 HEAD` (0). `bash scripts/verify.sh --policy origin/main` (0, `APPLICATION / FULL` informativo). `verify-required` corresponde al HEAD publicado que incorpora este checkpoint.

Pendiente la revisión independiente R2. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit sigue vigente.

La [biblioteca de Imagen](T-075-image-text-library.md) añade guardado y borrado más adelante.
