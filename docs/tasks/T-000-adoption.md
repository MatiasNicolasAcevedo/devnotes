---
id: T-000
status: in_progress
priority: P1
size: M
executor: frontier
role: implementer
milestone: M0
spec: null
spec_version: null
branch: chore/t-000-adoption
pr: null
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

## Comprobación de Junie en su sesión revisora

Frontera no abre otra sesión Junie: SETUP/TOOLS exigen que dueño/Junie comprueben la superficie elegida. El dueño abre una **sesión nueva Junie reviewer T-000**, no una implementación paralela. Registrar raíz/checkouts y rutas AGENTS/STATUS/T-000 leídas; modelo/herramienta/esfuerzo solo lo expuesto. Consultar /mcp y /skills (o mecanismo que exponga esa instalación), actualizar filas de .junie/TOOLS.md con nombres/fecha/superficie/origen/estado y sonda saneada para las herramientas necesarias. No leer configuración privada ni secretos, no instalar/autenticar ni delegar.

Mínimo para revisar/continuar: lectura/edición del repo, terminal Git Bash/Node/Docker, acceso Git/PR/CI autorizado en este repo y capacidad de devolver diff/exit/log. Comprobar `git status --short --branch`, `node --version`, `docker version --format '{{.Server.Version}}'`, `gh pr view --json number,state,headRefOid,baseRefOid` desde esta rama y `node scripts/docs-check.mjs`; si se usa GitHub MCP en vez de gh, sonda equivalente de solo lectura al PR. No ejecutar el microensayo en una copia ni tocar errorMessage durante T-000. Herramientas opcionales ausentes no bloquean si el shell autorizado cubre la función; registrar límite. Si una capacidad indispensable falta, checkpoint bloqueado sin fingir resultado.

Luego revisar T-000 por reviewer.md, incluidas nuevas specs/tareas, evidencia STARTER y diff completo. La sesión puede registrar inventario y transición documental de esta adopción, publicar el SHA final, esperar CI y emitir veredicto independiente. Si no hay bloqueantes puede mergear por AUTONOMY. No implementar T-001 en esa sesión; dejar STATUS con prompt de sesión nueva Junie implementer T-001, primera comprobación MERGED de T-000.

## Checkpoint vigente

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

Pendiente inmediato: docs-check final/dirigidos, commit local/huella, STARTER y cleanup; después publicar PR y CI. Junie E-01 y revisión independiente siguen pendientes de su sesión, no reemplazables por ejecuciones de frontera.

## Correcciones significativas

| Fecha | Causa | Corrección | Prueba |
|---|---|---|---|
| 2026-10-20 | Adjunto decía org.demo; checkout ya com.example | Dueño confirmó com.example.devnotes; se conserva paquete. Nombre visible DevNotes en config/client/E2E | Gate de identidad y FULL pendientes |

## Cierre y siguiente tarea

No done hasta MERGED; HANDOFF mantiene evidencia/pendientes reales. Siguiente sesión reviewer Junie T-000 comprueba primero PR/HEAD/base/árbol y capacidades propias; luego revisión independiente. Tras merge, sesión nueva implementer [T-001](T-001-document-contract.md) verifica MERGED y concilia adopción antes de comenzar validación de documento. No aceptar producto por el solo cierre de adopción; I1 todavía sin implementar.
