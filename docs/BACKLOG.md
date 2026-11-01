# Cola del producto

Acción actual en [STATUS](STATUS.md); estado y evidencia en cada tarea. Este índice solo cambia al cambiar la cola o sus dependencias.

## Hechas · S-106 completada

S-106 completa con las 5 tareas MERGED (T-022 a T-026), control de cinco por Junie cumplido. Frontera toma voz por decisión del dueño del 2026-10-31; contrato de I2 preparado.

- [T-026](tasks/T-026-reference-preview.md): PR29 MERGED `0d976dc`.
- [T-025](tasks/T-025-reference-insertion.md): PR28 MERGED `9a14044`.
- [T-024](tasks/T-024-reference-document.md): PR27 MERGED `e049e3c`.
- [T-023](tasks/T-023-copy-actions.md): PR24 MERGED `b0ebaae`.
- [T-022](tasks/T-022-reference-search.md): PR23 MERGED `ca9d44d`.

El dueño amplió T-020 el 2026-10-26 para resolver navegación por fecha, preparación OIDC de dos actores y recorridos de versiones dentro de la misma entrega. La reparación pertenece a T-020; no se reabre para I2.

## Hechas

- [T-021](tasks/T-021-editor-ergonomics.md): PR22 MERGED `8e09525`.

- [T-020](tasks/T-020-editor-usability.md): editor, navegación por fecha y versiones; PR20 MERGED `cde66f4`.
- [T-019](tasks/T-019-agent-operating-rules.md): observaciones operativas aplicadas, PR6 MERGED 16f6d53; no cuenta para ciclo de producto.
- [T-001](tasks/T-001-document-contract.md): contrato de contenido; MERGED/conciliada en PR4.
- [T-002](tasks/T-002-daily-persistence.md): persistencia privada por fecha; MERGED/conciliada en PR5.

- [T-000](tasks/T-000-adoption.md): adopción MERGED/conciliada; evidencia propia y aceptación E-01 conservadas en la tarea/PR1. No acredita implementación I1.
- [T-015](tasks/T-015-adoption-checks.md): mantenimiento previo MERGED/conciliado, PR2/squashb52b1fd; no cuenta para ciclo I1.
- [T-018](tasks/T-018-docs-fixture-independence.md): fixtures de adopción aislados, PR3 MERGED 7b53ad2; no cuenta para ciclo I1.
- [T-016](tasks/T-016-daily-draft-coordinator.md): borrador/cola serial/flush, PR11 MERGED 4499962; cuenta para ciclo I1.

## Siguientes · I1

Quince contratos de producto I1 completados (T-003 y T-014 mergeadas). T-021 MERGED después de I1. Las dependencias históricas se muestran para trazabilidad. Estados canónicos en tareas. Los IDs no fijan el orden: T-016 se inserta entre T-006/T-007 para separar cola y transporte; no es una capacidad adicional.

| Orden | Contrato / resultado | Dependencia |
|---|---|---|
| 1 | [T-001](tasks/T-001-document-contract.md) · JSON/validación | T-000/T-015 cerradas + T-018 + evidencia Junie conservada |
| 2 | [T-002](tasks/T-002-daily-persistence.md) · DB privada por fecha | T-001 |
| 3 | [T-003](tasks/T-003-daily-service.md) · Guardado concurrente | T-002 |
| 4 | [T-004](tasks/T-004-daily-api.md) · HTTP privado | T-003 |
| 5 | [T-005](tasks/T-005-editor-foundation.md) · Editor/números/dependencias | T-004; control de avance de cinco tras merge |
| 6 | [T-006](tasks/T-006-daily-client.md) · HTTP/Query privado | T-005 |
| 7 | [T-016](tasks/T-016-daily-draft-coordinator.md) · Borrador/cola serial/flush | T-006 |
| 8 | [T-007](tasks/T-007-daily-workspace.md) · Pantalla por fecha | T-016 |
| 9 | [T-008](tasks/T-008-separator-editing.md) · Separadores | T-007 |
| 10 | [T-009](tasks/T-009-text-links.md) · Enlaces | T-008; control de avance de cinco tras merge |
| 11 | [T-010](tasks/T-010-version-storage.md) · Copia transaccional | T-009 |
| 12 | [T-011](tasks/T-011-version-api.md) · HTTP versiones | T-010 |
| 13 | [T-012](tasks/T-012-version-history.md) · Historial readonly | T-011 |
| 14 | [T-013](tasks/T-013-version-save.md) · Acción manual/flush/reemplazo | T-012 |
| 15 | [T-014](tasks/T-014-mvp-journey.md) · CA-01…06 de punta a punta | T-013; control de quince, salida I1 y retorno a frontera |

