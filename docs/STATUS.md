# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-097](tasks/T-097-demo-page.md) |
| Estado | `in_review` |
| Siguiente acción | Frontera reviewer independiente de T-097 sobre el HEAD publicado de [PR #94](https://github.com/MatiasNicolasAcevedo/devnotes/pull/94). Gate diario del implementer en verde; [checkpoint](tasks/T-097-demo-page.md#checkpoint-vigente) |
| Rama / PR | `codex/t-097-demo-page` · [PR #94](https://github.com/MatiasNicolasAcevedo/devnotes/pull/94) |

Modo `FRONTERA_CONTINUA`. T-096 conciliada ([PR #92](https://github.com/MatiasNicolasAcevedo/devnotes/pull/92) MERGED, `5759658`). La [cola](BACKLOG.md#lote-imagen-libres-e-ia) termina con T-097: página Demo pública con el tráiler y la demo de YouTube, destino rojo en la barra superior también en móvil ([decisiones del dueño](tasks/T-097-demo-page.md#decisiones-del-dueño)). [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo, el encadenamiento del lote hasta T-085 y T-093 a T-096 (IA Free, tráiler y demo narrada) |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-094 incorpora rutas privadas y cambia Compose |

### Prompt de la siguiente sesión

```text
Frontera reviewer independiente de T-097 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la del implementer. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md y docs/tasks/T-097-demo-page.md (Decisiones del dueño, Alcance y Checkpoint vigente). PRECONDICIÓN: gh pr view 94 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup devuelve OPEN, no draft y verify-required verde sobre headRefOid; 8efa3234cb2be75f448687c6434dbd9c0d3c9f0b es ancestro de ese HEAD y git diff --name-only entre ambos solo lista docs/STATUS.md y docs/tasks/T-097-demo-page.md; si no, devolvé el paso vigente. ACCIÓN: revisá el diff contra AC-01…AC-07: enlace Demo fuera de «Navegación principal», público, color #ff6b6b, iframe youtube-nocookie montado recién al clic y sin pedidos a YouTube antes, portadas locales, sin cambios de servidor, nginx, vite.config ni CSP. Evaluá además las dos correcciones de regresión del checkpoint: T-064 pasa por Demo con Shift+Tab y T-050 espera 48 px en /notes (falla previa desde T-081, con línea base en rojo sobre origin/main). En client/: npm test -- --run src/features/demo src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx y npm run typecheck. Desde la raíz: STARTER_E2E_PROJECT=starter-e2e-t097-review bash scripts/e2e.sh --grep "demo page:" --project mobile. Abrí /demo en el stack local y comprobá a mano que un clic reproduce cada video. Ante hallazgos devolvé el mismo PR con la lista cerrada. Si aprobás, squash sin --admin ligado al HEAD revisado y verificá MERGED con gh pr view 94 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto con evidencia en la tarea y el prompt completo de la sesión siguiente (el segundo prompt de «Prompts de salida» de la tarea si quedó MERGED).
```
