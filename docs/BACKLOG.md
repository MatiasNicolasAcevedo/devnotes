# Cola del producto

Acción actual en [STATUS](STATUS.md); estado y evidencia en cada tarea. Este índice solo cambia al cambiar la cola o sus dependencias.

## Actual · Referencias y copiado

- [T-022](tasks/T-022-reference-search.md): búsqueda privada de referencias; primera tarea de la iteración, antes de voz.
- [T-023](tasks/T-023-copy-actions.md): copiar título, descripción y nota; depende de T-022.
- [T-024](tasks/T-024-reference-document.md) → [T-025](tasks/T-025-reference-insertion.md) → [T-026](tasks/T-026-reference-preview.md): contratos [S-106](specs/S-106-reference-links.md), draft por dependencia MERGED.

El dueño amplió T-020 el 2026-10-26 para resolver navegación por fecha, preparación OIDC de dos actores y recorridos de versiones dentro de la misma entrega. La reparación pertenece a T-020; I2 continúa sin habilitar.

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

## Próximo · Referencias y copiado

Intención del dueño del 2026-10-27, especificada en S-106 tras cerrar T-021/PR22. Mantener Referencia como lista privada independiente para apuntes rápidos y añadir estas capacidades antes de encarar voz:

- Desde una nota diaria, escribir `@` para buscar referencias propias, elegir una e insertar una vinculación que permita identificarla después. La búsqueda y selección deben servir también con teclado.
- Consultar rápidamente el contenido de la referencia desde la nota mediante una vista previa. El dueño propone hover sin clic y deja abierta la mejor interacción; definir una alternativa accesible con foco/teclado y pantallas táctiles, sin ocultar el contenido necesario a quien no use mouse.
- Agregar acciones con icono para copiar el título y la descripción de las referencias y el texto de la nota diaria, conservando la selección y copia habituales con Ctrl+C. Definir el alcance exacto de la copia de la nota con enlaces y separadores y mostrar éxito o error real del portapapeles.

S-106 concreta búsqueda privada, vinculación, copia, vista previa y pruebas. La nota y el historial muestran el contenido vigente; tras borrar el original indican que no está disponible. No asumir que la referencia existe para siempre ni comprometer el aislamiento por cuenta o las versiones históricas. Estas son solicitudes pendientes, no funcionalidades implementadas ni aceptación de un diseño técnico.

## Posterior · I2 voz

[S-105](specs/S-105-voice-notes.md) registra intención confirmada y propuesta de transcribir al detener, editar/copiar/guardar/consultar/borrar texto privado. El dueño reiteró el 2026-10-27 que quiere abordar voz después de resolver y pulir lo pendiente, con ensayos de transcripción y copia manual a otros destinos. [T-017](tasks/T-017-voice-readiness.md), frontera planner draft, valida Groq/Whisper/configuración con audio ficticio y convierte sus seis paquetes ordenados en contratos Junie pequeños. Reconfirmar condiciones y disponibilidad del nivel gratuito antes de habilitarlo; no se garantiza cuota ni se autoriza contratar un plan. No son tareas de implementación ready todavía; ninguna depende para I1. Sin audio enviado ni servicio contratado por esta planificación.

## Fuera de I1

Además de I2 registrada, los demás objetivos opcionales de PROJECT_CONTEXT/ROADMAP siguen sin contrato ni ejecución autorizada. No usar el microensayo genérico de errorMessage como otra tarea/PR de adopción; T-001 fue la primera implementación de producto. Conservar E-01 aceptado y comprobar solo capacidades pertinentes en la superficie propia; no atribuir a Junie pruebas de frontera.
