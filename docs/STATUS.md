# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-078](tasks/T-078-free-notes-storage.md) · Persistencia privada para notas libres · [S-113](specs/S-113-free-notes.md) |
| Estado | `in_progress` |
| Acción actual | Implementar y verificar almacenamiento interno de Libres |
| Rama / PR | `codex/t-078-free-notes-storage` |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-077 quedó mergeada y conciliada.

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
| Recomendación | T-077 cierra Imagen y suma reglas nuevas en `SecurityConfig`: recomendable el integrado del corte acumulado (migración V8 incluida) cuando el dueño lo ordene |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de T-078 en MatiasNicolasAcevedo/devnotes. Sesión nueva si quedó pendiente.

LEER: AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-078-free-notes-storage.md, S-113 y el documento de Libres en S-114.
PRECONDICIÓN: git merge-base --is-ancestor 84151b0a782760e278280abd344ce9ad3e0a285f codex/t-078-free-notes-storage debe devolver 0.
ACCIÓN: Retomá la rama T-078 y su checkpoint. Implementá y verificá la persistencia privada de notas libres. Publicá un solo PR contra main.
GATE: Backend dirigido según T-078, docs-check y verify-required del HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: PR listo para revisión independiente, con checkpoint y prompt de reviewer en STATUS y en el chat. Conservá Render Auto-Deploy On Commit.
```
