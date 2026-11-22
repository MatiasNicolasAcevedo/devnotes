# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-079](tasks/T-079-free-notes-xlsx.md) · Recuperar notas libres en XLSX v4 · [S-113](specs/S-113-free-notes.md) |
| Estado | `in_review` |
| Acción actual | Revisión independiente de la corrección XLSX v4 · ronda 2 |
| Rama / PR | `codex/t-079-free-notes-xlsx` · [PR #82](https://github.com/MatiasNicolasAcevedo/devnotes/pull/82) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-078 quedó mergeada y conciliada.

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales) y la adopción documental del flujo |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene |

### Prompt de la siguiente sesión

```text
Actuá como frontera reviewer independiente de T-079 en MatiasNicolasAcevedo/devnotes. Sesión nueva, ronda 2 del PR 82.

LEER: AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-079-free-notes-xlsx.md, S-113, el documento de Libres en S-114, la portabilidad incremental de S-112 y los hallazgos de la ronda 1 del PR 82.
PRECONDICIÓN: gh pr view 82 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, listo, base main en 311e47c1ca6d64f81c3bc1950ec6687a3d418ea7 y verify-required SUCCESS. En el checkout del HEAD remoto, comprobá que headRefOid coincide con git log -1 --format=%H -- docs/STATUS.md y que git rev-parse HEAD^ devuelve 63b4f5d032b4b07608cfb19aec9cb493ce3c1a9b.
ACCIÓN: Revisá el diff publicado contra la base y verificá ambos cierres. El writer exige v4 y conserva todas las aserciones del layout v2. El lector rechaza v5 y las otras cuatro variantes con IMPORT_UNSUPPORTED_FORMAT, sin hoja ni fila. Verificá que las versiones conocidas con esquema inválido conservan sus negativos.
GATE: Validá las 66 pruebas verdes del comando dirigido de la corrección, la igualdad de las fuentes que respaldan el resto del gate diario y docs-check. Repetí los dirigidos que exija el riesgo. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: Si aprobás, seguí el protocolo de reviewer y AUTONOMY para la transición documental, la CI del nuevo HEAD, el squash ligado al SHA aprobado y la confirmación de MERGED con fecha y merge SHA. Si queda un hallazgo, entregalo a frontera o al dueño con evidencia y condición de cierre. Conservá Render Auto-Deploy On Commit.
```
