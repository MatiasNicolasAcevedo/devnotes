---
id: T-066
status: mergeable
priority: P1
size: M
milestone: M5
spec: S-110
depends_on: [T-065]
branch: codex/t-066-copy-previous-api
role: implementer
executor: frontier
pr: 69
---

# T-066 · Copia transaccional de la última nota anterior

## Objetivo

Sugerir y copiar la última nota anterior del mismo espacio a una fecha vacía sin sobrescrituras concurrentes.

Habilitada con [T-065 MERGED y conciliada](T-065-spaces-journey.md#conciliación). Contrato completo en S-110. Cada tarea y revisión usa sesión independiente.

## Alcance y decisiones resueltas

Vacío compartido, GET previous200/204 y POST copy-previous con errores S-110. Fuente guardada, sourceRevision/expectedRevision y CAS atómico con vacío. Snapshot independiente, origen/versión intactos. Rutas exactas SecurityConfig/OpenAPI.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-110](../specs/S-110-previous-day-copy.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevo `daily/application/CopyPreviousDailyNoteService.java`, vacío en DailyContent, consultas `DailyNoteRepository`, controller/DTO/SecurityConfig; `CopyPreviousDailyNoteTest`, `CopyPreviousDailyNoteApiIT`.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

CP-01…07 servidor: ayer/viernes/huecos/vacíos/futuro/otro espacio/usuario; links/@/separadores, CAS/carreras y destino con versión. Doble click/commit con respuesta perdida/campos extra no pisan; GET no escribe. Negativos antes de lógica protectora.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=CopyPreviousDailyNoteTest,DailyContentTest -Dit.test=CopyPreviousDailyNoteApiIT,DailySpaceApiIT -Djacoco.skip=true
```

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

2026-11-14. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh, Git Bash, JDK 21 y Docker Desktop Linux. Worktree propio `.orchestrator/t-066-fix-b1`, iniciado en el HEAD de R1 `2dce1a67f4b58c59159b868a648c5fd90f4861fa` del PR abierto, base publicada `a0321ec0a5c134b39628ac85609408980a42ec92`. B-1 restaura la ejecución de las aserciones del slice de seguridad. El cambio está circunscrito al test.

Desde `server/` con Git Bash, JDK 21 y Maven offline:

```bash
./mvnw -o -B -q test -Dtest=SecurityConfigTest -Djacoco.skip=true
./mvnw -o -B -q verify -Dtest=CopyPreviousDailyNoteTest,DailyContentTest -Dit.test=CopyPreviousDailyNoteApiIT,DailySpaceApiIT,OpenApiContractIT -Djacoco.skip=true
```

- Rojo de `SecurityConfigTest` sobre el HEAD de R1: exit 1, 13 errores de contexto por ausencia de `CopyPreviousDailyNoteService`.
- Verde con el mock (blob de `SecurityConfigTest.java` `74d7b8c3919d3dbb74f681f8cda1d0b9a5e37fd5`): exit 0 y 13/13.
- `verify` dirigido: exit 0, Surefire 87/87 (3 copia, 84 contenido), Failsafe 17/17 (7 copia, 4 aislamiento de diario, 6 OpenAPI). Cero fallos, errores u omitidos en las pruebas corregidas. HTTP con OIDC ficticio y PostgreSQL real `postgres:18.6`.
- Cleanup confirmado tras la salida de Ryuk: la consulta `docker ps -aq --no-trunc --filter label=org.testcontainers=true` devolvió cero coincidencias con los cuatro IDs de esta corrida (tres PostgreSQL y un Ryuk). Logs locales `server/target/t066-b1-*.log` y reportes de Maven en `server/target/`.

Pruebas ligadas al commit publicado `ab7f93c265c4aa5698188ac9f51d9a5dd4d38f90`, árbol `server` `371d0c67a8e54a29d948e30dee46aff777c37878`, sobre la base `a0321ec0a5c134b39628ac85609408980a42ec92`. El traspaso a R2 solo modifica Markdown.

- Desde la raíz, `node scripts/docs-check.mjs` (124 Markdown, 68 tareas, HANDOFF 22/22), `git diff --check` y `git diff --check a0321ec0a5c134b39628ac85609408980a42ec92...HEAD` pasaron. `node scripts/ci/classify-diff.mjs --base a0321ec0a5c134b39628ac85609408980a42ec92 --head HEAD --phase FULL` clasificó `FULL/APPLICATION`, 18 rutas, 15 técnicas.
- **FULL/STARTER DIFERIDO POR EL DUEÑO.** Retoma en R2 independiente con el [HEAD publicado y su check](https://github.com/MatiasNicolasAcevedo/devnotes/pull/69/checks).

### Evidencia de la implementación inicial

2026-11-14. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh, Git Bash, JDK 21 y Docker Desktop Linux. Checkout propio `.orchestrator/t-066`, HEAD inicial y base publicada `a0321ec0a5c134b39628ac85609408980a42ec92`. La tarea agrega dos endpoints privados, conserva la sesión y CSRF, y crea o actualiza el documento de trabajo dentro de una transacción. La interfaz de copia corresponde a T-067.

Rojo antes de la implementación: `./mvnw -o -B -q verify -Dtest=DailyContentTest -Dit.test=CopyPreviousDailyNoteApiIT -Djacoco.skip=true` → exit 1, 7/7 IT rojos por rutas ausentes (403 o sin disputa del bloqueo). PostgreSQL 18.6 confirmado; resumen de Failsafe en `server/target/`.

Pruebas de cierre desde `server/` con Git Bash, JDK 21 y el caché local de Maven:

```bash
./mvnw -o -B -q spotless:apply
./mvnw -o -B -q verify -Dtest=CopyPreviousDailyNoteTest,DailyContentTest -Dit.test=CopyPreviousDailyNoteApiIT,DailySpaceApiIT,OpenApiContractIT -Djacoco.skip=true
```

Ambos comandos → exit 0. Surefire 87/87 (`CopyPreviousDailyNoteTest` 3, `DailyContentTest` 84). Failsafe 17/17 (`CopyPreviousDailyNoteApiIT` 7, `DailySpaceApiIT` 4, `OpenApiContractIT` 6), cero fallos, errores u omitidos. PostgreSQL `postgres:18.6` vía Testcontainers y HTTP con OIDC ficticio. En las tres corridas el harness retiró sus diez contenedores (siete PostgreSQL y tres Ryuk); `docker ps -aq --no-trunc --filter label=org.testcontainers=true` intersectado con los IDs exactos del harness → 0 coincidencias. Resúmenes Maven y logs de trabajo bajo `server/target/`.

| Criterio | Evidencia del servidor |
|---|---|
| CP-01 | 200 con JSON idéntico para texto, enlace, separador y referencia; UUID v7, revisión inicial 1, timestamps de la copia y origen intacto. |
| CP-02–03 | Viernes si los días intermedios carecen de contenido; sin ventana artificial. Se excluyen la fecha destino, el futuro, otro espacio y otra cuenta. 200 de solo metadatos y 204 sin cuerpo; ninguna fila creada por GET. |
| CP-04 | 404 indistinguible para fuentes ausentes o ajenas, 409 por revisiones y contenido, cuerpo exacto y fechas estrictas. Una transacción rival mantiene bloqueadas el alta y la actualización hasta el commit; ambas copias pierden con 409 y conservan el contenido del escritor. |
| CP-05 | La copia de la fuente explícita sigue siendo válida si aparece una posterior. Conserva la referencia y deja intactas las versiones manuales de origen y destino. |
| CP-06 | La API exige sesión y CSRF en POST, valida espacio y restringe la operación a propietario, fecha y espacio. Solicitudes después de cerrar sesión reciben 401. |
| CP-07 | Replay tras el ACK simulado como perdido devuelve 409; GET recupera exactamente una copia. PUT posterior puede guardar el vacío con la revisión confirmada y seguir editando de forma independiente. |

**FULL/STARTER DIFERIDO POR EL DUEÑO.**

Checks desde raíz en el worktree de T-066. `node scripts/docs-check.mjs` → exit 0 (124 Markdown, 68 tareas, HANDOFF 22/22), `git diff --check` y `git diff --check origin/main...HEAD` → exit 0, `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → exit 0 (`FULL/APPLICATION`, 17 rutas, 14 técnicas). Fuentes verificadas en `d7c2a67c0d0c5d6c33b2c2a850d6b37a53195f26` (árbol `server` `3d86932cee0e02b00b42549c336c3fd908c0430f`); la transición a revisión solo modifica Markdown. El check remoto del HEAD vigente se consulta en [PR69](https://github.com/MatiasNicolasAcevedo/devnotes/pull/69/checks).

## Correcciones

| Problema y causa | Arreglo y prueba |
|---|---|
| La primera corrida con la API, sobre la base publicada, dio 87/87 unitarios y 11/11 IT de diario. El IT ampliado de OpenAPI dio 5/6 porque la aserción histórica de Referencias omitía `space`, ya documentado en `origin/main`. | Actualizar la lista exacta esperada de parámetros; conservar la comprobación del resto del contrato. Selección dirigida repetida, 87/87 y 17/17 en verde. |
| B-1 de R1: el `@WebMvcTest` cargaba `DailyNoteController` sin el bean requerido `CopyPreviousDailyNoteService`; 13 errores de contexto sobre `2dce1a67f4b58c59159b868a648c5fd90f4861fa`. | Registrar `CopyPreviousDailyNoteService` como `@MockitoBean` en `SecurityConfigTest`. Se conservan las aserciones y los IT. 13/13, 87/87 y 17/17 en `ab7f93c265c4aa5698188ac9f51d9a5dd4d38f90` sobre `a0321ec0a5c134b39628ac85609408980a42ec92`. |

## Revisión independiente R1

2026-11-14. Frontera reviewer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh, Git Bash, JDK 21 y Docker Desktop Linux. GitHub confirmó [PR69](https://github.com/MatiasNicolasAcevedo/devnotes/pull/69) `OPEN` contra `main`, HEAD inicial `9a8cdc56420abe29a6d650c2852a0e88bcb37d89`, base `a0321ec0a5c134b39628ac85609408980a42ec92` y [`verify-required` SUCCESS para ese HEAD](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43610862642/job/132495390315). Worktrees propios `.orchestrator/t-066-review` y `.orchestrator/t-066-review-base`. El árbol `server` revisado es `3d86932cee0e02b00b42549c336c3fd908c0430f`, igual al de la evidencia del autor.

Desde `server/` con Git Bash y JDK 21:

```bash
./mvnw -o -B -q verify -Dtest=CopyPreviousDailyNoteTest,DailyContentTest -Dit.test=CopyPreviousDailyNoteApiIT,DailySpaceApiIT,OpenApiContractIT -Djacoco.skip=true
./mvnw -o -B -q test -Dtest=SecurityConfigTest -Djacoco.skip=true
```

- Selección del autor repetida en el HEAD inicial, exit 0. Surefire 87/87 y Failsafe 17/17 (7 copia, 4 aislamiento de diario, 6 OpenAPI), cero fallos, errores u omitidos. HTTP con OIDC ficticio y PostgreSQL 18.6 real. Cleanup de los cuatro contenedores propios por coincidencia de IDs exactos y label Testcontainers, cero restantes. Logs locales en `server/target/` de los worktrees de revisión.
- `SecurityConfigTest`, exit 1 en el HEAD inicial, 13 errores al cargar el contexto. Mismo comando en la base, exit 0 con 13/13, cero fallos, errores u omitidos.

| Criterio | Contraste de servidor |
|---|---|
| CP-01 | El POST conserva el árbol de texto, enlaces, separadores y referencias. La creación recibe UUID v7, revisión 1 y timestamps propios. |
| CP-02–03 | Consulta por propietario y espacio, estrictamente anterior y descendente, sin ventana. Excluye fechas futuras y documentos de párrafos blancos. El GET devuelve solo metadatos o 204 sin cuerpo y las filas permanecen intactas. |
| CP-04 | Cuerpo exacto, fechas y revisiones estrictas. 404 indistinguible para fuentes ajenas y ausentes; 409 ante cambios de revisión o contenido. La transacción bloquea la fila existente hasta el CAS y la restricción única arbitra el alta. Los dos IT de carrera observan el bloqueo en PostgreSQL y comprueban que el escritor rival conserva el destino. |
| CP-05 | La revisión y el JSON de la fuente explícita se leen juntos; el guardado persiste un snapshot validado. Se conserva el vínculo de referencia, el origen y ambas versiones manuales. El destino vacío existente conserva ID y `createdAt`. |
| CP-06 | Rutas exactas, sesión, CSRF en POST y `no-store`. Owner derivado de sesión y espacio validado. El dirigido verifica negativas de acceso y logout. OpenAPI exige sesión y CSRF juntos en POST. |
| CP-07 | El replay con revisiones originales devuelve 409; la recarga recupera una sola copia. Un PUT posterior puede volver al vacío con CAS y las ediciones de ambos días son independientes. |

El manejo de respuestas tardías, el undo en la interfaz y CP-08 corresponden a T-067. **FULL/STARTER DIFERIDO POR EL DUEÑO.** En raíz, `node scripts/docs-check.mjs` y `git diff --check a0321ec0...HEAD` pasaron; `node scripts/ci/classify-diff.mjs --base a0321ec0a5c134b39628ac85609408980a42ec92 --head HEAD --phase FULL` clasificó `FULL/APPLICATION` (14 rutas técnicas). La transición de R1 modifica solo esta tarea y STATUS. El veredicto ligado al HEAD final y la base se publica en PR69.

### B-1 · Regresión bloqueante en `SecurityConfigTest`

`DailyNoteController` ahora requiere `CopyPreviousDailyNoteService` en el constructor. El slice global `@WebMvcTest` de `SecurityConfigTest` carga el controlador, pero no registra este servicio. Spring informa `No qualifying bean of type 'com.example.devnotes.daily.application.CopyPreviousDailyNoteService' available`; las 13 aserciones de seguridad quedan sin ejecutarse. La base verde confirma la regresión del PR.

Corrección suficiente: registrar `CopyPreviousDailyNoteService` como `@MockitoBean` en ese slice, conservando sus aserciones y los IT con PostgreSQL/OIDC ficticio. Cierre observable: `SecurityConfigTest` 13/13 y selección dirigida de T-066 verde en el HEAD corregido, docs-check y verify-required SUCCESS del HEAD publicado. Registrar evidencia y pedir R2 en una sesión independiente.

## Revisión independiente R2

2026-11-14. Frontera reviewer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh, Git Bash, JDK 21 y Docker Desktop Linux. Worktree propio `.orchestrator/t-066-review-r2`, HEAD de entrada `251ad7673891bb08cb4f9c4a225d070bce70109a` y base publicada `a0321ec0a5c134b39628ac85609408980a42ec92`. El HEAD contiene B-1 `ab7f93c265c4aa5698188ac9f51d9a5dd4d38f90` y conserva su árbol `server` `371d0c67a8e54a29d948e30dee46aff777c37878`.

Desde `server/` con Git Bash y Maven offline:

```bash
./mvnw -o -B -q test -Dtest=SecurityConfigTest -Djacoco.skip=true
./mvnw -o -B -q verify -Dtest=CopyPreviousDailyNoteTest,DailyContentTest -Dit.test=CopyPreviousDailyNoteApiIT,DailySpaceApiIT,OpenApiContractIT -Djacoco.skip=true
```

- Ambos comandos dieron exit 0. Surefire: `SecurityConfigTest` 13/13, `CopyPreviousDailyNoteTest` 3/3 y `DailyContentTest` 84/84. Failsafe: `CopyPreviousDailyNoteApiIT` 7/7, `DailySpaceApiIT` 4/4 y `OpenApiContractIT` 6/6. Cero fallos, errores u omitidos. Los IT de diario ejercitaron HTTP/OIDC ficticio y PostgreSQL real `postgres:18.6` iniciado por Testcontainers.
- Cleanup confirmado con `docker ps -aq --no-trunc --filter label=org.testcontainers=true`: cero coincidencias con los cuatro IDs exactos del log de la corrida (tres PostgreSQL y un Ryuk). Logs locales `server/target/t066-r2-*.log` y reportes Surefire/Failsafe del worktree R2.
- B-1 cerrado. El diff de `SecurityConfigTest.java` contra R1 agrega el import y `@MockitoBean CopyPreviousDailyNoteService`. Las 13 pruebas conservan sus aserciones. Los IT verifican ambas rutas nuevas y sus negativos de sesión/CSRF sobre HTTP.

| Criterio | Contraste R2 del servidor |
|---|---|
| CP-01 | El POST conserva el árbol de texto, enlaces, separadores y referencias. La copia recibe UUID v7, revisión 1 y timestamps propios. |
| CP-02–03 | GET selecciona por propietario y espacio, del pasado más reciente hacia atrás y sin ventana. Salta los blancos Unicode, ofrece viernes entre huecos y excluye futuro. Devuelve solo metadatos o 204 sin cuerpo y las filas quedan intactas. |
| CP-04 | Fechas, revisiones y cuerpo estricto. Fuentes ajenas, de otro espacio o ausentes reciben 404 indistinguible. Revisión obsoleta, origen vaciado y destino con contenido reciben 409. Los dos IT de carrera observan el bloqueo real y verifican que el escritor rival conserva el destino. |
| CP-05 | La copia persiste el snapshot de la fuente explícita incluso si aparece otra más reciente. Conserva la referencia, el origen y las versiones manuales. La fila vacía existente conserva su ID y `createdAt`. |
| CP-06 | Rutas exactas y `no-store`. Propietario de la sesión, espacio validado y CSRF en POST. Los IT verifican negativas de acceso, logout y sesión/CSRF conjuntos en OpenAPI. |
| CP-07 | El replay que simula pérdida de ACK recibe 409, GET recupera una sola copia y un PUT con la revisión confirmada puede guardar el vacío. Las ediciones posteriores de origen y destino son independientes. |

`node scripts/docs-check.mjs`, `git diff --check` y `git diff --check a0321ec0a5c134b39628ac85609408980a42ec92...HEAD` pasan. El clasificador contra la base publicada informa `FULL/APPLICATION`, 18 rutas, 15 técnicas. **FULL/STARTER DIFERIDO POR EL DUEÑO.** El paso a `mergeable` modifica solo esta tarea y STATUS. El [veredicto canónico en PR69](https://github.com/MatiasNicolasAcevedo/devnotes/pull/69) se publica después de comprobar `verify-required` SUCCESS del HEAD de esta transición contra la misma base.

## Cierre y siguiente tarea

R2 cerró B-1 y dejó [PR69](https://github.com/MatiasNicolasAcevedo/devnotes/pull/69) para merge en sesión independiente, condicionado al veredicto vigente y a las comprobaciones de AUTONOMY. SP-06 en Android físico con teclado real y zoom nativo sigue pendiente del dueño. T-067 se habilita tras confirmar PR69 MERGED. Render requiere autorización expresa separada sobre SHA y ventana.
