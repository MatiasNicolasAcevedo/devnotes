---
id: T-000
status: in_progress
priority: P1
size: M
executor: frontier
role: reviewer
milestone: M0
spec: null
spec_version: null
branch: chore/t-000-adoption
pr: 1
depends_on: []
---
# T-000 · Adopción de devnotes

## Objetivo
Adoptar DevNotes con contexto/autonomía propios, evidencia de esta copia y ruta Junie hasta el MVP completo I1. Preservar personalización existente y no implementar negocio. Contratos de producto se publican en este PR, sin otro PR de planificación.

## Alcance
Contexto del formulario reutilizado; identidad confirmada DevNotes/devnotes/com.example.devnotes. Política Git/pruebas/revisión/merge/continuidad aprobada expresamente por dueño el 2026-10-20. Cuatro specs S-101…104 y catorce tareas pequeñas T-001…014, contratos completos draft solo por dependencia. WIP1/ready<=5 y retorno a frontera al objetivo I1; control de avance Junie cada cinco tareas. Sin Google real, servicios pagos, datos reales ni producción.

Referencias de operación: [PROJECT_CONTEXT](../../PROJECT_CONTEXT.md), [AUTONOMY](../AUTONOMY.md), [TESTING](../TESTING.md), [SETUP](../SETUP.md), [HANDOFF](../HANDOFF.md). Ruta de producto en ROADMAP/BACKLOG y specs enlazadas por el contexto.

## Aceptación

| Criterio | Evidencia propia requerida |
|---|---|
| Contexto/autonomía | Respuestas del dueño y decisiones explícitas registradas sin permisos heredados |
| Identidad | Paquete/rutas/config/client/API/E2E coherentes; preservados locks/auth/migraciones |
| Contratos I1 | Specs por capacidad, tareas pequeñas completas, dependencias/siguiente/pruebas/retorno definidos; docs-check |
| Entorno y copia | Docker/Git Bash/Node y copia limpia sin kit; instalar/verificar backend/client, up/check/down/retoma/persistencia/cleanup por labels propios |
| Gate | Perfil STARTER por identidad/POM/Compose; FULL de aplicación más tooling sobre mismas fuentes/base, logs saneados y huella antes/después |
| Junie | Versión instalada distinguida de capacidades en sesión; /mcp y /skills, herramientas mínimas con sonda de lectura por Junie en su instalación, sin secretos |
| Entrega | PR propio, CI verify-required del HEAD final, revisión independiente y squash por política; no done con PR abierto |

## Primera revisión y comprobación propia de Junie

El dueño confirmó que abre primero una **sesión nueva de frontera reviewer T-000**. Revisar el PR/contratos/evidencia sin implementar ni atribuir capacidades Junie a esa revisión. Frontera no abre otra sesión Junie: SETUP/TOOLS exigen que dueño/Junie comprueben su superficie. Si esa evidencia sigue faltando al revisar el criterio E-01, conservar el pendiente concreto y su condición de salida; no convertirlo en comprobado ni habilitar T-001 sin su precondición.

En una sesión propia Junie del dueño, registrar raíz/checkouts y rutas AGENTS/STATUS/T-000 leídas; modelo/herramienta/esfuerzo solo lo expuesto. Consultar /mcp y /skills (o mecanismo que exponga esa instalación), actualizar filas de .junie/TOOLS.md con nombres/fecha/superficie/origen/estado y sonda saneada para las herramientas necesarias. Esta comprobación no implementa negocio ni crea otra tarea/PR. No leer configuración privada ni secretos, no instalar/autenticar ni delegar.

Mínimo para revisar/continuar: lectura/edición del repo, terminal Git Bash/Node/Docker, acceso Git/PR/CI autorizado en este repo y capacidad de devolver diff/exit/log. Comprobar `git status --short --branch`, `node --version`, `docker version --format '{{.Server.Version}}'`, `gh pr view --json number,state,headRefOid,baseRefOid` desde esta rama y `node scripts/docs-check.mjs`; si se usa GitHub MCP en vez de gh, sonda equivalente de solo lectura al PR. No ejecutar el microensayo en una copia ni tocar errorMessage durante T-000. Herramientas opcionales ausentes no bloquean si el shell autorizado cubre la función; registrar límite. Si una capacidad indispensable falta, checkpoint bloqueado sin fingir resultado.

