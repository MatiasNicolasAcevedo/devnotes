---
id: T-057
status: in_review
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-056]
branch: codex/t-057-space-storage
role: implementer
executor: frontier
pr: 60
---

# T-057 · Migración de datos a Trabajo y enum de espacio

## Objetivo

Conservar todos los registros existentes en Trabajo y permitir igual fecha en dos espacios sin duplicados dentro de uno.

[T-056 MERGED y conciliada](T-056-service-activity-journey.md#conciliación). Contrato completo en S-109. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

Migración V7 o siguiente libre, enum PrivateSpace, columnas/checks/índices en diario/ref/voz. Versiones heredan de nota. Constructores/código existente usan Trabajo hasta tareas de API; sin UI Personal ni migración real.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`db/migration/V7__add_private_spaces.sql`; nuevo `shared/space/PrivateSpace.java` y parser estricto; entidades `DailyNote`, `ReferenceItem`, `VoiceNote`; `PrivateSpaceTest` y `PrivateSpaceMigrationIT`.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Migrar esquema V6 ficticio de cuatro colecciones conservando IDs, contenido, timestamps/revisiones; work. Dos espacios misma fecha pasan; duplicado misma cuenta/espacio/fecha y enum desconocido fallan; FK/UNIQUE de versiones intactos.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=PrivateSpaceTest -Dit.test=PrivateSpaceMigrationIT,DailyNoteRepositoryIT -Djacoco.skip=true
```

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

**2026-11-13 · Frontera en rol implementer**, Codex de escritorio, PowerShell, Git Bash, Git, `gh`, Docker Linux, Java 21 y Node 24.21.0. Variante del modelo y esfuerzo sin verificar. Alcance de datos y comportamiento: migración a Trabajo, unicidad diaria por espacio y soporte de persistencia para los dos valores. La API, autorización de cuenta y UI conservan el contrato vigente en esta etapa.

`git ls-remote origin refs/heads/main refs/heads/codex/t-057-space-storage` confirmó `main` en `ac48bdef2d976dc045446556b553e7f7ca41430a`, sin rama publicada de T-057. `git fetch --no-tags origin refs/heads/main:refs/remotes/origin/main` actualizó la base y `gh pr list --state open` devolvió cero PR abiertos. Worktree aislado `.orchestrator/t-057/`, checkout principal y `trailer/` preservados.

Conciliación en `133feff83312ba8adeca950a46d84b20bbf8392a`. Antes de V7, desde `server/`, `./mvnw -q test-compile dependency:properties failsafe:integration-test failsafe:verify -Dit.test=PrivateSpaceMigrationIT -Djacoco.skip=true` → exit 1. El único caso cargó las cuatro colecciones ficticias en PostgreSQL 18.6 desde V6 y falló en el paso de upgrade con `No migration with a target version 7 could be found`. Se confirmó la salida de PostgreSQL y Ryuk por ID.

`./mvnw -q verify -Dtest=PrivateSpaceTest -Dit.test=PrivateSpaceMigrationIT,DailyNoteRepositoryIT -Djacoco.skip=true` → exit 0, 10/10 unitarios, 1/1 migración y 12/12 repositorio, sin omitidos. PostgreSQL 18.6 efímero y Spotless OK. Se verificaron los dos espacios para la misma fecha, los rechazos de duplicados, los valores estrictos, la integridad de versiones y la lectura/escritura JPA. Se confirmó la salida de los dos PostgreSQL y Ryuk por ID exacto.

`./mvnw -q verify -Dtest=PrivateSpaceTest -Dit.test=ReferenceItemMigrationIT,ReferenceItemRepositoryIT,VoiceNoteServiceIT,PortabilityImportServiceIT -Djacoco.skip=true` → exit 0, 10/10 unitarios repetidos y 43/43 IT adicionales (1 migración histórica, 6 repositorio de referencias, 24 servicio de voz, 12 importación), sin omitidos. La migración histórica probó esquema vacío y upgrade de V1 poblado a V7. Cleanup de la corrida adicional por `org.testcontainers.sessionId=14205d4d-bd97-4378-af0e-dab8b16ea33c`: 0 contenedores, 0 redes y 0 volúmenes, con retiro de los cuatro PostgreSQL y Ryuk confirmado por ID. Salidas locales `migration-red.log`, `backend-directed.log` y `backend-compat.log` en `.orchestrator/t-057-logs/`; reportes Maven en `server/target/`.

### Decisiones de compatibilidad y correcciones

| Problema o condición | Arreglo | Prueba |
|---|---|---|
| V6 conserva la unicidad diaria por cuenta y fecha | V7 la cambia a cuenta, espacio y fecha. Añade índices con espacio y conserva los índices previos de referencias y voz para las consultas vigentes por propietario | `PrivateSpaceMigrationIT` rojo previo sin V7 y verde con V7 |
| La regresión histórica fijaba V6 como última versión | Actualizar las aserciones de la secuencia y del destino a V7 y conservar la comprobación del checksum de V1 | `ReferenceItemMigrationIT` verde en la corrida adicional |

**FULL/STARTER DIFERIDO POR EL DUEÑO.** Render pendiente de autorización expresa sobre SHA y ventana.

### Entrega para revisión

[PR60](https://github.com/MatiasNicolasAcevedo/devnotes/pull/60) contra `main`. Las fuentes de las pruebas corresponden al commit técnico `b76fef38e7190bb6c9e9d9ff0c4e836a52175d1e` sobre la base publicada `ac48bdef2d976dc045446556b553e7f7ca41430a`. `node scripts/docs-check.mjs`, `git diff --check` y `git diff --check origin/main...HEAD` → exit 0. `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → exit 0, `policy=FULL`, `profile=APPLICATION`, nueve rutas técnicas. El traspaso solo modifica Markdown. Consultar el HEAD vigente y su `verify-required` en PR60.

Control I5 al llegar a T-057: T-053…T-056 están conciliadas. T-057 tiene evidencia dirigida y queda pendiente de revisión independiente y merge. T-058 sigue condicionada por ese cierre. El integrado sigue diferido y el ensayo remoto de S-111 tiene autorización pendiente. Los checks dirigidos no detectaron hallazgos que cambien la cola.

## Cierre y siguiente tarea

Control de cinco tareas de I5: revisar dependencias, evidencia dirigida, integrado diferido y hallazgos en esta tarea; volver a frontera solo por decisión fuera del contrato. No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-058 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
