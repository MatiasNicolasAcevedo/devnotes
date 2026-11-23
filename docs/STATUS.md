# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-094](tasks/T-094-ai-workspace.md) · [S-116](specs/S-116-ai-workspace.md) |
| Estado | `in_review` |
| Siguiente acción | Frontera reviewer independiente revisa el PR #90 y su gate |
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
Actuá como frontera reviewer independiente de T-094 en MatiasNicolasAcevedo/devnotes. Sesión nueva, PR #90 y rama codex/t-094-ai-workspace.

LEER: AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-094-ai-workspace.md, docs/specs/S-116-ai-workspace.md, la sección IA de docs/design/WRITING-WORKSPACES.md y la muestra ficticia citada de T-072.

PRECONDICIÓN: ejecutá gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup y git fetch origin main codex/t-094-ai-workspace. Confirmá OPEN, isDraft=false, verify-required SUCCESS, base dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795 y refs de origin iguales a GitHub. El HEAD de revisión es el único commit sobre 15e94c4f69d5e2f172627a262f440f7ad3f1a331 que publica este checkpoint. Verificalo con git rev-parse origin/codex/t-094-ai-workspace^ y git diff --name-only 15e94c4f69d5e2f172627a262f440f7ad3f1a331..origin/codex/t-094-ai-workspace, cuyo resultado debe limitarse a docs/STATUS.md y docs/tasks/T-094-ai-workspace.md. Si cambió la precondición o no se puede verificar, informá el estado real y entregá el prompt corregido.

ACCIÓN
1. Revisá en un worktree aislado el diff publicado contra esa base y cotejá cada condición de S-116/T-094 con el código y el gate. Acreditá cinco destinos elegibles, ambos diferidos rechazados por POST sin inferencia, acceso a fragmentos y cuatro adaptadores conservados.
2. Verificá la comprobación compartida de ruta Free exacta, negativos de cero despacho, vencimiento y refresco deduplicado, y el positivo restringido de OpenRouter con el doble. Cotejá la cuota observada de Groq, los estados accesibles, el borrador, 429, timeout y que seleccionar, refrescar o habilitar un intento no envía texto.
3. Cotejá las cinco respuestas reales de la muestra ficticia que el dueño aceptó, la evidencia pública de metadatos de OpenRouter y las dos condiciones de reactivación. Conservá los datos reales fuera del piloto y Render Auto-Deploy On Commit.
4. Si hay hallazgos, registralos con SHA, evidencia y condición de cierre según el protocolo y el límite de rondas. Si aprobás, publicá la transición documental, confirmá la nueva CI y el veredicto sobre el SHA revisado final, hacé el squash según AUTONOMY y verificá MERGED, mergedAt y mergeCommit.oid con gh pr view y --repo explícito.

GATE: comprobá el gate diario del implementer y corré solo pruebas dirigidas de los riesgos encontrados y docs-check. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: entregá el veredicto sustentado y terminá con el prompt vigente completo según el cierre.
```