Revisar T-000 por reviewer.md, incluidas nuevas specs/tareas, evidencia STARTER y diff completo. Registrar la transición documental, publicar SHA final, esperar CI y emitir veredicto independiente con pendientes reales. Si no hay bloqueantes puede mergear por AUTONOMY; si falta evidencia exigida, conservar el bloqueo/dato necesario sin inventar aceptación. No implementar T-001 en esa sesión; solo cuando corresponda, dejar STATUS con prompt de sesión nueva Junie implementer T-001, primera comprobación MERGED de T-000 y capacidades propias.

## Evidencia de implementación y gate conservada

Fecha local 2026-10-20. Rol frontera planner→implementer adopción, herramienta Codex desktop/terminal PowerShell+Git Bash; modelo identificado por entorno como GPT-6, variante/esfuerzo no expuestos (no inferidos de catálogos). Impacto: documentación/contratos y personalización mecánica existente; ningún negocio, permiso de usuario, datos reales o auth nueva implementados.

SHA inicial/base origin/main: `fa52e546d24a412fd5729f4b15b8a4103cb3071a`; rama existente chore/t-000-adoption. Inicio: 90 rutas de diff rastreado más nuevo paquete/T-000; preservado. Remoto propio confirmado; sin PR abiertos al consultar. Kit plantilla ausente, `git ls-files -- plantilla` vacío.

Pruebas/sondas hasta preparar gate:

| Comando / superficie | Resultado real | Alcance |
|---|---|---|
| node --version | v24.21.0 | Host frontera |
| docker version; docker compose version | 28.5.1 cliente/server; v2.40.2-desktop.1 | Fuera del sandbox; Linux engine accesible |
| Git Bash --version | 5.2.37 | Host frontera; no usar bash.exe de System32/WSL |
| junie --version | 26.10.12 (3659.7), exit0 | Instalación CLI detectada; sandbox rechazó creación de logs globales. No prueba modelo/MCP/skills/IDE/ejecución |
| gh repo view / pr list / API | private/MIT/main; squash y push; 0 PR abiertos; protección/rulesets 403 por plan | No modificar settings ni atribuir enforcement |
| node scripts/docs-check.mjs antes de edición | exit0, 42 Markdown/1 tarea/0 de22 | Solo estado inicial, no gate de docs finales |
| npm view (lectura, sin instalar) | @tiptap/react3.32.0 compatible React19, @fontsource/roboto-mono5.3.0 | Decisión técnica S-101, integración pendiente T-005 |
| node --test scripts/test-init-adopted.mjs scripts/ci/docs-check.test.mjs scripts/ci/classify-diff.test.mjs | Host exit0, 62/62 pass, 0 fail/skipped | `.orchestrator/t000/directed-host.log`; sandbox previo EPERM al crear junction, sin cambiar tests |
| Comparación de 66 Java movidos contra HEAD reemplazando solo paquete | 66/66 idénticos tras reemplazo com.example.starter→com.example.devnotes | Ningún negocio añadido a Java |
| git fetch origin main; docs-check final previo al commit | base sigue fa52e54; docs-check exit0, 60 Markdown/15 tareas | Índice explícito, diff --check limpio |

### Operación larga preparada

Antes del gate: cerrar fuentes técnicas, commit local de adopción y registrar SHA/base + huella técnica SHA256 en logs ignorados. Diff completo exige STARTER, no DOCS_ONLY. Logs en `.orchestrator/t000/`, nunca secretos. Proyecto verify `starter-verify-devnotes-t000-20261020`, e2e `starter-e2e-devnotes-t000-20261020`; comprobar labels ausentes en container -a/network/volume. Tooling usa namespaces únicos internos y copias temporales sin .git/kit/.env real, valida sus targets antes de cleanup. No crear otro repositorio. No editar fuentes técnicas durante ejecución.

