---
id: T-062
status: done
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-061]
branch: codex/t-062-xlsx-spaces-api
role: implementer
executor: frontier
pr: 65
---

# T-062 · Respaldo integral y restauración de ambos espacios

## Objetivo

Exportar/importar cuenta completa con Trabajo y Personal sin pérdidas ni mezclas parciales.

Dependencia cumplida: T-061 MERGED y [conciliada](T-061-xlsx-spaces-codec.md#conciliación) en el primer avance de esta rama. Contrato completo en S-109. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

SQL/proyecciones space, escrituras v2, asociaciones espacio+fecha. Cuenta vacía global bajo transacción; reforzar carreras con diario/ref/voz si hace falta. Preview versión real, counts y countsBySpace; import devuelve ambos conteos. Sin filtro de exportación por espacio.

Orden determinista del libro v2: referencias y voz por `createdAt` e `id` sin agrupar por espacio, como S-107; diarias y versiones por fecha y, dentro de una misma fecha, Trabajo antes que Personal.

### Decisión del dueño del 2026-11-13

Observación de la revisión R1 de PR64: la API guarda átomos `reference` que apuntan a una referencia de otro espacio de la misma cuenta (regla S-106), y el lector de T-061 rechazaba el libro v2 que los contenía, así que exportar una cuenta real podía producir un respaldo que su propio importador rechaza. Opciones presentadas: (a) el exportador neutraliza esos átomos; (b) el guardado de diarias y versiones los rechaza; (c) el lector los acepta y el importador no les reescribe el ID. **El dueño eligió (c), la recomendada.**

Consecuencias en esta tarea, ya incorporadas a [S-109](../specs/S-109-private-spaces.md#portabilidad-xlsx-v2):

- El lector v2 acepta un átomo a una referencia incluida de otro espacio y conserva el documento sin cambios. Las pruebas de rechazo de T-061 pasan a probar la aceptación.
- El importador reescribe un átomo solo si su referencia está incluida en el archivo y es del mismo espacio que la nota o versión. El átomo cruzado conserva su UUID original, como un huérfano, y la app lo muestra como «Referencia no disponible», igual que antes de exportar.
- El exportador no altera el contenido y el guardado de diarias y versiones no cambia.
- Prueba de cierre: cuenta con una nota y una versión de Personal que contienen un átomo a una referencia de Trabajo propia. Exportar e importar en una cuenta vacía da 201, el átomo conserva el UUID original y la referencia de Trabajo recreada tiene otro UUID, sin `IMPORT_INVALID_RECORD`.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`portability/persistence/PortabilityReadRepository.java`, `PortabilityWriteRepository.java`; servicios export/import, `PortabilityController.java`; `PortabilitySpacesApiIT` y regresiones.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Dos cuentas, v2 dos espacios misma fecha, IDs/refs correctos, v1 work; cuenta con solo Personal rechaza. Carrera import vs nota en cada espacio, dos imports, rollback total; sumas correctas; sin éxito falso ni filtro space. Export→import de un átomo de otro espacio según la decisión del dueño.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=XlsxSpacesRoundTripTest -Dit.test=PortabilitySpacesApiIT,PortabilityExportApiIT,PortabilityImportApiIT,PortabilityImportServiceIT -Djacoco.skip=true
```

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

2026-11-13 · Frontera en rol implementer, Claude Code de escritorio (Claude Opus 5.5, esfuerzo sin verificar), Git Bash, PowerShell, Git, `gh`, Node, Java 21 y Docker Linux. Worktree propio `.orchestrator/t-062` desde `main` `df2891c`; checkout principal y `trailer/` sin tocar. Precondición: `gh pr view 64` → MERGED, squash `df2891c`, mergedAt 2026-11-14T01:38:06Z, HEAD `b6f1251`.

Impacto:

- **Comportamiento:** la exportación lleva el espacio real de cada fila y la importación lo restaura; el átomo cruzado queda sin resolver, como antes de exportar.
- **API:** la vista previa devuelve la `version` real, y vista previa e importación 201 agregan `countsBySpace` como campo aditivo.
- **Datos:** las escrituras llevan `space` explícito, sin cambio de esquema ni migración.
- **Permisos:** sin cambios; el propietario sigue saliendo de la sesión.
- **UI:** sin cambios en esta tarea. El cliente valida `version: z.literal(1)`, así que Datos rechazará la vista previa de un libro v2 hasta [T-064](T-064-space-navigation.md), que ya lo tiene contratado. Es un paso intermedio: no desplegar.

Hecho: primer avance `5c008e7` (conciliación de T-061, decisión del dueño, retiro de BACKLOG) e implementación `390d8da`. El checkpoint documental de este cierre no cambia fuentes.

- `PortabilityReadRepository` proyecta `space` en las cuatro colecciones (las versiones toman el de su nota) y ordena diarias y versiones por fecha y luego Trabajo antes que Personal.
- `PortabilityWriteRepository` inserta `space` explícito, y `accountEmpty` sigue siendo global.
- `PortabilityImportService` asocia notas y versiones por espacio+fecha y reescribe los átomos solo dentro de su espacio. Devuelve `ImportResult` y `ImportPreview` con `version` y `SpaceCounts`.
- `PortabilityController` expone `version` real y `countsBySpace`.
- `XlsxWorkbookReader` deja de rechazar el átomo cruzado.

Pruebas, desde `server/` en Git Bash, con JDK 21.0.9 y Docker Linux 28.5.1. Logs locales fuera del repositorio.

- **Rojo,** con la forma nueva de la API pero el comportamiento previo: el comando del contrato con `-o -B` → exit 1. `XlsxSpacesRoundTripTest` tuvo 3 errores `IMPORT_INVALID_RECORD`. Repetido con `-Dmaven.test.failure.ignore=true` solo para registrar las IT: `PortabilityImportApiIT` 1 fallo, `PortabilityImportServiceIT` 4 fallos y 5 errores, y `PortabilitySpacesApiIT` 1 error. Este último es el caso de BACKLOG: el importador rechazaba la exportación de la propia cuenta.
- **Verde:** `./mvnw -o -B verify -Dtest=XlsxSpacesRoundTripTest -Dit.test=PortabilitySpacesApiIT,PortabilityExportApiIT,PortabilityImportApiIT,PortabilityImportServiceIT -Djacoco.skip=true` → exit 0. Spotless OK, Surefire 50/50 y Failsafe 43/43 (Export 8, Import 11, ImportService 21, Spaces 3), sin omitidos; Flyway identificó PostgreSQL 18.6.
- **Regresión:** `./mvnw -o -B verify '-Dtest=Xlsx*Test,PortabilityExportServiceTest' -Dit.test=OpenApiContractIT,ApiDocsEnabledIT -Djacoco.skip=true` → Surefire 242/242 y `ApiDocsEnabledIT` 7/7. `OpenApiContractIT` tuvo 1 fallo previo: se reprodujo igual en `main` `df2891c` dentro de un worktree temporal ya retirado, y quedó en BACKLOG.
- **Recursos:** solo contenedores efímeros de Testcontainers. No se tocaron otros contenedores ni el stack del dueño.

Casos cubiertos: dos cuentas; v2 con ambos espacios en la misma fecha; IDs y átomos por espacio; export→import con átomo cruzado (201, UUID original conservado, la referencia recreada tiene otro UUID y el GET del espacio equivocado da 404); v1 a Trabajo con Personal en cero; una cuenta con datos solo en Personal se rechaza sin escrituras; carrera de una nota en cada espacio antes y durante el bloqueo; dos imports simultáneos; rollback total; sumas por espacio iguales al total; sin filtro `space` en la exportación.

Cierre: `node scripts/docs-check.mjs` OK, `git diff --check` OK y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=APPLICATION`, 9 rutas técnicas. **FULL/STARTER DIFERIDO POR EL DUEÑO.**

Control de avance de I5 tras T-062: T-057…T-061 están `done` con su PR MERGED. La evidencia de cada tarea es dirigida, y el integrado FULL/E2E sigue diferido por el dueño. Ruta vigente sin cambios: T-063 y T-064 completan cliente y Datos. Hallazgos: la decisión del átomo cruzado (resuelta) y `OpenApiContractIT` (BACKLOG). No hace falta volver a frontera.

Pendiente: revisión independiente de [PR65](https://github.com/MatiasNicolasAcevedo/devnotes/pull/65) en otra sesión, con `verify-required` del HEAD vigente.

### Correcciones significativas

| Problema / causa | Arreglo | Prueba / SHA |
|---|---|---|
| El respaldo de una cuenta con un átomo de otro espacio lo rechazaba su propio importador (lector de T-061) | Decisión del dueño (c): el lector acepta el átomo y el importador lo reescribe solo dentro de su espacio | `PortabilitySpacesApiIT` rojo → verde, `390d8da` |
| La comparación de contenido por texto fallaba porque `jsonb` reordena las claves | Comparar árboles JSON, no cadenas | `PortabilitySpacesApiIT`, `390d8da` |

## Revisión independiente R1

2026-11-13 · Frontera en rol reviewer, Claude Code de escritorio (Claude Opus 5.5, esfuerzo sin verificar), Git Bash, PowerShell, Git, `gh`, Node, Java 21.0.9 y Docker Linux 28.5.1. Sesión distinta de la implementación. Checkout aislado con `git worktree add --detach` en el directorio temporal de la sesión, HEAD `b795e61bcd4027c5f44d0a2725276a4e7ae635e0`, base publicada `df2891c2e0d132c531c4e33a9fb60009f05ba989`. Checkout principal y `trailer/` sin tocar.

- PR65 OPEN, no draft, contra `main`, `MERGEABLE`. `gh pr view` y `git fetch` coincidieron en HEAD y base; `git merge-base` de la rama con `main` es la base publicada. [CI de entrada](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43543944588/job/132290649397) con `verify-required` SUCCESS para `b795e61`; la otra ejecución del mismo SHA quedó cancelada por concurrencia y no cuenta como verde. Fuentes técnicas de `390d8da`; `b795e61` solo cambia Markdown.
- Decisión del dueño (opción c). S-109 y la tarea la registran con el mismo alcance: el lector acepta el átomo cruzado, el importador lo reescribe solo si la referencia está incluida y es del mismo espacio, y ni el exportador ni el guardado cambian. El diff no toca `DailyContent` ni los servicios de guardado. El lector solo pierde `requireReferencesInSpace`; los demás negativos de T-061 siguen igual, y las dos pruebas de rechazo pasan a probar que el documento llega intacto, también anidado y en versiones.
- Proyección y escritura. Las cuatro consultas de exportación leen `space` de su fila, las versiones toman el de su nota y ninguna filtra por espacio; diarias y versiones se ordenan por fecha y luego Trabajo antes que Personal (`uq_daily_version_note` deja una versión por nota, así que el orden es determinista). Las tres inserciones con espacio lo escriben explícito; la versión no tiene columna propia y cuelga de la nota correcta.
- Asociación y átomos. `noteIds` usa espacio+fecha como clave, así que dos notas de igual fecha no se pisan, y cada versión toma la nota de su espacio. Los IDs nuevos se agrupan por espacio y `rewritten` recibe solo el mapa del espacio de la nota o versión: un átomo a una referencia del otro espacio conserva su UUID. `PortabilitySpacesApiIT` lo prueba de punta a punta, con una nota y una versión de Personal que apuntan a la referencia de Trabajo: 201, UUID original conservado, referencia de Trabajo recreada con otro UUID, 404 del UUID original y 404 de la referencia nueva desde el espacio equivocado.
- Cuenta vacía global. `accountEmpty` sigue sin filtrar por espacio y se evalúa bajo `SELECT … FOR UPDATE` del propietario. Una cuenta con datos solo en Personal da `accountEmpty=false` y 409 sin escrituras (API y servicio). Las escrituras normales de diario, referencias y voz insertan con FK al propietario y esperan ese bloqueo; las carreras parametrizadas por espacio y los dos imports simultáneos lo comprueban.
- `version` y `countsBySpace`. La constante `IMPORT_VERSION` desaparece y la vista previa devuelve la versión del libro leído (2 para la exportación nueva, 1 para el fixture inmutable). Vista previa e importación 201 agregan `countsBySpace` sin quitar campos; el v1 da Personal en cero y entra solo en Trabajo, y las sumas por espacio igualan al total. `OpenApiContractIT` no cubre portabilidad, así que su fallo previo de BACKLOG no oculta nada de este diff.
- Pruebas dirigidas, desde `server/` en Git Bash: `./mvnw -o -B verify -Dtest=XlsxSpacesRoundTripTest -Dit.test=PortabilitySpacesApiIT,PortabilityExportApiIT,PortabilityImportApiIT,PortabilityImportServiceIT -Djacoco.skip=true` → exit 0. Spotless OK, Surefire 50/50 y Failsafe 43/43 (Export 8, Import 11, ImportService 21, Spaces 3), sin omitidos; Flyway identificó PostgreSQL 18.6 en los cuatro contextos. Solo contenedores efímeros de Testcontainers; no se tocó ningún otro contenedor ni el stack del dueño. Log local fuera del repositorio.
- Checks locales: `node scripts/docs-check.mjs` OK, `git diff --check origin/main...HEAD` OK y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=APPLICATION`, 14 rutas, 9 técnicas.
- Paso intermedio confirmado: el cliente sigue con `version: z.literal(1)` y Datos rechazará la vista previa v2 hasta T-064. No desplegar.

**Resultado favorable, sin bloqueantes. FULL/STARTER DIFERIDO POR EL DUEÑO.** El veredicto canónico se publica en PR65 con el HEAD documental y la base vigentes, después de comprobar la CI de ese par. No se mergea sin autorización expresa del dueño según [AUTONOMY](../AUTONOMY.md#revisión-y-merge). El ensayo de Render requiere autorización expresa sobre SHA y ventana.

## Conciliación

GitHub confirmó [PR65](https://github.com/MatiasNicolasAcevedo/devnotes/pull/65) MERGED contra `main` el 2026-11-14T02:07:09Z (2026-11-13 en Buenos Aires). Squash `40361d85c6a31b51b8eafb610370c3c5b1975e6e`, HEAD aprobado `22cb1c3ed47fcbf2a1ed05b3cc39eca5ba278248` con el [veredicto R1 `APROBADO`](https://github.com/MatiasNicolasAcevedo/devnotes/pull/65#issuecomment-6869906723) y [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43544335246). El [cierre de PR65](https://github.com/MatiasNicolasAcevedo/devnotes/pull/65#issuecomment-6869922114) registra la autorización expresa del dueño y el merge sin `--admin`. `git ls-remote` confirmó el squash como punta de `main` publicado y `git merge-base --is-ancestor` comprobó su inclusión tras el fetch. T-062 queda `done`. **FULL/STARTER DIFERIDO POR EL DUEÑO.**

## Cierre y siguiente tarea

Control de cinco tareas de I5: revisar dependencias, evidencia dirigida, integrado diferido y hallazgos en esta tarea; volver a frontera solo por decisión fuera del contrato. No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-063 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
