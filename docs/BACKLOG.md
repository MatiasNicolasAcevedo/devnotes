# Cola del producto

Acción actual en [STATUS](STATUS.md); estado y evidencia en cada tarea. Este índice solo cambia al cambiar la cola o sus dependencias.

Próxima acción: implementar [T-050](tasks/T-050-ui-adjustments.md) (interfaz compacta, contrato `ready`) tras mergear el PR de documentación. La prueba del dueño de [T-045](tasks/T-045-xlsx-journey.md#prueba-del-dueño) sigue pendiente y pospuesta por él. Después, [T-046](tasks/T-046-render-image.md).

## Siguientes · plan del dueño del 2026-11-10, ajustado el 2026-11-11

Del plan original quedan hechos la activación de Groq y la portabilidad `.xlsx` (ver [Hechas · I3](#hechas--i3--m3-portabilidad-xlsx)). El 2026-11-11 el dueño antepuso al despliegue una única tarea de ajustes de UI. Contratos: [S-108](specs/S-108-render-pilot.md), con la receta técnica en [DEPLOYMENT](DEPLOYMENT.md#piloto-de-devnotes-en-render-free). Una tarea y un PR por vez, con sesión nueva por tarea y por revisión; quien concilia un MERGED habilita la siguiente.

| Orden | Contrato / resultado | Ejecuta | Dependencia |
|---|---|---|---|
| 1 | [T-045](tasks/T-045-xlsx-journey.md) · Solo falta la prueba del dueño: exportar e importar en una cuenta vacía. Pospuesta por él el 2026-11-11; no bloquea T-050 | Dueño | Código MERGED en PR49 |
| 2 | [T-050](tasks/T-050-ui-adjustments.md) · Interfaz compacta para usar DevNotes como app de escritorio | Junie | Contrato `ready`; PR de documentación MERGED |
| 3 | [T-046](tasks/T-046-render-image.md) · Imagen única y smoke local con 512 MB | Junie | T-045 aceptada y T-050 MERGED |
| 4 | [T-047](tasks/T-047-render-first-deploy.md) · Primer deploy, migración `.xlsx` y aceptación | Dueño con un agente de frontera | T-046 MERGED |

Retorno a frontera si el dueño emite «no aceptada» en T-045 o T-047, ante una decisión fuera de contrato o al cerrar T-047. Los hallazgos del dueño se registran aquí con pasos, esperado/observado, navegador y SHA.

### Hallazgos de T-039

- **Bloqueante para la transcripción real.** En Edge 157.0.4341.42, SHA `c63038d` (fuentes `aef4213`), iniciar sesión local, abrir Voz, grabar la muestra técnica de ~30,4 s con micrófono sintético y pulsar «Detener y transcribir». Se esperaba HTTP 200 con texto editable. DevNotes devolvió HTTP 502 `VOICE_INVALID_RESPONSE`. El silencio y la segunda nota reprodujeron el mismo 502. Al revisar `GroqTranscriptionClient`, el multipart contiene solo `file`. El estado exacto de Groq quedó sin medir. Corrección en [T-048](tasks/T-048-groq-multipart-fix.md) y reensayo en [T-049](tasks/T-049-voice-retest.md). [Evidencia del ensayo](VOICE-RELEASE.md#resultado-de-t-039)

- **Hallazgo de revisión del adaptador (2026-11-10, `c5e37cc`).** `GroqTranscriptionClient.parseResponse` consulta `no_speech_prob` solo con texto en blanco. Una respuesta con texto no vacío y todos los segmentos en el umbral o por encima podría pasar aunque S-105 exige 422. Queda fuera de la serialización saliente de T-048. Si el silencio de T-049 devuelve texto, detener el reensayo y concretar la corrección en frontera antes de declarar voz real verificada. [Regla de S-105](specs/S-105-voice-notes.md#adaptador-y-errores)

- **Hallazgo de implementación del adaptador (2026-11-10, `8d787c1`).** T-049 corrigió el rechazo cuando todos los segmentos indican silencio. `GroqTranscriptionClient.parseResponse` todavía acepta texto no vacío sin segmentos o con `no_speech_prob` ausente, y S-105 pide 502 en ese caso. Requiere decisión de frontera porque cambia el resultado de respuestas que hoy dan 200. [Regla de S-105](specs/S-105-voice-notes.md#adaptador-y-errores)

### Hallazgos de T-049

- **Silencio transcrito como «Gracias.» (limitación conocida, aceptada por el dueño el 2026-11-10).** En Edge 157.0.4341.42, SHA `8d787c1`, grabar 4 s de silencio sintético y pulsar «Detener y transcribir». Se esperaba HTTP 422 `VOICE_NO_SPEECH` y editor vacío. DevNotes devolvió HTTP 200 con «Gracias.». Medido: Groq responde un segmento con `no_speech_prob` 0, `avg_logprob` −0,297 y `compression_ratio` 0,529, así que ningún umbral sobre `no_speech_prob` lo rechaza. Dirección elegida por el dueño si se retoma: «Filtrar en el backend». Propuesta de la sesión de T-049, sin decisión del dueño sobre el detalle: coincidencia del texto completo con frases de alucinación conocidas, aceptando que una nota que solo diga esa frase se rechace. Requiere versión nueva de S-105, prueba roja con la respuesta medida y un reensayo con presupuesto. Sin tarea asignada ni prioridad. [Medición](tasks/T-049-voice-retest.md#medición-de-la-respuesta-real)

- **Casos de prueba faltantes del adaptador (C-1 del veredicto del PR48, no bloqueante).** `GroqTranscriptionClientTest` no cubre texto con `segments: []` ni `no_speech_prob` no numérico o mayor que 1, que el código conserva como voz. Añadir ambos casos cuando se toque el adaptador. Sin tarea asignada.

### Hallazgos del control de S-107

Del [control de avance de T-040…T-045](tasks/T-045-xlsx-journey.md#control-de-avance-de-t-040t-045) (2026-11-11). Ninguno bloqueó el PR49 ni tiene tarea asignada.

- **Puertos fijos de los ensayos de proxies.** `scripts/test-auth-proxies.mjs` publica `127.0.0.1:5175` y `5176` sin parámetro. Con un stack de desarrollo del dueño en el 5175, `test-auth-proxies-signals.sh` y `test-auth-proxies.sh` fallan con `port is already allocated` y cortan el gate STARTER después de unos 45 minutos, antes del E2E. Propuesta: aceptar un par de puertos por variable, como `STARTER_PORTABILITY_PROXY_PORT` en el ensayo de portabilidad, o comprobar el puerto al inicio del gate. Es un cambio de tooling del starter.
- **Ensayo de proxies de portabilidad fuera del gate.** `scripts/test-portability-proxies.mjs`, igual que `test-voice-proxies.mjs`, no está en `verify-tooling.sh` y se corre a mano. El límite de 11 MB de nginx para las dos rutas de importación no tiene regresión automática. Decidir si entra en tooling.
- **OpenAPI sin caso de portabilidad.** Las tres rutas están anotadas detrás del interruptor, pero `OpenApiContractIT` no las comprueba (nota de T-042).
- **Comandos dirigidos con `-Dtest=none`.** Los comandos de contrato de T-041, T-042 y T-043 (`./mvnw -q verify -Dit.test=… -Dtest=none`) terminan en exit 1 por `jacoco:check` en un árbol limpio aunque las pruebas pasen. Los contratos futuros con un IT dirigido deberían añadir `-Djacoco.skip=true` y dejar la cobertura al `clean verify`.

### Hallazgos de T-050

Del [avance de T-050](tasks/T-050-ui-adjustments.md#avance-del-implementer-2026-11-11) (2026-11-11). Ninguno bloquea su PR ni tiene tarea asignada.

- **Ensayos manuales con la interfaz anterior.** `scripts/test-dev-auth.mjs` y `scripts/test-auth-ui-smoke.mjs` no están en `verify-tooling.sh` y siguen buscando el botón «Cerrar sesión» en la barra, la URL `/` tras el login, el texto «Servidor conectado» y `SystemInfoPanel.tsx`, que T-050 eliminó. Fallarán hasta adaptarlos al menú de usuario, a `/notes` y a `ServerStatus.tsx`.
- **Prueba de voz cerca de su límite bajo carga.** `VoiceDraftNavigation.test.tsx › descarta audio que excedió 600 s…` tarda unos 1,5 s en el host y agotó los 10 s una vez dentro del gate, con el contenedor de cliente unas tres veces más lento que lo habitual; no se reprodujo en 16 corridas bajo carga ni en dos gates posteriores.
- **Perfil STARTER por archivos de `client/` fuera de `src/`.** `classify-diff.mjs` trata `client/index.html` y `client/public/` como STARTER, así que un cambio de aplicación que los toque exige tooling; el contrato de T-050 preveía solo el FULL de aplicación.

## Hechas · I3 / M3 portabilidad xlsx

[S-107](specs/S-107-xlsx-portability.md) entró a `main` con el PR único [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49), MERGED el 2026-11-11, squash `ff02bbd`. M3 se da por cumplida cuando el dueño registre su veredicto en T-045.

- [T-040](tasks/T-040-daily-timestamps.md): instantes de daily y versiones a microsegundos, más las correcciones B1…B4 de la revisión.
- [T-041](tasks/T-041-xlsx-codec.md): codec `devnotes-xlsx` v1 y límites.
- [T-042](tasks/T-042-xlsx-export-api.md): GET de exportación privada.
- [T-043](tasks/T-043-xlsx-import-api.md): vista previa e importación atómica en cuenta vacía, y proxies.
- [T-044](tasks/T-044-xlsx-client.md): pantalla «Datos».

Previas del mismo plan: [T-039](tasks/T-039-voice-activation.md), [T-048](tasks/T-048-groq-multipart-fix.md) y [T-049](tasks/T-049-voice-retest.md), activación y reensayo de Groq (PR46, PR47 y PR48 MERGED).

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

Hallazgo de pruebas daily fuera de T-036. En el cliente Linux del gate, MSW registró un PUT sin handler en el caso existente «discard no revive borrador por ACK tardío» de `useDailyNote.test.tsx`. La suite pasó 511/511. El caso depende de una espera de 100 ms y solo instala handlers GET.

## Posterior a M2-RC1

Fuera de esta versión de voz quedan streaming, audio persistido, integración automática con CLI/daily y Safari/iOS. La portabilidad y el despliegue tienen contrato propio (S-107 y S-108). Las demás opciones de ROADMAP conservan su carácter futuro.

## Fuera de I1

Además de I2 registrada, los demás objetivos opcionales de PROJECT_CONTEXT/ROADMAP siguen sin contrato ni ejecución autorizada. No usar el microensayo genérico de errorMessage como otra tarea/PR de adopción; T-001 fue la primera implementación de producto. Conservar E-01 aceptado y comprobar solo capacidades pertinentes en la superficie propia; no atribuir a Junie pruebas de frontera.
