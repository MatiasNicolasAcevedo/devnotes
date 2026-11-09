---
id: T-034
status: ready
priority: P1
size: M
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-034-voice-workspace
pr: null
depends_on: [T-033]
---
# T-034 · Grabar, editar, copiar y guardar una nota nueva

## Objetivo

Grabar, editar, copiar y guardar una nota nueva, dentro de S-105/M2-RC1. Contrato completo; draft **solo por dependencia T-033 no MERGED/conciliada**. Junie puede habilitar ready al comprobarla sin otra planificación. Siguiente: T-035 tras MERGED. Retorno a frontera al objetivo M2-RC1 o decisión fuera de contrato, no por cada tarea.

## Alcance y decisiones resueltas

Ruta /voice y enlace Voz, composer accesible de nueva nota con captura→transcripción→edición→copia/guardado manual. Componer hooks T-032/T-033 y formulario RHF/Zod. Colección en T-035 y guardia global de navegación en T-036; no presentar esta entrega parcial como M2 completa.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [TESTING](../TESTING.md).
4. [Implementer](../agents/implementer.md).
5. [Arquitectura frontend](../ARCHITECTURE.md).

AGENTS raíz, STATUS y protocolo del rol son entrada común; no recorrer docs por rutina.

## Archivos y pasos

Rutas nuevas de backend bajo server/src/main/java/com/example/devnotes/ y sus tests bajo server/src/test/java/com/example/devnotes/; frontend bajo client/src/. features/voice/VoicePage.tsx, VoiceComposer.tsx, useVoiceDraft.ts y VoiceComposer.test.tsx; app/AppRoutes.tsx y AppShell.tsx. Tests de rutas existentes si cambian. Separar máximo estos tres módulos de producción de feature; no añadir un segundo store del servidor.

1. Integrar capacidades/permisos y estado rojo+texto/foco/counter; aviso Groq antes de grabar. Permitir texto manual apagado y grabación solo en nuevo vacío.
2. Componer stop/transcribe/cancel/retry y generación de respuestas; conservar blob de error solo en memoria y borrador ante error de guardar.
3. Copiar exactamente texto actual (ACK Clipboard API), guardar tras validación/ACK y creación incierta tras respuesta perdida. UI375/1280 con labels y errores de campo.

## Aceptación y pruebas

Flujo de nota nueva completo sin guardado implícito, borrar palabras/copiar valor actual y fallo clipboard visible. Detener libera micrófono antes de enviar; rojo solo en recording. Doble guardar/captura bloqueados. 429 con espera/manual retry; timeout/no configured/error manteniendo estado correcto; respuesta tardía no pisa texto/nueva generación/otro owner. Caracteres/saltos/reglas idénticas al backend. Sin texto/audio en storage ni claves en UI.

- Iteración desde client/, Node 24/npm del lock: `npm test -- --run src/features/voice/VoiceComposer.test.tsx src/app/AppRoutes.test.tsx`. Son nombres de pruebas que esta tarea debe crear/conservar; **no** evidencia de ejecución actual. Backend clean verify incluye IT PostgreSQL/Failsafe/JaCoCo; test solo no los acredita.
- Gate esperado **APPLICATION** desde raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t034 STARTER_E2E_PROJECT=starter-e2e-t034 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. El diff completo manda: si incorpora configuración/tooling/dependencias, STARTER según TESTING. FULL una vez al cierre de fuentes; dirigidos durante iteración, sin rebajar suites/umbrales/retries/deadlines.
- Antes de operación larga: namespaces libres, SHA/base, huellas antes/después, comando/log saneado, recursos y cleanup exacto en checkpoint. No tocar starter-dev-local-nginx, volúmenes ajenos ni secretos; PowerShell usa el verificador canónico de SETUP con PATH Node/exit preservados.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` y revisar también diff sin commit. Markdown de cierre conserva gate si base/fuentes coinciden.

## Checkpoint vigente

2026-10-31: contrato de frontera preparado en T-017 sobre main 0d976dc2187cb2a07061c3db48130c334b1e471b. Sin implementación, PR, migración aplicada ni tests de esta tarea ejecutados. Rol/modelo/herramienta/esfuerzo del ejecutor se registran al tomarla; no heredar capacidades Junie de frontera.

## Correcciones significativas

Sin correcciones de implementación. Registrar aquí únicamente problema/causa, arreglo y prueba/SHA cuando ocurran.

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-035 tras MERGED; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