## Próximo · I2 / M2-RC1 voz

Próxima acción: [T-028](tasks/T-028-voice-api.md), Junie reviewer en sesión nueva, CRUD/listado HTTP de notas de voz. T-027 ya MERGED (PR31 `cf518dc`). [S-105 v2](specs/S-105-voice-notes.md) sustituye el draft; [VOICE-RELEASE](VOICE-RELEASE.md) fija versión, activación y pruebas del dueño.

El dueño decidió priorizar voz el 2026-10-31. T-017 y T-027 MERGED; T-028 en revisión. Las otras diez tareas están completamente especificadas y draft exclusivamente por la dependencia indicada. No requieren otra sesión planner entre implementaciones. WIP1 y revisión independiente; no PR separado de planificación.

| Orden | Contrato / resultado | Dependencia |
|---|---|---|
| 1 | [T-017](tasks/T-017-voice-readiness.md) · Disponibilidad privada apagada + contratos | T-026 MERGED |
| 2 | [T-027](tasks/T-027-voice-storage.md) · Tabla y servicio CAS privado | T-017 MERGED |
| 3 | [T-028](tasks/T-028-voice-api.md) · CRUD/listado HTTP | T-027 MERGED |
| 4 | [T-029](tasks/T-029-voice-transcription.md) · Adaptador/endpoint con IT ficticio | T-028 MERGED |
| 5 | [T-030](tasks/T-030-voice-transport.md) · Proxies/Compose/doble externo; control de cinco tras merge | T-029 MERGED |
| 6 | [T-031](tasks/T-031-voice-harness.md) · Reparar filtros/lifecycle y E2E de transporte | T-030 MERGED |
| 7 | [T-032](tasks/T-032-voice-client.md) · HTTP multipart y Query privada | T-031 MERGED |
| 8 | [T-033](tasks/T-033-voice-recorder.md) · Captura/ciclo de vida | T-032 MERGED |
| 9 | [T-034](tasks/T-034-voice-workspace.md) · Pantalla nueva, edición/copia/guardado | T-033 MERGED |
| 10 | [T-035](tasks/T-035-voice-library.md) · Colección/consulta/corrección/borrado; control de diez tras merge | T-034 MERGED |
| 11 | [T-036](tasks/T-036-voice-navigation.md) · Guardia navegación/sesión/daily | T-035 MERGED |
| 12 | [T-037](tasks/T-037-voice-release.md) · Recorrido/evidencia/entrega M2-RC1 | T-036 MERGED |

Controles de cinco/diez por Junie tras T-030/T-035; retorno a frontera al entregar T-037/M2-RC1 o decisión fuera del contrato. La versión técnica se verifica con API/DB/OIDC propios reales, micrófono ficticio y doble externo; cuenta/clave/cuota/retención y ensayo Groq real son pendientes de activación explícitos, no evidencia inventada ni un bloqueo de la construcción apagada. No se envió audio ni se contrató servicio.

## Posterior a M2-RC1

Pruebas personales del dueño sobre el SHA entregado; frontera agrupa correcciones/mejoras a partir de resultados. Sin nuevas capacidades ready ahora. Fuera de esta versión: streaming, audio persistido, integración automática con CLI/daily, Safari/iOS, despliegue y pagos. Opciones de ROADMAP conservan su carácter futuro.

## Fuera de I1

Además de I2 registrada, los demás objetivos opcionales de PROJECT_CONTEXT/ROADMAP siguen sin contrato ni ejecución autorizada. No usar el microensayo genérico de errorMessage como otra tarea/PR de adopción; T-001 fue la primera implementación de producto. Conservar E-01 aceptado y comprobar solo capacidades pertinentes en la superficie propia; no atribuir a Junie pruebas de frontera.
