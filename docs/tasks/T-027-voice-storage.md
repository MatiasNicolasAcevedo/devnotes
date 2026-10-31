---
id: T-027
status: in_progress
priority: P1
size: M
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-027-voice-storage
pr: 31
depends_on: [T-017]
---
# T-027 · Persistencia privada y CAS de notas de voz

## Objetivo

Persistencia privada y CAS de notas de voz, dentro de S-105/M2-RC1. Contrato completo; draft **solo por dependencia T-017 no MERGED/conciliada**. Junie puede habilitar ready al comprobarla sin otra planificación. Siguiente: T-028 tras MERGED. Retorno a frontera al objetivo M2-RC1 o decisión fuera de contrato, no por cada tarea.

## Alcance y decisiones resueltas

Crear V5/voice_note y servicio transaccional propio según S-105: texto normalizado/validado, varias notas del mismo día, UUIDv7/Clock UTC, paginación/conteo por owner, CAS de update/delete y errores404/409 diferenciados solo por existencia propia. Sin HTTP ni llamadas externas; no tocar daily/reference ni migraciones aplicadas.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [TESTING](../TESTING.md).
4. [Implementer](../agents/implementer.md).
5. [Arquitectura](../ARCHITECTURE.md).

AGENTS raíz, STATUS y protocolo del rol son entrada común; no recorrer docs por rutina.

## Archivos y pasos

Rutas nuevas de backend bajo server/src/main/java/com/example/devnotes/ y sus tests bajo server/src/test/java/com/example/devnotes/; frontend bajo client/src/. server/src/main/resources/db/migration/V5__create_voice_note.sql; voice/persistence/VoiceNote.java y VoiceNoteRepository.java; voice/application/VoiceNoteService.java (records de entrada/vista/página y excepciones específicas anidadas si evitan archivos vacíos); voice/domain/VoiceText.java. Tests VoiceTextTest y VoiceNoteServiceIT.

1. Implementar validación de texto como valor independiente y defensas DB; demostrar límites UTF-16/Unicode/CRLF, blanco, NUL y pares inválidos.
2. Crear consultas ordenadas, offset long, extracto sin cortar pares y timestamps inmutables; toda consulta/conteo por propietario.
3. Implementar CAS atómico y pruebas de carreras reales update/update y update/delete con dos transacciones, revisión obsoleta/tope y dueño ajeno.

## Aceptación y pruebas

PostgreSQL 18 real/Testcontainers: dos notas mismo dueño/día, dos dueños sin fuga por ID/conteo, paginación/orden desempate, migración/constraints y ausencia de relación daily. CAS pierde con409 sin sobrescribir; inexistente/ajena404; rollback conserva datos. Tests de texto prueban50000 y50001 UTF-16, emoji, CRLF, blancos Unicode y preservación exacta.

- Iteración desde server/, Git Bash/JDK21 y Docker: `./mvnw -Dtest=VoiceTextTest -Dsurefire.failIfNoSpecifiedTests=false -Dit.test=VoiceNoteServiceIT clean verify`. Son nombres de pruebas que esta tarea debe crear/conservar; **no** evidencia de ejecución actual. Backend clean verify incluye IT PostgreSQL/Failsafe/JaCoCo; test solo no los acredita.
- Gate esperado **APPLICATION** desde raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t027 STARTER_E2E_PROJECT=starter-e2e-t027 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. El diff completo manda: si incorpora configuración/tooling/dependencias, STARTER según TESTING. FULL una vez al cierre de fuentes; dirigidos durante iteración, sin rebajar suites/umbrales/retries/deadlines.
- Antes de operación larga: namespaces libres, SHA/base, huellas antes/después, comando/log saneado, recursos y cleanup exacto en checkpoint. No tocar starter-dev-local-nginx, volúmenes ajenos ni secretos; PowerShell usa el verificador canónico de SETUP con PATH Node/exit preservados.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` y revisar también diff sin commit. Markdown de cierre conserva gate si base/fuentes coinciden.

## Checkpoint vigente

2026-10-31: PR31 publicado (6de2a75). Base main 6e7ebd0. clean verify 190/190 OK, Spotless OK, JaCoCo OK. Modelo Qwen3.6-27B-FP8, Junie implementer. Pendiente: revisión independiente y gate APPLICATION completo.

## Correcciones significativas

Sin correcciones de implementación. Registrar aquí únicamente problema/causa, arreglo y prueba/SHA cuando ocurran.

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-028 tras MERGED; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
