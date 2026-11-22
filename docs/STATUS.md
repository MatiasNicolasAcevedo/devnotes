# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-085](tasks/T-085-side-reading.md) · Consulta al lado · [S-115](specs/S-115-side-reading.md) |
| Estado | `mergeable` |
| Acción actual | Verificar la CI del HEAD de transición y hacer squash del PR #88 |
| Rama / PR | `codex/t-085-side-reading` · [PR #88](https://github.com/MatiasNicolasAcevedo/devnotes/pull/88) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-084 quedó mergeada y conciliada.

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo y el encadenamiento del lote hasta T-084 |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-080 incorpora rutas privadas en Spring Security |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de T-086 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-085-side-reading.md, docs/tasks/T-086-ai-groq-api.md y docs/specs/S-116-ai-workspace.md.

PRECONDICIÓN: gh pr view 88 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit debe confirmar MERGED, mergedAt válido y mergeCommit.oid válido. Tras git fetch origin main, comprobá con git merge-base --is-ancestor que ese SHA esté en origin/main. Si difiere, informá el estado real y entregá el prompt vigente.

ACCIÓN: Partí de origin/main en codex/t-086-ai-groq-api. Conciliá T-085 a done con el merge confirmado en el primer commit. Implementá options/messages y Groq según T-086 y S-116, con habilitación cerrada por cuenta y proveedor y clave separada de Voz. Usá datos ficticios y el doble del proveedor. Publicá un solo PR contra main.

GATE: Desde server/ con Git Bash, JDK 21 y PostgreSQL Testcontainers, ejecutá ./mvnw -q verify -Dtest=GroqAiClientTest,AiMessageServiceTest -Dit.test=AiMessageApiIT,VoiceTranscriptionApiIT -Djacoco.skip=true. Registrá fases y cantidades, docs-check, git diff --check y verify-required del HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Registrá HEAD, base y evidencia en T-086. Dejá el prompt de una sesión nueva de frontera reviewer independiente en STATUS y completo al final de la respuesta. Preservá Render Auto-Deploy On Commit.
```
