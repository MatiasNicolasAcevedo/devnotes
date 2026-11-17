---
id: T-073
status: in_review
priority: P1
size: S
milestone: M6
spec: S-112
depends_on: [T-071, T-092]
branch: codex/t-073-ocr-windows-paste-fix
role: implementer
executor: frontier
pr: 76
---

# T-073 · Pegar recortes de Windows en OCR

## Objetivo

Al volver al navegador tras usar Recortes de Windows, pegar una captura ficticia con `Ctrl+V` y ver la previsualización. Ante un problema de portapapeles, informar cómo continuar en la misma pantalla.

## Alcance

- Mantener el primer acceso desde Notas durante esta corrección. Aplicar el pegado dentro de la superficie OCR aunque el foco esté en un control no editable de esa superficie. Conservar el pegado normal en el campo de resultado y fuera de OCR. Reducir ambigüedad con foco visible en la caja al abrir en escritorio y al pulsarla.
- Adoptar el [estado vacío de S-112](../specs/S-112-screenshot-ocr.md#seguimiento--imagen-como-destino-principal) también en el diálogo actual. Al entrar, la caja está vacía y tiene una indicación visual que no se puede seleccionar como contenido.
- Resolver imagen desde `clipboardData.files` o `clipboardData.items` de tipo archivo. Aceptar el MIME PNG/JPEG expuesto por el navegador y dar nombre local neutro si el elemento de portapapeles llega sin extensión. Usar la validación de tamaño, vista previa y confirmación de reemplazo existentes. Mantener validación del selector y validación de bytes en backend. Mostrar un mensaje ante texto, formato incompatible, portapapeles sin imagen o límite excedido. La selección previa se conserva ante error.
- Probar primero un recorte auténtico de una ventana ficticia en Windows para observar foco y tipos, sin copiar contenido personal ni registrar cuerpos. Si el navegador no entrega PNG/JPEG, conservar esa evidencia y orientar al selector. Probar por separado cambiar de foco y volver desde Recortes. Solo **Extraer texto** envía imagen y conserva el aviso.

## Leer antes

[Observación de T-071](T-071-ocr-first-real-test.md#conciliación-y-observación-posterior-en-render) · [S-112](../specs/S-112-screenshot-ocr.md#seguimiento--imagen-como-destino-principal) · [OcrDialog](../../client/src/features/ocr/OcrDialog.tsx) · [Prueba Chromium](../../e2e/tests/ocr.spec.ts) · [Recortes de Windows](https://support.microsoft.com/en-us/windows/apps/use-snipping-tool-to-capture-screenshots).

## Aceptación y pruebas

| Criterio | Verificación |
|---|---|
| Imagen válida pegada desde zona, hijo o control no editable de OCR da vista previa. Elementos del portapapeles sin extensión funcionan. | Rojo antes de corregir y verde con `npm test -- --run src/features/ocr/OcrDialog.test.tsx` desde `client/`. |
| Al abrir no hay captura ni resultado. La indicación de pegado no se puede seleccionar o copiar como contenido de la caja. Clic y teclado mantienen el foco de pegado, y una imagen válida reemplaza la indicación. | Estado y foco en pruebas dirigidas. Selección con ratón y cambio de estado en Chromium con fixture. |
| Pegar texto en el resultado funciona normalmente, imagen inválida deja visible el motivo y preserva la selección, pegar fuera de OCR queda intacto y pegar nunca llama al proveedor. | Negativos en la misma prueba de componente. Conservar la prueba de elección de archivo. |
| Chrome o Brave en Windows muestra un recorte real del portapapeles. | Recorte rectangular de texto ficticio con PrtSc si abre Recortes, o Win+Shift+S. Probar con clic en la caja y tras recuperar foco. Basta vista previa, sin POST. Registrar navegador, tamaños, foco y tipos solamente. Un evento sintético no sustituye este paso. |
| Extraer y copiar siguen funcionando por la API propia. | Desde raíz con Git Bash, stack efímero propio y doble externo: `STARTER_E2E_PROJECT=starter-e2e-t073-ocr-paste bash scripts/e2e.sh --grep 'screenshot OCR:' --project desktop`. Verificar cleanup por label. |

Gate dirigido según [TESTING](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), con docs-check y diff-check. Ver el [diseño de Imagen](../design/WRITING-WORKSPACES.md#imagen); validar primero el diálogo actual con su placeholder. Conservar STARTER de T-068 y el diferimiento separado de I5.

## Checkpoint vigente

2026-11-17. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Node 24.21 y Chrome para Windows. Alcance: pegado y estado vacío del diálogo, sin cambios de API, permisos, persistencia, shell ni despliegue.

`gh pr view codex/t-092-writing-workspaces-plan --repo MatiasNicolasAcevedo/devnotes` (0) confirmó [PR75](https://github.com/MatiasNicolasAcevedo/devnotes/pull/75) `MERGED` contra `main`, `mergedAt=2026-11-17T01:42:51Z`, squash `77cb710313e02c8fdd4afd1eea27020bd6e98a0c`. Ya conciliada `done` en main. `gh pr list --state open` (0) devolvió cero PR y `git ls-remote` (0) confirmó que main local y remoto coinciden en `b6728d0669008e550fada544f474c7ac8315e1d6`. Checkout nuevo; el anterior conserva `2a2fc56` y cuatro archivos modificados.

`npm test -- --run src/features/ocr/OcrDialog.test.tsx`: rojo sobre la base (exit 1, 21 pasan, fallan las vistas previas desde hijo y botón y falta el aviso sin imagen) y verde tras corregir (exit 0, 24 pasan). Typecheck y ESLint dirigido: exit 0.

| Causa o evidencia | Ajuste | Comprobación |
|---|---|---|
| Recortes de Windows sobre el PNG ficticio con ayuda del dueño, Chrome 157.0.8103.79. Con Ctrl+V, tanto `files` como `items (kind=file)` entregaron `image/png`, 28.349 bytes. En base, foco en Elegir imagen (`target=BUTTON`) o clic en el texto dentro de la caja (`focus=DIV[role=group], target=P`): sin vista previa. | Escucha acotada al diálogo, excluye edición; resuelve imagen por archivo o elemento y normaliza nombres sin extensión. Reutiliza validación y descarte. | Mismo recorte con clic en la caja y tras recuperar el foco de Elegir imagen: vista previa decodificada de 450 × 202 en ambos intentos; sin POST. |
| El texto de ayuda era seleccionable y no desaparecía al elegir la captura. | Indicación vacía no seleccionable, nombre accesible y ayuda separada. La vista previa ocupa la caja y conserva foco visible. | Cotejo con frontend-design y referencia Imagen sobre diálogo real: escritorio 400 × 768 y móvil emulado 375 × 812, vacíos y con vista previa, una columna sin desborde; botón de 44/48 px. El móvil no enfoca al abrir. |
| Primera corrida E2E (exit 1) canceló la transferencia del contexto del cliente antes de arrancar el stack; el perfil aislado de Chrome todavía estaba debajo de `client/`. | Cerrar ese Chrome y mover la fixture fuera del contexto del cliente. | Repetición dirigida verde y cleanup verificado. |

[PR76](https://github.com/MatiasNicolasAcevedo/devnotes/pull/76) contra `main` en `b6728d0669008e550fada544f474c7ac8315e1d6`. SHA de las fuentes probadas: `2ebaac0a1f1dd7a70db4a6baf90b0061330af2be`; el cierre posterior cambia solo documentación.

- `STARTER_E2E_PROJECT=starter-e2e-t073-ocr-paste bash scripts/e2e.sh --grep 'screenshot OCR:' --project desktop`: exit 0, 1 caso, 0 fallos. Chromium verificó que arrastrar sobre la indicación no selecciona texto y que el PNG sin extensión pegado desde Elegir imagen reemplaza la indicación sin POST. La extracción y la copia editada pasan por el proxy, API propia, PostgreSQL 18 y sesión OIDC local con doble externo OCR; se conserva el caso 429. Saneado aprobado; inventario por label (0): 0 contenedores, redes y volúmenes.
- `node scripts/docs-check.mjs` y `git diff --check`: exit 0. `bash scripts/verify.sh --policy origin/main`: exit 0, perfil `APPLICATION`, política informativa `FULL` (4 rutas técnicas).
- Pendiente: revisión independiente del HEAD publicado y squash solo con las condiciones de AUTONOMY, incluido `verify-required` verde sobre el HEAD aprobado. T-074 sigue en `draft` hasta consultar y confirmar `MERGED`. Render Auto-Deploy On Commit permanece vigente.

FULL/STARTER: DIFERIDO POR EL DUEÑO.
