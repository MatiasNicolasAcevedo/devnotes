# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-094](tasks/T-094-ai-workspace.md) · [S-116](specs/S-116-ai-workspace.md) |
| Estado | `changes_requested` |
| Siguiente acción | Frontera implementer aplica la corrección limitada autorizada por el dueño en el PR #90 ([contrato](tasks/T-094-ai-workspace.md#checkpoint-vigente)) |
| Rama / PR | `codex/t-094-ai-workspace` · [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90) |

Modo `FRONTERA_CONTINUA`. T-093 conciliada. La [cola](BACKLOG.md#lote-imagen-libres-e-ia) continúa con IA, tráiler v2 y demo narrada. [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

Piloto aprobado con cinco destinos: Groq 20B/120B, Workers AI 20B/120B y Gemini 3.1 Flash-Lite. Gemini 3.8 Flash y OpenRouter Free quedan diferidos. El selector y el compositor muestran disponibilidad, fallos y cuota. El usuario elige y confirma otro destino. [Decisión y cierre observable](tasks/T-094-ai-workspace.md#decisión-de-alcance-del-dueño). FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Pendientes del dueño

| Tema | Qué falta |
|---|---|
| PostgreSQL Free de Render | Vence el 2026-12-11 a las 22:35 de Buenos Aires si sigue la misma instancia. Antes: exportar, restaurar en local una cuenta vacía, cotejar ambos espacios y recién entonces reemplazar la base. [Procedimiento](DEPLOYMENT.md#respaldo-y-reemplazo-de-postgresql-free) |
| Sonda interna en Render | Ensayo pendiente de autorización expresa sobre SHA y ventana. [Receta](DEPLOYMENT.md#ensayo-de-la-sonda-interna-en-render-free) |
| SP-06 | Prueba en Android físico con teclado real y zoom nativo |
| Limpieza local | Hay decenas de worktrees en `.orchestrator/`, ramas locales ya mergeadas y siete stashes viejos. Listarlos y decidir cuáles se borran; ningún agente los elimina sin esa decisión |

Render: Auto-Deploy **On Commit** para `main`; cada merge despliega, también los documentales.

## Gates diferidos

| Dato | Valor |
|---|---|
| Último integrado válido | FULL local del 2026-11-15 sobre `398801f` ([T-069](tasks/T-069-ocr-workspace.md#evidencia-del-full-de-cierre)); STARTER de T-068 conservado |
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo y el encadenamiento del lote hasta T-085 |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-094 incorpora rutas privadas y cambia Compose |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de corrección limitada de T-094 en MatiasNicolasAcevedo/devnotes. Sesión nueva, PR #90, rama codex/t-094-ai-workspace. Registrá rol, herramienta y modelo realmente expuestos.

LEER: AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/TESTING.md#gate-diario, el checkpoint vigente de docs/tasks/T-094-ai-workspace.md (contrato cerrado y hallazgos de la revisión de la corrección extraordinaria) y docs/specs/S-116-ai-workspace.md.

PRECONDICIÓN: gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup,mergedAt,mergeCommit y git fetch origin main codex/t-094-ai-workspace. Exigí OPEN, isDraft=false, base dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795, HEAD igual a origin/codex/t-094-ai-workspace y el checkpoint de esta autorización presente en ese HEAD. Si difiere, registrá el hecho y devolvé el paso vigente sin editar código.

ACCIÓN: dentro del contrato cerrado y nada más. 1) Rojo previo: OpenRouterCatalogTest con estado entero 18446744073709551616 en la ruta exacta, y AiWorkspace.test.tsx con 429 y Retry-After: 0; registrá ambos exit 1. 2) OpenRouterCatalog: estado operativo solo si es cero exacto sin conversión que trunque; fuera de rango, decimal, negativo o ausente queda indisponible en GET y rechazado antes del despacho, con cero llamadas al doble de inferencia. 3) AiPage/AiProvider: con espera cero conservar el aviso accesible «Límite temporal del proveedor» (ai-rate-limit) o «Cuota agotada» (ai-quota) en selector, compositor y región viva, Enviar habilitado sin espera adicional, borrador y fragmento intactos, sin reenvío; solo una nueva pulsación de Enviar produce el segundo POST. Conservar espera positiva, rehabilitación manual sin espera válida y ai-busy local. Conservá cinco destinos, dos diferimientos, cuatro adaptadores y Render Auto-Deploy On Commit. Sin inferencia real ni cambios de dependencias, permisos o datos.

GATE: desde Git Bash con JDK 21, Node >=24 y Docker, los comandos de Aceptación y pruebas de T-094: Maven verify dirigido con Failsafe sobre PostgreSQL 18.6, Vitest de rutas, shell y feature ai con npm run typecheck, E2E filtrados con dobles 'ai workspace:' escritorio y 'ai workspace: navbar' móvil con STARTER_E2E_PROJECT únicos (regresión 'screenshot OCR:|voice' solo si cambia el doble compartido), cleanup por label exacto, docs-check sobre el árbol versionado y verify-required verde sobre el HEAD publicado. bash scripts/verify.sh --policy origin/main solo informa. FULL/STARTER: DIFERIDO POR EL DUEÑO. Máximo tres correcciones distintas por bloqueo.

SALIDA: commits Conventional en inglés con Refs: T-094 y staging explícito; push normal al mismo PR. Reemplazá el checkpoint de T-094 con tabla causa/arreglo/prueba-SHA y comandos con exit, STATUS en review con el prompt de reviewer independiente (veredicto sobre los dos P2 y el gate; si aprueba, squash con --match-head-commit y MERGED confirmado con gh pr view --repo explícito; si persiste un hallazgo, PR abierto y prompt al dueño). T-095 sigue condicionada a MERGED confirmado. Terminá con ese prompt completo.
```
