# Cola del producto

Acción actual en [STATUS](STATUS.md); estado y evidencia en cada tarea. Este índice solo cambia al cambiar la cola o sus dependencias.

## En curso

- [T-000](tasks/T-000-adoption.md): adopción propia, validación y traspaso; única tarea en vuelo. Contratos I1 se publican en este PR, sin PR extra de planificación.

## Siguientes · I1

Cada fila depende de MERGED y conciliación de la anterior; contratos completos, draft solo por esa dependencia. Estados canónicos en tareas, sin duplicarlos aquí. La próxima habilitada es T-001 después de T-000; ninguna de negocio ready por herencia.

| Orden | Contrato / resultado | Dependencia |
|---|---|---|
| 1 | [T-001](tasks/T-001-document-contract.md) · JSON/validación | T-000 + evidencia Junie |
| 2 | [T-002](tasks/T-002-daily-persistence.md) · DB privada por fecha | T-001 |
| 3 | [T-003](tasks/T-003-daily-service.md) · Guardado concurrente | T-002 |
| 4 | [T-004](tasks/T-004-daily-api.md) · HTTP privado | T-003 |
| 5 | [T-005](tasks/T-005-editor-foundation.md) · Editor/números/dependencias | T-004; control de avance de cinco tras merge |
| 6 | [T-006](tasks/T-006-daily-client.md) · Cola/cliente guardado | T-005 |
| 7 | [T-007](tasks/T-007-daily-workspace.md) · Pantalla por fecha | T-006 |
| 8 | [T-008](tasks/T-008-separator-editing.md) · Separadores | T-007 |
| 9 | [T-009](tasks/T-009-text-links.md) · Enlaces | T-008 |
| 10 | [T-010](tasks/T-010-version-storage.md) · Copia transaccional | T-009; control de avance de cinco tras merge |
| 11 | [T-011](tasks/T-011-version-api.md) · HTTP versiones | T-010 |
| 12 | [T-012](tasks/T-012-version-history.md) · Historial readonly | T-011 |
| 13 | [T-013](tasks/T-013-version-save.md) · Acción manual/flush/reemplazo | T-012 |
| 14 | [T-014](tasks/T-014-mvp-journey.md) · CA-01…06 de punta a punta | T-013; salida I1 y retorno a frontera |

## Fuera de I1

Objetivos opcionales en PROJECT_CONTEXT/ROADMAP, sin ejecución autorizada. No usar el microensayo genérico de errorMessage como otra tarea/PR de adopción; la primera implementación de producto es T-001. Primera revisión T-000 por frontera en sesión nueva, decisión expresa del dueño. La comprobación de herramientas Junie requiere sesión propia como evidencia E-01; no atribuirle pruebas de frontera ni habilitar negocio sin precondiciones.
