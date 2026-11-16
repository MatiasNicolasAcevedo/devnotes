---
id: T-070
status: in_progress
priority: P1
size: S
milestone: M6
spec: S-112
depends_on: [T-069]
branch: codex/t-070-ocr-journey
role: implementer
executor: frontier
pr: null
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

Ejecutar en serie. Si un namespace está ocupado, elegir otro propio. Aplicar [TESTING](../TESTING.md#regla-general-fuera-de-la-excepción) y las instrucciones vigentes del dueño al cierre. Antes de operaciones largas guardar checkpoint con SHA/base, namespaces, logs y cleanup. Esta tarea usa el doble y no requiere una clave del dueño.

## Checkpoint vigente

2026-11-16 (Buenos Aires). Frontera implementer en Codex Desktop, GPT-6 con variante y esfuerzo sin dato expuesto, PowerShell, Git/gh, Node 24.21.0, Git Bash y Docker Desktop Linux. [T-069 conciliada](T-069-ocr-workspace.md#conciliación). Base remota verificada `4f212efd4fe295290ddefb785b8d8edaf0b2b5ae`. El cambio cubre el transporte OCR del perfil E2E y el recorrido de navegador. Conserva la API, permisos, persistencia y UI de aplicación de T-068/T-069. Las capturas y el texto son ficticios. Pruebas pendientes de implementación. El teclado físico y zoom nativo siguen pendientes.

## Cierre y siguiente tarea

Tras MERGED, declarar el recorrido con doble acreditado y pasar a [T-071](T-071-ocr-first-real-test.md). Actualizar STATUS para avisar al dueño en cuanto la prueba de precisión dependa de su autorización y configuración privada.
