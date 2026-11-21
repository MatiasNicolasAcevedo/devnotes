---
id: T-074
status: in_progress
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

## Checkpoint vigente

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

**Pendiente de aceptación**: probar un archivo soltado desde Explorador y un recorte real de Windows al volver a Chrome. El stack propio `starter-e2e-t074-windows` arrancó con cuenta y proveedor ficticios, y la pantalla vacía se comprobó en Chrome. La skill de control de Windows limita el arrastre a una ventana y no expuso la superposición de selección de Recortes. La interacción de Windows se detuvo con Escape antes de observar cualquiera de los dos gestos. Los eventos de arrastre/pegado de Playwright se verificaron por separado. El cleanup del proyecto Windows (exit 0) dejó 0 contenedores, redes y volúmenes por label.

Retoma local desde este worktree: `& .orchestrator/t074-windows/stack.ps1 up` y `node .orchestrator/t074-windows/check.mjs`. Usar el PNG ficticio local `.orchestrator/t074-windows/T074-captura-ficticia.png`. El ensayo solo registra metadatos de drop/paste, dimensiones de vista previa y conteo de POST. Cerrar el Chrome aislado al terminar y limpiar con `& .orchestrator/t074-windows/stack.ps1 down`; comprobar labels exactos. Estos archivos de trabajo son locales e ignorados.

FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit sigue vigente.

La [biblioteca de Imagen](T-075-image-text-library.md) añade guardado y borrado más adelante.
