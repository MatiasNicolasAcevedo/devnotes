# Cola del producto

Acción actual en [STATUS](STATUS.md); estado y evidencia en cada tarea. Este índice solo cambia al cambiar la cola o sus dependencias.

Próxima acción: [T-049](tasks/T-049-voice-retest.md), reensayar con Groq y el dueño tras T-048 MERGED.

## Siguientes · plan del dueño del 2026-11-10

Orden decidido por el dueño: (1) activar Groq y probar M2-RC1; (2) exportar e importar la cuenta en `.xlsx` y probarlo; (3) si todo sale bien, desplegar el piloto en Render. Contratos: [VOICE-RELEASE](VOICE-RELEASE.md), [S-107](specs/S-107-xlsx-portability.md) y [S-108](specs/S-108-render-pilot.md), con la receta técnica en [DEPLOYMENT](DEPLOYMENT.md#piloto-de-devnotes-en-render-free). Cada tarea `draft` tiene el contrato completo y espera solo a la anterior: quien concilia un MERGED habilita la siguiente sin volver a frontera. WIP 1, una sesión nueva por tarea y por revisión.

| Orden | Contrato / resultado | Ejecuta | Dependencia |
|---|---|---|---|
| 2 | [T-049](tasks/T-049-voice-retest.md) · Reensayo sintético con Groq | Dueño con un agente de frontera | T-048 MERGED |
| 3 | [T-040](tasks/T-040-daily-timestamps.md) · Instantes de daily y versiones a microsegundos (bugfix previo a exportar) | Junie | T-049 favorable y MERGED |
| 4 | [T-041](tasks/T-041-xlsx-codec.md) · Codec `devnotes-xlsx` v1 y límites | Junie | T-040 MERGED |
| 5 | [T-042](tasks/T-042-xlsx-export-api.md) · GET de exportación privada | Junie | T-041 MERGED |
| 6 | [T-043](tasks/T-043-xlsx-import-api.md) · Vista previa e importación atómica en cuenta vacía, y proxies | Junie | T-042 MERGED |
| 7 | [T-044](tasks/T-044-xlsx-client.md) · Pantalla «Datos» y control de cinco tras el merge | Junie | T-043 MERGED |
| 8 | [T-045](tasks/T-045-xlsx-journey.md) · E2E de ida y vuelta y prueba del dueño | Junie y el dueño | T-044 MERGED |
| 9 | [T-046](tasks/T-046-render-image.md) · Imagen única y smoke local con 512 MB | Junie | T-045 MERGED y aceptada |
| 10 | [T-047](tasks/T-047-render-first-deploy.md) · Primer deploy, migración `.xlsx` y aceptación | Dueño con un agente de frontera | T-046 MERGED |

Retorno a frontera si T-049 resulta fallida o indeterminada, si el dueño emite «no aceptada» en T-045 o T-047, ante una decisión fuera de contrato o al cerrar T-047. Los hallazgos del dueño se registran aquí con pasos, esperado/observado, navegador y SHA.

### Hallazgos de T-039

- **Bloqueante para la transcripción real.** En Edge 157.0.4341.42, SHA `c63038d` (fuentes `aef4213`), iniciar sesión local, abrir Voz, grabar la muestra técnica de ~30,4 s con micrófono sintético y pulsar «Detener y transcribir». Se esperaba HTTP 200 con texto editable. DevNotes devolvió HTTP 502 `VOICE_INVALID_RESPONSE`. El silencio y la segunda nota reprodujeron el mismo 502. Al revisar `GroqTranscriptionClient`, el multipart contiene solo `file`. El estado exacto de Groq quedó sin medir. Corrección en [T-048](tasks/T-048-groq-multipart-fix.md) y reensayo en [T-049](tasks/T-049-voice-retest.md). [Evidencia del ensayo](VOICE-RELEASE.md#resultado-de-t-039)

- **Hallazgo de revisión del adaptador (2026-11-10, `c5e37cc`).** `GroqTranscriptionClient.parseResponse` consulta `no_speech_prob` solo con texto en blanco. Una respuesta con texto no vacío y todos los segmentos en el umbral o por encima podría pasar aunque S-105 exige 422. Queda fuera de la serialización saliente de T-048. Si el silencio de T-049 devuelve texto, detener el reensayo y concretar la corrección en frontera antes de declarar voz real verificada. [Regla de S-105](specs/S-105-voice-notes.md#adaptador-y-errores)

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

## Hechas · I2 / M2-RC1 voz

M2-RC1 entregada como RC técnica en [T-037](tasks/T-037-voice-release.md), PR44 MERGED, squash `aef4213` (2026-11-10). [T-039](tasks/T-039-voice-activation.md) cerró la primera ronda con el dueño y quedó conciliada tras PR46 MERGED. [S-105 v2](specs/S-105-voice-notes.md) y [VOICE-RELEASE](VOICE-RELEASE.md) fijan el contrato y la entrega.

El dueño decidió priorizar voz el 2026-10-31. T-017 y T-027…T-038 están conciliadas como MERGED.

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
| 11 | [T-038](tasks/T-038-reference-preview-fix.md) · Bugfix inserción de referencia / E2E reference-preview | T-035 MERGED |
| 12 | [T-036](tasks/T-036-voice-navigation.md) · Guardia navegación/sesión/daily | T-035 y T-038 MERGED |
| 13 | [T-037](tasks/T-037-voice-release.md) · Recorrido/evidencia/entrega M2-RC1 | T-036 MERGED |

Controles de cinco/diez por Junie tras T-030/T-035; retorno a frontera al entregar T-037/M2-RC1 o decisión fuera del contrato. La versión técnica se verifica con API/DB/OIDC propios reales, micrófono ficticio y doble externo; cuenta/clave/cuota/retención y ensayo Groq real son pendientes de activación explícitos, no evidencia inventada ni un bloqueo de la construcción apagada. No se envió audio ni se contrató servicio.

Hallazgo fuera de alcance de T-035 (5.ª revisión PR40, 2026-11-09), heredado de T-034 y presente en main `085dc76`: en `client/src/features/voice/VoiceComposer.tsx` el efecto que llama a `draft.transcribe()` depende de `draft` (objeto nuevo en cada render) y de `recorder.result`, que sigue fijado tras detener; cada render vuelve a transcribir, incrementa la generación y lanza otra petición hasta que llega la respuesta. Una prueba descartable con el grabador simulado devolviendo `result` en `idle` colgó el worker de Vitest (bucle de render). Riesgo: varias transcripciones por intento (S-105 §4: una sola petición) y cupo Groq. Las pruebas actuales simulan el grabador sin resultado y no lo detectan. Corregir antes de T-037, con prueba roja «un stop con resultado dispara exactamente un POST de transcripción». **Asignado a T-036** por decisión del dueño (2026-11-09): paso 4 y aceptación de su contrato. No confundir con el bucle de render del efecto de sincronización de captura, ya corregido en T-035 (8ac04b4).

Prueba faltante no bloqueante de T-035 (8.ª revisión PR40, 2026-11-09, sin pérdida de datos): la guarda `if (prev.conflict != null) return prev` de `loadNote` (`client/src/features/voice/useVoiceDraft.ts:183`) no tiene prueba propia; quitarla deja la suite verde porque los casos con conflicto `update` ya son `dirty`. Solo decide con borrador `clean` y conflicto `delete`: si el 409 del DELETE llega antes que un refetch del detalle en vuelo con revisión nueva, sin la guarda el diálogo se cerraría solo y el editor mostraría la revisión remota (S-105 §7: nunca actualizar automáticamente; no hay texto sin guardar en riesgo). Añadir en VoicePage.test.tsx la variante de «B-1 … durante el borrado» liberando primero el DELETE (409) y después el GET, que exija el diálogo abierto y «Texto 1»; debe fallar al quitar la guarda.

Hallazgo fuera de alcance de T-037 (2026-11-10), **asignado a [T-040](tasks/T-040-daily-timestamps.md)** por planificación de frontera del 2026-11-10, que también incluye `DailyVersionService`. `DailyNoteService.nowMicros()` (`server/src/main/java/com/example/devnotes/daily/application/DailyNoteService.java`) repite el patrón que T-037 corrigió en voz: `Instant.ofEpochMilli(clock.millis()).plusNanos(...)` suma dos veces la fracción de milisegundos y adelanta `createdAt`/`updatedAt` hasta casi 1 s, en lugar de truncar a microsegundos. Las pruebas usan instantes sin fracción y no lo detectan. Riesgo: marcas de tiempo de daily y versiones desplazadas y orden temporal no fiable. Corregir con prueba unitaria roja con reloj fijo de fracción no nula, como `VoiceNoteServiceTest`.

Hallazgo de pruebas daily fuera de T-036. En el cliente Linux del gate, MSW registró un PUT sin handler en el caso existente «discard no revive borrador por ACK tardío» de `useDailyNote.test.tsx`. La suite pasó 511/511. El caso depende de una espera de 100 ms y solo instala handlers GET.

## Posterior a M2-RC1

Fuera de esta versión de voz quedan streaming, audio persistido, integración automática con CLI/daily y Safari/iOS. La portabilidad y el despliegue tienen contrato propio (S-107 y S-108). Las demás opciones de ROADMAP conservan su carácter futuro.

## Fuera de I1

Además de I2 registrada, los demás objetivos opcionales de PROJECT_CONTEXT/ROADMAP siguen sin contrato ni ejecución autorizada. No usar el microensayo genérico de errorMessage como otra tarea/PR de adopción; T-001 fue la primera implementación de producto. Conservar E-01 aceptado y comprobar solo capacidades pertinentes en la superficie propia; no atribuir a Junie pruebas de frontera.
