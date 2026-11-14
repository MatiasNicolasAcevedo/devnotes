---
id: T-069
status: draft
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

Draft por dependencia T-068. El recorrido mantiene el borrador en el editor y define la extracción y la copia como acciones deliberadas. Las pruebas de navegador, precisión real y Render siguen sus tareas o permisos propios.

## Cierre y siguiente tarea

Tras MERGED confirmado, habilita [T-070](T-070-ocr-journey.md).
