---
id: T-059
status: in_progress
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-058]
branch: codex/t-059-reference-spaces
role: implementer
executor: frontier
pr: null
---

# T-059 · Referencias y búsqueda dentro del espacio

## Objetivo

Crear y consultar referencias en Trabajo o Personal sin filtrar IDs, títulos ni conteos de otro contexto.

Dependencia satisfecha: [T-058 MERGED y conciliada](T-058-daily-spaces.md#conciliación). Contrato completo en S-109. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

space en colección/detalle/POST/PUT/DELETE; owner+space en SQL antes de paginar. Preservar q literal, límites, orden y DTO. ID de otro espacio=404 igual que ajeno/inexistente. Conservar regla S-106 de átomos ausentes.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`reference/web/ReferenceItemController.java`, `application/ReferenceItemService.java`, `persistence/ReferenceItemRepository.java`; `ReferenceSpaceApiIT` y `ReferenceItemRepositoryIT`.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Título igual en dos espacios; q/contadores solo activo; IDs adivinados no leen/editan/borran otro. `%`/`_` literales, default work, space inválido/repetido, CSRF y dos cuentas.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=PrivateSpaceTest -Dit.test=ReferenceSpaceApiIT,ReferenceItemIT,ReferenceItemRepositoryIT -Djacoco.skip=true
```

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

**2026-11-13 · Frontera en rol implementer**, Codex de escritorio (GPT-6, variante y esfuerzo sin verificar), PowerShell, Git Bash, Git, `gh`, Node 24.21.0, Java 21 y Docker Linux. Impacto en API, permisos y datos: referencias acotadas al propietario autenticado y al espacio elegido, persistencia en la columna de V7 y compatibilidad previa por omisión de `space`. Alcance de backend.

`gh pr view 61` y `git ls-remote` confirmaron la [conciliación de T-058](T-058-daily-spaces.md#conciliación). HEAD/base `1b445e954adac4f84e01688ad2fd281e82131214` en el worktree aislado `.orchestrator/t-059/`. Sin PR abiertos ni rama T-059 publicada al inicio.

Rojo sobre las fuentes de `1b445e9` con `ReferenceSpaceApiIT` agregado. Desde `server/` en Git Bash, `./mvnw -o -B -q verify -Dtest=PrivateSpaceTest -Dit.test=ReferenceSpaceApiIT -Djacoco.skip=true` → exit 1. Failsafe ejecutó cuatro casos en PostgreSQL 18.6. Fallaron lectura cruzada (200 en vez de 404), validación (200 en vez de 400), conteo de Personal (4 en vez de 3) y compatibilidad por omisión (1 en vez de 0 para una cuenta con una sola referencia creada en Personal). Se comprobó retiro de PostgreSQL y Ryuk por los IDs exactos de la corrida. Log local `.orchestrator/t-059-logs/backend-red.log`.

Verde sobre las fuentes de implementación de `codex/t-059-reference-spaces`, base `1b445e954adac4f84e01688ad2fd281e82131214`. Desde `server/` en Git Bash, `./mvnw -o -B -q spotless:apply` y `./mvnw -o -B -q verify -Dtest=PrivateSpaceTest,ReferenceItemServiceTest,ReferenceItemControllerTest -Dit.test=ReferenceSpaceApiIT,ReferenceItemIT,ReferenceItemRepositoryIT,DailyNoteApiIT#acceptsNoteWithReferenceAtom,DailyVersionApiIT#versionPreservesReferenceAtom -Djacoco.skip=true` → exit 0, Spotless OK. Surefire 28/28 (10 enum, 12 servicio, 6 MVC) y Failsafe 28/28 (4 API espacios, 15 API referencias, 7 repositorio, 2 regresiones de átomos en diario y versiones), sin omitidos, con PostgreSQL 18.6. Dos identidades y dos espacios, lecturas y escrituras acotadas, páginas y conteos con señuelos, búsqueda literal, 404 equivalente a ID inexistente, 400 sin mutación, 401 y 403 de CSRF ausente o incorrecto. Se verificó el retiro de cinco PostgreSQL y Ryuk por ID y etiqueta, y la ausencia de recursos con etiqueta `com.docker.compose.project=starter-e2e-t-059`. Log local `.orchestrator/t-059-logs/backend-directed.log` y reportes Maven en `server/target/`.

El POST de Personal devuelve una `Location` relativa con `?space=personal` para poder abrir el recurso creado. Trabajo conserva la ruta relativa previa. Los DTO y los límites existentes se conservan.

**FULL/STARTER DIFERIDO POR EL DUEÑO.** El ensayo de Render requiere autorización expresa sobre SHA y ventana.

### Correcciones significativas

| Problema o condición | Arreglo | Prueba |
|---|---|---|
| El controller ignoraba `space`, la entidad fijaba Trabajo y las consultas de referencias se acotaban solo por dueño | Parser compartido, espacio explícito al crear y ámbito dueño+espacio en el SQL de listados, conteos, detalle, actualización y borrado | Cuatro casos de `ReferenceSpaceApiIT` en rojo sobre `1b445e9` y luego 28 IT verdes, incluidos negativos directos de escritura en el repositorio |

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-060 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