Comando desde Git Bash, raíz:

```bash
COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-devnotes-t000-20261020 STARTER_E2E_PROJECT=starter-e2e-devnotes-t000-20261020 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter
```

Cleanup propio: `docker compose --env-file .env.example -p starter-verify-devnotes-t000-20261020 --profile verify down --volumes --remove-orphans`; E2E y tooling limpian solo sus labels internos. Comprobar labels container/network/volume vacíos y huella técnica idéntica al finalizar. Preservar exit real y logs; fallo no habilita publicación. Tooling prueba copia compilable y lifecycle persistente nginx/Vite incluyendo retoma sin adjudicarlo a Junie. El ensayo dev persistente deja DB solo durante su prueba y cleanup del runner la retira al final.

Fuentes técnicas validadas: `f082659d3d24d7a5a1eabd17fe8dc939a3b28b51`, base `fa52e546d24a412fd5729f4b15b8a4103cb3071a`. **STARTER completado exit0**, cleanup exit0 y huella antes/después idéntica. Publicado [PR #1](https://github.com/MatiasNicolasAcevedo/devnotes/pull/1); este cierre posterior solo modifica Markdown, sin cambiar base/fuentes probadas. La primera revisión será frontera en sesión nueva, elección expresa del dueño. Junie E-01 y revisión independiente siguen pendientes: no reemplazarlas con ejecuciones de frontera.

### Resultado propio del gate y recursos

| Suite / evidencia | Resultado / tiempo de pared |
|---|---|
| docs | exit0, 3s; cierre documental vuelve a ejecutar docs-check |
| server | exit0, 243s; 91 unitarios/slices +75 IT, 0 fail/error/skipped; Spotless/Failsafe/JaCoCo/PostgreSQL18 |
| client | exit0, 46s; 16 archivos/133 tests, typecheck/lint/formato/cobertura/build |
| tooling | exit0, 1773s; copia inicial294s, guardias26s, nginx326s, Vite287s, fallos556s, copia sin Git121s, señales25s, proxies134s; unitarios de sonda/init1s/3s |
| e2e final | exit0, 418s; 15 casos API/DB/OIDC reales desktop1280/móvil375, sin mocks API propia/retries extra; saneador negativo y export final verdes |
| total de suites | 2483s (~41min23s), no sumar de nuevo los ensayos internos de tooling |
| cleanup principal | verify/e2e container/network/volume=0/0/0; exit0. Cada runner interno confirmó su cleanup por labels exactos; no tocar recursos ajenos |
| huella técnica | manifiestos before/after SHA256 `DB9568E00B60F3BC02A5E0C48BEB3B2862FAA868C08247CFE493F86A80A4798C`; diferencia0 |
| CI local | `node --test "scripts/ci/*.test.mjs"`, exit0, 83/83 pass, 0 fail/skipped antes y después del cierre documental; `.orchestrator/t000/ci-local.log` y `ci-final.log` |

Logs ignorados: `.orchestrator/t000/starter.log`, `starter.exit`=0, `cleanup.log`, `technical-before.json`/`technical-after.json`, dirigidos y CI local. Capturas propias saneadas inspeccionadas en `e2e/artifacts/starter-dev-b1-nginx-1792547599-95533/safe-home-1280.png` y `safe-home-375.png`, con identidad ficticia. El canario negativo intencional exportó un fallo de prueba para comprobar el saneador; **no** es un fallo del gate ni se cuenta como caso final: export definitivo tests15/failures0/action-traces0.

Auditoría final adicional: nueve proyectos propios identificados en el log del gate, todos sin contenedores/redes/volúmenes residuales; `.orchestrator/t000/final-audit.log`. No se borró ningún recurso fuera de los namespaces de los runners.

CI remota del primer HEAD publicado f082659: `verify-required` SUCCESS, run39532992317/job119003036967, base fa52e54, comprobada por gh. El cierre documental cambia HEAD y exige consultar nuevamente esa CI antes de entregar/revisar; no reutilizar el verde anterior como check del nuevo SHA. El perfil del PR completo sigue FULL/STARTER (111 rutas en el primer commit); no se lo reclasifica DOCS_ONLY. `.junie/TOOLS.md` aparece técnico por ubicación en el clasificador, pero su cierre solo corrige procedencia/rol y conserva todos los MCP/skills como declarados: no cambia configuración de MCP, instalación ni código. Conservación del gate por transición Markdown según TESTING, con docs-check y las83 regresiones CI afectadas verdes; revisor comprueba esa distinción y la huella de código/configuración.

Solo se ejecutó la base personalizada; **CA-01…06 del negocio no están implementados ni probados**. Al publicar la implementación, HANDOFF distinguía 15 criterios propios comprobados y 7 pendientes; sus filas conservan el estado de aceptación vigente tras revisión. Veredicto global NO_LISTO hasta cierre elegible, sin transferir aceptación del starter ni del producto. La CI liviana del HEAD final se consulta en PR1; el reviewer debe comprobarla junto a HEAD/base publicados, sin confundirla con FULL. No repetir STARTER por este cierre Markdown si huella/base coinciden.

## Checkpoint vigente · E-01 completado por Junie

2026-10-21, sesión propia Junie del dueño para completar E-01 pedido en R1. Superficie IDE IntelliJ IDEA/AIR (plugin Junie), terminal PowerShell. Modelo expuesto por entorno: Qwen/Qwen3.6-27B-FP8. Impacto de esta sesión: TOOLS.md con evidencia real de MCP/skills y esta bitácora; sin cambios de comportamiento, API, permisos, datos o UI.

### Primera comprobación Git y remotos

Rama chore/t-000-adoption, árbol limpio. HEAD `6e9683a188d8d351b95b6badb60e1cfc1fcc2669`, base `fa52e546d24a412fd5729f4b15b8a4103cb3071a`. PR #1 OPEN, verify-required pass (run 39641176447). Sin cambios ajenos ni conflictos.

### Sondas mínimas de T-000

| Comando / superficie | Resultado real | Alcance |
|---|---|---|
| `git status --short --branch` | chore/t-000-adoption, árbol limpio | Lectura/edición del repo OK |
| `node --version` | v24.21.0 | Node host OK |
| `docker version --format '{{.Server.Version}}'` | 28.5.1 | Docker server OK |
| `& "C:\Program Files\Git\bin\bash.exe" --version` | 5.2.37 | Git Bash OK |
| `gh pr view 1 --json number,state,headRefOid,baseRefOid` | exit0, PR OPEN, HEAD/base coincidentes | Git/PR/CI autorizado |
| `gh pr checks 1` | verify-required pass | CI verde del HEAD vigente |
| `node scripts/docs-check.mjs` | exit0, 60 Markdown/15 tareas/HANDOFF 19/22 | docs-check OK |
| `junie --version` | 26.10.12 (3659.7) exit0 | Launcher CLI detectado |

### Herramientas Junie comprobadas

Configuración MCP de usuario en `~/.junie/mcp/mcp.json`: 4 servers (Playwright, Chrome DevTools, Context7, GitHub). Sin mcp.json de proyecto en `.junie/mcp/`. Skills expuestos por plugin IDE: 7 skills (context7, database-connection-management, demo-setup, frontend-design, ij-debugger, java-engineer, spring-boot-engineer). Sin skills en `.junie/skills/` del proyecto ni en `~/.junie/skills/`. junie-cli-docs disponible como custom agent built-in.

Todos los MCP y skills están activos y expuestos como herramientas en esta sesión. Detalle y evidencia en [.junie/TOOLS.md](../../.junie/TOOLS.md).

### Veredicto E-01

E-01 completado: inventario y sondas de herramientas Junie registrados con fecha, superficie, origen y estado. Las herramientas indispensables (lectura/edición repo, Git Bash/Node/Docker, Git/PR/CI, docs-check) están operativas. Sin bloqueantes. TOOLS.md actualizado con evidencia saneada, sin secretos ni configuración privada impresa.

## Checkpoint vigente · revisión R1

2026-10-21, sesión nueva de frontera reviewer, distinta de la autora. Codex desktop/API y terminal PowerShell/Node/Git; familia GPT-6 expuesta, variante/esfuerzo efectivos no expuestos. Sin delegación ni ejecución de Junie. Impacto de esta sesión: solo transición documental de tarea/STATUS/HANDOFF, sin cambios de comportamiento, API, permisos, datos o UI.

Primera comprobación remota/local: PR1 OPEN, no draft, único PR abierto, rama chore/t-000-adoption contra main. HEAD recibido `08059edc17d5d93e6284547215bdc7133b7c753b`, base `fa52e546d24a412fd5729f4b15b8a4103cb3071a`, ambos coincidentes con refs publicadas; árbol inicialmente limpio. `verify-required` SUCCESS en run39533470447/job119004558873, headSha exacto recibido; sin reviews ni hilos de revisión. Conector GitHub devolvió404 para este privado; alternativa gh autorizada, fuera del sandbox tras fallo de red restringida. No se cambiaron permisos ni settings. Repo privado/MIT/main, push y squash habilitados; rulesets/protección siguen403 por plan, límite aceptado en AUTONOMY, sin enforcement acreditado.

Revisado diff completo de112 rutas, contratos S-101…104, tareas T-001…014, dependencias secuenciales, comandos/gates y trazabilidad CA-01…06. Resultado de diseño favorable: JSON limitado y validación de URLs, propiedad desde sesión, CAS/carreras PostgreSQL, copia manual con lock, borrador/cola por identidad, navegación con flush y readonly definidos; no nuevo negocio implementado ni aceptación de runtime I1. No se encontraron otros bloqueantes de código/contratos. Java66/66 coincide con base tras sustituir únicamente paquete; POM/Docker/Compose/config/client/E2E conservan controles y versiones, con cambios de identidad previstos. La baja de la tarea genérica evita heredar su aceptación y no elimina suites. El manifiesto project-identity conserva la instantánea del inicializador anterior al ajuste visible devnotes→DevNotes: las cinco diferencias técnicas de ese inventario se explican exactamente por ese nombre; la evidencia de gate válida es el manifiesto técnico propio, no esa instantánea.

| Comprobación propia del reviewer | Resultado / evidencia ignorada |
|---|---|
| `node .orchestrator/t000/review-audit.mjs` | exit0;236 entradas actuales coinciden con technical-before, before/after idénticos con SHA256 DB9568E00B60F3BC02A5E0C48BEB3B2862FAA868C08247CFE493F86A80A4798C;66 Java mecánicos;67 rutas del inicializador ausentes; review-audit.json/log |
| Base/fuentes del STARTER contra HEAD recibido | Base publicada intacta; f082659→08059ed solo16 Markdown, incluido TOOLS sin configuración ni capacidad acreditada. Perfil completo sigue FULL/STARTER,112 rutas. Se conserva gate, no se repite por transición Markdown |
| Inspección de starter.log/starter.exit/cleanup.log/final-audit.log | docs/server/client/tooling/e2e exit0;91 unitarios/slices,75 IT PostgreSQL18,133 client y15 Playwright finales; canario negativo separado; nueve proyectos propios con cleanup0/0/0 |
| `node scripts/docs-check.mjs`; `git diff --check` | exit0 sobre HEAD recibido; repetir tras transición y antes de publicar |
| `node scripts/ci/classify-diff.mjs --base fa52e546d24a412fd5729f4b15b8a4103cb3071a --head HEAD --phase FULL` | policy=FULL, profile=STARTER; no reclasificar adopción como DOCS_ONLY |
| `node --test "scripts/ci/*.test.mjs"` | Host exit0,83/83 pass,0 fail/skipped; review-ci-host.log. Intento restringido con errores de permisos/procesos hijos en review-ci.log no acredita tests verdes |
| `node --test scripts/test-init-adopted.mjs` | Host exit0,3/3 pass,0 fail/skipped; preservación de edición/identidad y negativos junction/hardlink; review-adopted-host.log |

**R1 / CAMBIOS REQUERIDOS — E-01 (bloqueante de aceptación).** La aceptación de T-000 exige inventario y sondas por Junie en su propia sesión; TOOLS mantiene cinco MCP/siete skills declarados y solo acredita la versión del launcher por frontera. Falta raíz/superficie/modelo expuesto, `/mcp` y `/skills` o equivalente, y sondas mínimas lectura/edición, Git Bash/Node/Docker y Git/PR/CI. Frontera no puede generar esa procedencia ejecutando las mismas herramientas. Sin esa evidencia no corresponde aprobar ni mergear; G-02 sigue pendiente por la misma causa y G-03 por veredicto favorable/merge aún ausentes. La limitación403 de protecciones ya está documentada y aceptada; no constituye otro defecto ni autoriza cambiar settings.

Condición de salida y siguiente acción: el dueño abre una sesión propia Junie para completar únicamente la comprobación descrita arriba, en esta rama/PR, registrando evidencia saneada en TOOLS/T-000. No instalar/autenticar ni ejecutar microensayo o negocio. Herramientas opcionales ausentes no bloquean si el shell autorizado demuestra la capacidad; indispensable ausente deja causa, intento y dato necesario al dueño. Publicar cierre con docs-check/CI del nuevo HEAD y preparar sesión nueva frontera reviewer R2 del mismo PR, dentro del máximo de dos rondas. T-001 continúa draft y no se habilita antes de evidencia Junie más MERGED/conciliación de T-000.

Esta transición solo modifica tres Markdown de documentación; diff explícito revisado, docs-check60 Markdown/15 tareas/HANDOFF19/22 y `git diff --check` exit0. Regresión afectada `node --test scripts/ci/docs-check.test.mjs` host exit0,20/20 pass,0 fail/skipped; review-transition-host.log. Antes del veredicto en PR: commit/push normal, comprobar HEAD/base remotos y esperar `verify-required` SUCCESS del SHA final. El SHA final y enlace CI quedan en el comentario canónico del PR para evitar un commit posterior al veredicto. No hay recursos Docker creados por esta sesión ni cleanup adicional de stacks que ejecutar.

## Correcciones significativas

| Fecha | Causa | Corrección | Prueba |
|---|---|---|---|
| 2026-10-20 | Adjunto decía org.demo; checkout ya com.example | Dueño confirmó com.example.devnotes; se conserva paquete. Nombre visible DevNotes en config/client/E2E | 66 renombres contrastados; STARTER/FULL propio verde sobre f082659 |
| 2026-10-20 | Tests de junction rechazados por sandbox (EPERM), sin fallo de lógica demostrado | Ejecutar mismas suites en host autorizado, sin alterar tests | 62 dirigidos y83 CI local verdes; logs propios |
| 2026-10-20 | Defaults de Link podían añadir attrs fuera del contrato JSON; hook por página podía perder dirty al desmontar | Especificar href-only y coordinador de borrador/cola por identidad sobre Outlet | docs-check verde; ejecución futura T-005/T-006/T-007, sin afirmar runtime |

## Cierre y siguiente tarea

No done hasta MERGED; HANDOFF mantiene evidencia/pendientes reales. R1 solicita evidencia propia Junie E-01; el único prompt vigente está en STATUS. Después de publicarla corresponde sesión nueva frontera reviewer R2 sobre HEAD/base/CI vigentes, sin implementar T-001. Solo tras revisión favorable y merge elegible, una sesión nueva Junie implementer [T-001](T-001-document-contract.md) verifica MERGED/capacidad propia y concilia adopción antes de comenzar. No aceptar producto por cerrar adopción; I1 todavía sin implementar.
