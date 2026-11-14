---
id: T-060
status: in_progress
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-059]
branch: codex/t-060-voice-spaces
role: implementer
executor: frontier
pr: null
---

# T-060 · Biblioteca de voz por espacio

## Objetivo

Guardar, editar y borrar transcripciones solo dentro del espacio elegido para la captura.

Dependencia satisfecha: [T-059 MERGED y conciliada](T-059-reference-spaces.md#conciliación). Contrato completo en S-109. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

Propagar space en CRUD/listado de texto/CAS. Capabilities/transcripción sin persistencia conservan contrato; no almacenar audio. Cliente fija destino en T-063. Bugs emojis/silencio no se mezclan con esta tarea.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`voice/web/VoiceNoteController.java`, `application/VoiceNoteService.java`, `persistence/VoiceNoteRepository.java`; `VoiceSpaceApiIT` y regresiones de voz.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Dos actores/espacios: texto, lista/conteo, GET/PUT/DELETE, 404 indistinguible y CAS. Omisión work, space inválido/repetido=400, 401/403; sin audio persistido ni requests a Groq.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=PrivateSpaceTest -Dit.test=VoiceSpaceApiIT,VoiceNoteApiIT,VoiceCapabilitiesApiIT -Djacoco.skip=true
```

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

**2026-11-13 · Frontera en rol implementer**, Codex de escritorio (GPT-6, variante y esfuerzo sin verificar), PowerShell, Git Bash, Git, `gh`, Node 24.21.0, Java 21 y Docker Linux. Impacto en API, permisos y datos: alta y acceso a texto de voz con propietario autenticado y espacio, persistencia en la columna de V7 y compatibilidad de Trabajo por omisión. Alcance de backend.

HEAD/base `c6d48310387f1e6d509f83ec14c33f736c23ba39` en `.orchestrator/t-060/`. `gh pr view 62` y `git ls-remote` confirmaron la [conciliación de T-059](T-059-reference-spaces.md#conciliación). Sin otros PR abiertos contra `main` ni rama de T-060 publicada al inicio.

Rojo sobre las fuentes de `c6d4831` con `VoiceSpaceApiIT` agregado. Desde `server/` en Git Bash, `./mvnw -o -B -q verify -Dtest=PrivateSpaceTest -Dit.test=VoiceSpaceApiIT -Djacoco.skip=true` → exit 1. Surefire 10/10 y cinco fallos esperados de Failsafe sobre PostgreSQL 18.6: acceso cruzado, dos conteos mezclados, espacio inválido y `Location` sin contexto. Retiro de PostgreSQL y Ryuk confirmado por ID. Log local `.orchestrator/t-060-logs/backend-red.log`.

Verde sobre las fuentes de T-060, base publicada `c6d48310387f1e6d509f83ec14c33f736c23ba39`. Desde `server/` en Git Bash, `./mvnw -o -B -q spotless:apply` y `./mvnw -o -B -q verify -Dtest=PrivateSpaceTest,VoiceNoteServiceTest -Dit.test=VoiceSpaceApiIT,VoiceNoteApiIT,VoiceCapabilitiesApiIT,VoiceNoteServiceIT,VoiceTranscriptionApiIT -Djacoco.skip=true` → exit 0, Spotless OK. Surefire 12/12 (10 enum y 2 servicio), Failsafe 58/58 (5 API espacios, 12 API voz, 5 capabilities, 27 servicio/repositorio y 9 transcripción), sin omitidos. Flyway identificó PostgreSQL 18.6 en los cinco contextos. Log local `.orchestrator/t-060-logs/backend-directed.log` y reportes Maven en `server/target/`.

Dos cuentas ficticias con OIDC local, espacios independientes, listados y conteos filtrados antes de paginar, y 404 equivalentes para ID ajeno, fuera del espacio o inexistente. Negativos de espacio inválido/repetido en los cinco métodos, 401 sin sesión y 403 de CSRF. El CAS cubre revisión vigente, obsoleta y tope fuera de ámbito, escritura cruzada directa en el repositorio y carreras actualización/actualización y actualización/borrado con un ganador en cada espacio. El POST en Personal devuelve una `Location` relativa con `?space=personal` y Trabajo conserva la ruta anterior. La regresión de transcripción usa WebM ficticio y un proveedor HTTP local, verifica texto sin persistencia en `voice_note` y que capabilities no consulta al proveedor. Se comprobó el retiro por ID de los PostgreSQL y Ryuk de ambas corridas. El filtro exacto `com.docker.compose.project=starter-e2e-t-060` no devolvió contenedores, redes ni volúmenes.

**FULL/STARTER DIFERIDO POR EL DUEÑO.** El ensayo de Render requiere autorización expresa sobre SHA y ventana.

### Correcciones significativas

| Problema o condición | Arreglo | Prueba |
|---|---|---|
| El CRUD ignoraba `space`, la entidad fijaba Trabajo y las consultas se acotaban solo por propietario | Parser compartido, persistencia explícita y filtro por propietario y espacio en listado, conteo, detalle y CAS | Cinco casos de `VoiceSpaceApiIT` en rojo sobre `c6d4831` y 58 IT verdes |
| El PUT con la revisión tope devolvía 409 antes de verificar el ámbito del ID | Comprobación acotada al mismo propietario y espacio antes de resolver el conflicto por revisión tope | Negativos de CAS con revisión tope y regresión 409 para nota propia |

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-061 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
