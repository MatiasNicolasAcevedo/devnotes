---
id: T-058
status: mergeable
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-057]
branch: codex/t-058-daily-spaces
role: implementer
executor: frontier
pr: 61
---

# T-058 · Diario y versiones aislados por espacio

## Objetivo

Leer, guardar, listar y versionar dos diarios independientes de una misma fecha y cuenta.

[T-057 MERGED y conciliada](T-057-space-storage.md#conciliación). Contrato completo en S-109. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

Propagar enum validado de todos los endpoints diarios/versiones hasta SQL, incluyendo CAS/listados/conteos. Ausente=work; inválido/repetido=400. DTO y reglas de versiones conservados; nunca lookup global por fecha.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`daily/web/DailyNoteController.java`, `DailyVersionController.java`; servicios y repositorios diarios/versiones; nuevo `DailySpaceApiIT` y regresiones de ambas APIs.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Dos actores, dos espacios, misma fecha/revisión/versión independientes; paginación filtrada. Omisión compatible; vacío/repetido/desconocido, 401/403/CSRF, carrera de creación y CAS.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=PrivateSpaceTest,DailyContentTest -Dit.test=DailySpaceApiIT,DailyNoteApiIT,DailyVersionApiIT -Djacoco.skip=true
```

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

**2026-11-13 · Frontera en rol implementer**, Codex de escritorio (GPT-6, variante y esfuerzo sin verificar), PowerShell, Git Bash, Git, `gh`, Node, Java 21 y Docker Linux. Impacto en API, acceso a datos y comportamiento: selección estricta de espacio en diario y versiones, compatibilidad de Trabajo por omisión y autorización por propietario de sesión. El almacenamiento usa V7 existente. El cambio es de backend.

`gh pr view 60` y `git ls-remote` confirmaron la [conciliación de T-057](T-057-space-storage.md#conciliación) y la base publicada `e7d6bf66ff502e17d1d1ff04b0118c2594450f2b`. Sin PR abiertos ni rama T-058 publicada al tomar la tarea. Worktree aislado `.orchestrator/t-058/`; checkout principal y `trailer/` preservados.

Rojo sobre las fuentes de `e7d6bf6` con `DailySpaceApiIT` agregado. Desde `server/` en Git Bash, `./mvnw -o -B -q verify -Dtest=PrivateSpaceTest,DailyContentTest -Dit.test=DailySpaceApiIT -Djacoco.skip=true` → exit 1. Failsafe ejecutó cuatro casos en PostgreSQL 18.6. Tres fallaron como se esperaba: lectura cruzada 200 en vez de 404, query inválida 200 en vez de 400 y 22 registros en vez de 21 en el conteo filtrado. El caso de sesión/CSRF pasó. PostgreSQL y Ryuk retirados por sus IDs exactos. Log local `.orchestrator/t-058-logs/backend-red.log`.

Verde sobre las fuentes de implementación de `codex/t-058-daily-spaces`, base `e7d6bf66ff502e17d1d1ff04b0118c2594450f2b`. Desde `server/` en Git Bash, `./mvnw -o -B -q spotless:apply` → exit 0 y `./mvnw -o -B -q verify -Dtest=PrivateSpaceTest,DailyContentTest,DailyNoteServiceTest,DailyVersionServiceTest,SecurityConfigTest -Dit.test=DailySpaceApiIT,DailyNoteApiIT,DailyVersionApiIT,DailyNoteServiceIT,DailyVersionServiceIT,DailyNoteRepositoryIT -Djacoco.skip=true` → exit 0, Spotless OK. Surefire 110/110 (97 unitarios y 13 de MVC) y Failsafe 83/83 (4 espacios, 11 API diario, 25 API versiones, 15 servicio diario, 16 servicio versiones y 12 repositorio), sin omitidos. Incluye dos propietarios, misma fecha y revisiones independientes, versión manual y reemplazo, paginación con señuelos de otro espacio y propietario, omisión compatible, 400 en los seis endpoints, 401/403/CSRF y carreras de creación/CAS parametrizadas en ambos espacios. Se verificó ausencia de `starter-e2e-t-058` y retiro de los cinco PostgreSQL 18.6 y Ryuk por IDs exactos. Log local `.orchestrator/t-058-logs/backend-directed.log`, reportes Maven en `server/target/`.

**FULL/STARTER DIFERIDO POR EL DUEÑO.** Render requiere autorización expresa sobre SHA y ventana.

### Correcciones significativas

| Problema o condición | Arreglo | Prueba |
|---|---|---|
| Los handlers ignoraban `space` y las consultas mezclaban las filas de la misma cuenta | Parser compartido de query, ámbito obligatorio en repositorios y servicios, y versiones ancladas a su nota | Rojo de `DailySpaceApiIT` y selección verde con 83 IT |
| La primera corrida de implementación paró en `testCompile` por dos invocaciones con firma anterior en `DailyVersionServiceTest` | Pasar Trabajo explícito en las dos regresiones del reloj | Exit 1 en `.orchestrator/t-058-logs/backend-directed-compile.log`; ambas regresiones pasaron al repetir la selección |

### Entrega para revisión

[PR61](https://github.com/MatiasNicolasAcevedo/devnotes/pull/61) contra `main`. Fuentes probadas en el commit técnico `a083c359714aba83f9cca8cc41c3ae4ccc8296e0` sobre la base publicada `e7d6bf66ff502e17d1d1ff04b0118c2594450f2b`. `node scripts/docs-check.mjs`, `git diff --check` y `git diff --check origin/main...HEAD` → exit 0. `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → exit 0, `policy=FULL`, `profile=APPLICATION`, 14 rutas técnicas. Este traspaso modifica solo Markdown. Próximo paso: revisión independiente con HEAD/base publicados y `verify-required` del HEAD vigente.

## Revisión independiente R1

**2026-11-13 · Frontera como reviewer en sesión independiente**, Codex de escritorio (GPT-6, variante y esfuerzo sin verificar), PowerShell, Git Bash, Git, `gh`, Node 24.21.0, Java 21 y Docker Linux. Checkout aislado `.orchestrator/t-058-review/`. Impacto revisado en API, permisos y datos de diario y versiones. Se conservan DTO y clientes sin `space`.

- **PR y fuentes.** PR61 OPEN, listo para revisión y contra `main`. HEAD de entrada `bac839296bfae33b6c5cd4b384c1b2c606e9036c` y base publicada `e7d6bf66ff502e17d1d1ff04b0118c2594450f2b`, cotejados con las refs remotas. [CI de entrada](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43532378860) `verify-required` SUCCESS sobre ese par. El diff técnico coincide con `a083c359714aba83f9cca8cc41c3ae4ccc8296e0`.
- **SQL y concurrencia.** Lecturas, listados y conteos se acotan por dueño y espacio en persistencia antes de paginar. CAS incluye fecha y revisión esperada, y vuelve a leer en el mismo ámbito. La unicidad de creación usa la clave de V7. La versión manual bloquea primero la nota de ese ámbito, compara la revisión y reemplaza por su ID de nota. El join de versiones usa dueño y espacio de la nota.
- **HTTP.** Dos identidades y dos espacios en la misma fecha, con notas, revisiones y versiones independientes. Se comprobó omisión compatible, 400 sin mutación en los seis endpoints para espacios inválidos o repetidos, 401 sin sesión, 403 de CSRF y método denegado, 404 de lecturas fuera de ámbito y 409 de CAS o revisión obsoleta. Las respuestas verificadas conservan `no-store`.
- **PostgreSQL.** Los reportes del implementer confirman las tres regresiones en rojo sobre la base y 110 Surefire más 83 IT en verde. Desde `server/`, `./mvnw -o -B -q verify -Dtest=PrivateSpaceTest,DailyContentTest,DailyNoteServiceTest,DailyVersionServiceTest,SecurityConfigTest -Dit.test=DailySpaceApiIT,DailyNoteApiIT,DailyVersionApiIT,DailyNoteServiceIT,DailyVersionServiceIT,DailyNoteRepositoryIT -Djacoco.skip=true` → exit 0 en el checkout del reviewer. Surefire 110/110 y Failsafe 83/83 sobre PostgreSQL 18.6, sin omitidos. Las carreras de creación y CAS tienen un ganador en cada espacio. Retiro comprobado por ID y etiqueta de los cinco PostgreSQL y Ryuk. Log local `.orchestrator/t-058-review-logs/backend-directed.log` y reportes Maven del worktree de revisión.
- **Checks locales.** `node scripts/docs-check.mjs` y `git diff --check` OK. `node scripts/ci/classify-diff.mjs --base e7d6bf66ff502e17d1d1ff04b0118c2594450f2b --head HEAD --phase FULL` → `FULL / APPLICATION`, 14 rutas técnicas. El checkout principal y `trailer/` se preservaron.

**Resultado favorable, sin bloqueantes. FULL/STARTER DIFERIDO POR EL DUEÑO.** El veredicto canónico se publica en PR61 con el HEAD documental y la base vigentes tras comprobar la CI de ese par. El ensayo de Render requiere autorización expresa sobre SHA y ventana.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-059 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
