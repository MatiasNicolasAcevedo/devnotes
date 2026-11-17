---
id: T-074
status: draft
priority: P1
size: S
milestone: M6
spec: S-112
depends_on: [T-073]
branch: codex/t-074-image-navigation
role: implementer
executor: frontier
pr: null
---

# T-074 · Imagen en la navegación principal

## Objetivo

Entrar a **Imagen** directamente desde la barra, pegar o elegir y extraer texto sin abrir el editor de Notas.

## Alcance

- Ruta privada `/image` con el espacio de la navegación existente. Imagen entre Referencias e Historial en escritorio y móvil. En móvil, cinco celdas de igual ancho con icono y etiqueta, selección ámbar, 48 CSS px de alto y áreas seguras. Preservar orden de los otros destinos.
- Reusar la captura, previsualización, extracción y resultado editables de T-073. Caja con foco y `Ctrl+V`, **Pegar** por gesto explícito y **Elegir imagen**. Lectura de imágenes del portapapeles solo ante clic en **Pegar**. Si el navegador bloquea o carece de lectura directa, devolver foco a la caja y ofrecer el atajo o selector. Nunca leer el portapapeles al abrir o cambiar de espacio.
- Retirar OCR de Herramientas en Notas. Conservar los borradores de Notas y el espacio activo al pulsar Imagen. Al salir de Imagen o cambiar cuenta/espacio, invalidar resultados pendientes, liberar la captura y proteger la edición sin copiar según S-112. Cotejo lado a lado si hay ancho útil, una columna en ventana angosta y móvil. El estado no disponible sigue visible desde Imagen.

## Aceptación y pruebas

- Desde `client/`: `npm test -- --run src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx src/features/ocr/OcrDialog.test.tsx`. Adaptar las pruebas OCR a la pantalla nueva preservando regresiones. Cotejar orden, `aria-current`, espacio, salida con edición, permiso denegado de **Pegar** y navegación por teclado.
- Actualizar el caso OCR de E2E. Pasar `bash scripts/e2e.sh --grep 'screenshot OCR:' --project=desktop` y el mismo filtro con `--project=mobile` en proyectos efímeros distintos y con doble externo. Verificar Notas al salir, amplitud a 320/360/375/390 CSS px y 768 en escritorio, sin scroll horizontal. FULL de cierre según [TESTING](../TESTING.md).

## Checkpoint vigente

Draft por T-073. Boceto del 2026-11-16 verificado en Chromium 157, cinco destinos en una sola fila a 320, 360, 375 y 390 CSS px, con 64, 72, 75 y 78 CSS px por destino respectivamente y 48 CSS px de alto. «Referencias» se mantuvo en una línea y no hubo scroll horizontal. Cotejo de escritorio del boceto a 768 y 1280 CSS px. Es evidencia de diseño estático. Validar el shell real con selector de espacio, estado, cuenta, fuentes y áreas seguras antes del cierre.

La [biblioteca de Imagen](T-075-image-text-library.md) añade guardado y borrado más adelante.
