---
id: T-069
status: in_progress
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-068]
branch: codex/t-069-ocr-workspace
role: implementer
executor: frontier
pr: null
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

## Verificación dirigida

- Los seis archivos indicados en el contrato dieron 90/90, incluido el POST explícito con CSRF, cancelación/validación, aborto y descarte al cambiar de imagen, fecha, espacio o cuenta, cierre de sesión, cuota, timeout, edición y portapapeles. `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build` salieron 0. El build avisó por tamaño del chunk principal. Log de Vitest en `.orchestrator/t069-directed.log`.
- Chromium con una captura y resultado ficticios en un render local aislado. El selector nativo entregó el PNG completo y el ensayo de disposición hizo cero peticiones a la API. Escritorio 400/480/640 en una columna y 1280 en dos, con 496 px útiles de texto. Táctil 360/375/390 y horizontal 640×280 en pantalla completa, con campo de 16 px, controles de 48 px y sin desborde horizontal. A 1280 se conservaron nodo editable, borrador, posición del cursor y undo, con foco de vuelta en Herramientas. Script y registro en `.orchestrator/t069-layout.mjs` y `.orchestrator/t069-layout.log`. El recorrido con backend real corresponde a T-070.

## Correcciones de implementación

| Problema y causa | Arreglo y evidencia |
|---|---|
| El diálogo incluía «Cerrar» en el nombre accesible porque el botón estaba dentro del título. | El cierre queda junto al encabezado, con nombre propio. Vitest encuentra el diálogo por su título y comprueba el retorno de foco a Herramientas. |
| El tope de ancho predeterminado de MUI dejaba 32 px de margen a cada lado en escritorio angosto. El evento nativo `cancel` del selector tampoco llegaba al manejador React del input. | El papel usa el ancho previsto con margen de 12 px y se escucha `cancel` en el input. Chromium midió 376 px de diálogo a 400 px de ventana. Vitest comprueba el aviso y que se conserva la captura anterior. |

## Cierre y siguiente tarea

Tras MERGED confirmado, habilita [T-070](T-070-ocr-journey.md).
