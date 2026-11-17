---
id: T-073
status: ready
priority: P1
size: S
milestone: M6
spec: S-112
depends_on: [T-071]
branch: codex/t-073-ocr-windows-paste
role: implementer
executor: frontier
pr: null
---

# T-073 · Pegar recortes de Windows en OCR

## Objetivo

Al volver al navegador tras usar Recortes de Windows, pegar una captura ficticia con `Ctrl+V` y ver la previsualización. Ante un problema de portapapeles, informar cómo continuar en la misma pantalla.

## Alcance

- Mantener el primer acceso desde Notas durante esta corrección. Aplicar el pegado dentro de la superficie OCR aunque el foco esté en un control no editable de esa superficie. Conservar el pegado normal en el campo de resultado y fuera de OCR. Reducir ambigüedad con foco visible en la caja al abrir en escritorio y al pulsarla.
- Resolver imagen desde `clipboardData.files` o `clipboardData.items` de tipo archivo. Aceptar el MIME PNG/JPEG expuesto por el navegador y dar nombre local neutro si el elemento de portapapeles llega sin extensión. Usar la validación de tamaño, vista previa y confirmación de reemplazo existentes. Mantener validación del selector y validación de bytes en backend. Mostrar un mensaje ante texto, formato incompatible, portapapeles sin imagen o límite excedido. La selección previa se conserva ante error.
- Probar primero un recorte auténtico de una ventana ficticia en Windows para observar foco y tipos, sin copiar contenido personal ni registrar cuerpos. Si el navegador no entrega PNG/JPEG, conservar esa evidencia y orientar al selector. Probar por separado cambiar de foco y volver desde Recortes. Solo **Extraer texto** envía imagen y conserva el aviso.

## Leer antes

[Observación de T-071](T-071-ocr-first-real-test.md#conciliación-y-observación-posterior-en-render) · [S-112](../specs/S-112-screenshot-ocr.md#seguimiento--imagen-como-destino-principal) · [OcrDialog](../../client/src/features/ocr/OcrDialog.tsx) · [Prueba Chromium](../../e2e/tests/ocr.spec.ts) · [Recortes de Windows](https://support.microsoft.com/en-us/windows/apps/use-snipping-tool-to-capture-screenshots).

## Aceptación y pruebas

| Criterio | Verificación |
|---|---|
| Imagen válida pegada desde zona, hijo o control no editable de OCR da vista previa. Elementos del portapapeles sin extensión funcionan. | Rojo antes de corregir y verde con `npm test -- --run src/features/ocr/OcrDialog.test.tsx` desde `client/`. |
| Pegar texto en el resultado funciona normalmente, imagen inválida deja visible el motivo y preserva la selección, pegar fuera de OCR queda intacto y pegar nunca llama al proveedor. | Negativos en la misma prueba de componente. Conservar la prueba de elección de archivo. |
| Chrome o Brave en Windows muestra un recorte real del portapapeles. | Recorte rectangular de texto ficticio con PrtSc si abre Recortes, o Win+Shift+S. Probar con clic en la caja y tras recuperar foco. Basta vista previa, sin POST. Registrar navegador, tamaños, foco y tipos solamente. Un evento sintético no sustituye este paso. |
| Extraer y copiar siguen funcionando por la API propia. | Desde raíz con Git Bash, stack efímero propio y doble externo: `STARTER_E2E_PROJECT=starter-e2e-t073-ocr-paste bash scripts/e2e.sh --grep 'screenshot OCR:' --project=desktop`. Verificar cleanup por label. |

Gate de cierre según [TESTING](../TESTING.md). Si el diff se limita a código de aplicación y Markdown, usar FULL de aplicación con `bash scripts/verify.sh` desde un checkout limpio, fixtures, namespaces propios y checkpoint previo. Conservar STARTER de T-068 y el gate acumulado de I5 diferido.

## Checkpoint vigente

2026-11-16. Frontera planner en Codex Desktop, GPT-6, PowerShell, Git/gh y Chromium headless. Variante y esfuerzo sin dato expuesto. Base remota `7aa8946e727cfadbd2552588eef31cbe07594f00` y sin PR abierto. Conciliación de T-071 en el checkout aislado de esta rama. Diagnóstico sin cambios de aplicación, API, permisos ni datos.

En Chromium 157, reproduje el manejador publicado con un evento sintético y el PNG ficticio de terminal. Seleccionó imagen cuando el evento apuntó al grupo. Ignoró el mismo evento cuando apuntó al texto hijo, al botón de selector o al campo de resultado. El último caso debe seguir sin capturar imagen. El código vincula `onPaste` solo al grupo y exige identidad entre destino y grupo. La prueba E2E publicada construye `DataTransfer` y dispara el evento directamente sobre el grupo. El síntoma del dueño concuerda con el carácter silencioso de esos caminos. Falta medir el foco y la representación del portapapeles en Recortes real.

Sigue una sesión implementer de T-073. [T-074](T-074-image-navigation.md) espera este MERGED.
