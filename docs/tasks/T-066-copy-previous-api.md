---
id: T-066
status: in_review
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

## Cierre y siguiente tarea

Implementación publicada en [PR69](https://github.com/MatiasNicolasAcevedo/devnotes/pull/69). Retoma en sesión revisora independiente sobre HEAD y base publicados. No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-067 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
