# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-077](tasks/T-077-image-text-library-ui.md) · Guardar, abrir y borrar textos de Imagen · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `changes_requested` |
| Acción actual | Frontera implementer corrige H1 y H2 de la ronda 1 en el mismo PR |
| Rama / PR | `codex/t-077-image-text-library-ui` · [PR #80](https://github.com/MatiasNicolasAcevedo/devnotes/pull/80) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-076 quedó mergeada y conciliada.

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
| Recomendación | Evaluar el corte acumulado por la migración V8 cuando el dueño ordene el integrado. Reevaluar al mergear T-077 (cierra Imagen) |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de corrección de T-077 en MatiasNicolasAcevedo/devnotes. Sesión nueva, ronda 1 de 2.

LEER: AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/tasks/T-077-image-text-library-ui.md (checkpoint del reviewer y hallazgos H1 y H2) y server/src/test/java/com/example/devnotes/security/SecurityConfigTest.java.
PRECONDICIÓN: gh pr view 80 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid debe confirmar OPEN y base edb27c87a1097e605d0ed9d0a8dd4327911a5187. Tras git fetch origin main codex/t-077-image-text-library-ui, headRefOid debe coincidir con git log -1 --format=%H origin/codex/t-077-image-text-library-ui -- docs/STATUS.md. Si no se cumple, informá el estado real y entregá el prompt corregido.
ACCIÓN: En la rama codex/t-077-image-text-library-ui actualizada con git pull --ff-only, preservando archivos ajenos sin versionar, resolvé solo la lista cerrada. H1: agregar el @MockitoBean de ImageTextService en SecurityConfigTest. H2: agregar imageTextsExactMethodsAllowedAndOthersDenied con el patrón de voz: PUT, PATCH, HEAD y OPTIONS sobre colección e ítem, rutas vecinas con 403 y verifyNoInteractions. Sin cambios de producción. Sumá SecurityConfigTest y OpenApiContractIT al comando backend de la tarea. Spotless, commit con rutas explícitas y push.
GATE: desde server/, ./mvnw -q verify -Dtest=ImageTextServiceTest,SecurityConfigTest -Dit.test=ImageTextApiIT,OcrExtractionApiIT,OpenApiContractIT -Djacoco.skip=true con exit 0 y SecurityConfigTest 14/14. Cliente y E2E se acreditan si git diff --exit-code e1a57e34f10c9bf5757e4c7d0daa337314e3ca02 HEAD -- server/src/main client e2e da exit 0; si no, repetí sus comandos de la tarea. docs-check, git diff --check y verify-required del HEAD nuevo. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: Tarea y STATUS en in_review con evidencia por comando y exit. Terminá con el prompt de frontera reviewer independiente de T-077, ronda 2, con PR 80 y el SHA del HEAD nuevo, en STATUS y completo en la respuesta final.
```
