---
id: T-073
status: draft
priority: P1
size: S
milestone: M6
spec: S-112
depends_on: [T-071, T-092]
branch: codex/t-073-ocr-windows-paste-fix
role: implementer
executor: frontier
pr: null
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
| Extraer y copiar siguen funcionando por la API propia. | Desde raíz con Git Bash, stack efímero propio y doble externo: `STARTER_E2E_PROJECT=starter-e2e-t073-ocr-paste bash scripts/e2e.sh --grep 'screenshot OCR:' --project=desktop`. Verificar cleanup por label. |

Gate dirigido según [TESTING](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), con docs-check y diff-check. Ver el [diseño de Imagen](../design/WRITING-WORKSPACES.md#imagen); validar primero el diálogo actual con su placeholder. Conservar STARTER de T-068 y el diferimiento separado de I5.

## Checkpoint vigente

2026-11-16. Frontera planner en Codex Desktop, GPT-6, PowerShell, Git/gh y Chromium headless. Variante y esfuerzo sin dato expuesto. Base remota `7aa8946e727cfadbd2552588eef31cbe07594f00` y sin PR abierto. Conciliación de T-071 en el checkout aislado de esta rama. Diagnóstico sin cambios de aplicación, API, permisos ni datos.

En Chromium 157, reproduje el manejador publicado con un evento sintético y el PNG ficticio de terminal. Seleccionó imagen cuando el evento apuntó al grupo. Ignoró el mismo evento cuando apuntó al texto hijo, al botón de selector o al campo de resultado. El último caso debe seguir sin capturar imagen. El código vincula `onPaste` solo al grupo y exige identidad entre destino y grupo. La prueba E2E publicada construye `DataTransfer` y dispara el evento directamente sobre el grupo. El síntoma del dueño concuerda con el carácter silencioso de esos caminos. Falta medir el foco y la representación del portapapeles en Recortes real.

El dueño mostró que «Pegá una captura (Ctrl+V)» y el límite de archivo son texto seleccionable dentro de la caja. En el código, ambos son nodos de texto renderizados por `Typography`. Pidió el estado vacío descrito en S-112 tanto para este diálogo como para Imagen.

La primera implementación espera [T-092](T-092-writing-workspaces-plan.md) MERGED. La fuente original de esta planificación es el checkout local con 2a2fc56 y cuatro archivos modificados. Reproducir en la revisión actual de main con evidencia Windows antes de corregir.
