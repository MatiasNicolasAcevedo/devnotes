# ROADMAP · devnotes

| Política | Valor |
|---|---|
| Cadencia efectiva | 5 |
| WIP | Una tarea y un PR activos; revisión independiente |

## M0 · Adopción propia

[T-000](tasks/T-000-adoption.md): conservar personalización, acordar contexto/autonomía, validar copia y lifecycle con datos ficticios y comprobar instalación/capacidades Junie en su superficie. Gate STARTER por el diff de identidad/Compose/POM, CI y revisión independiente. Ninguna tarea de negocio se ejecuta antes de MERGED y conciliación de T-000.

T-000 y [T-015](tasks/T-015-adoption-checks.md) MERGED/conciliadas; STARTER_VALIDADO22/22 con evidencia propia, sin aceptar producto futuro. T-015 aportó checks de adopción y aclaraciones, sin contar para I1 ni reabrir E-01 aceptado. La revisión previa del dueño descubre seis fixtures dependientes del estado de adopción; [T-018](tasks/T-018-docs-fixture-independence.md) las corrige antes de producto con gate/revisión propios, sin contar para I1 ni reabrir T-015. Sesión nueva Junie T-001 solo tras ese MERGED/conciliación.

## I1 / M1 · MVP local completo

Objetivo de salida: abrir/editar notas privadas por fecha en editor oscuro Roboto Mono con números lógicos, asociar enlaces, insertar separadores y guardar/reemplazar/consultar una copia manual por día. CA-01…06 de PROJECT_CONTEXT demostrados en API/DB/OIDC/navegador reales, dos identidades y 1280/375, sin Google real ni datos reales.

| Capacidad/épica | Contrato | Tareas en orden |
|---|---|---|
| Notas privadas + editor + guardado seguro | [S-101 v2](specs/S-101-daily-notes.md) | T-001…T-006 → T-016 → T-007 |
| Separadores visuales numerados | [S-103](specs/S-103-separators.md) | T-005 base, T-008 interacción, T-012 lectura, T-014 validación |
| Enlaces sobre texto | [S-102](specs/S-102-text-links.md) | T-005 base, T-009 interacción, T-012 lectura, T-014 validación |
| Copias manuales + historial + recorrido final | [S-104 v2](specs/S-104-daily-versions.md) | T-010…T-014 |

Ruta completa de quince tareas en [BACKLOG](BACKLOG.md). Secuencial: implementación → revisión en sesión nueva → merge elegible → sesión nueva de siguiente tarea. Draft únicamente por dependencia no significa contrato por completar. WIP1 y máximo cinco ready; T-001 draft solo por el mantenimiento T-018, con adopción histórica ya conciliada. Junie habilita la siguiente al conciliar MERGED. T-016 separa cola/borrador de T-006 transporte/Query para acotar el riesgo y trabajo del agente liviano.

Revisión de avance tras T-005, T-009 y T-014 (5/10/15 tareas de producto) mergeadas por Junie. Revisar contratos/dependencias/evidencia, tiempos medidos y hallazgos fuera de alcance en BACKLOG. **Frontera vuelve tras T-014 mergeada y objetivo I1 comprobado**, o antes por nueva intención/decisión/bloqueo fuera de contrato. No implementar otra tarea en la sesión que cierra un PR.

## I1 posterior · Pulido y referencias integradas

T-020/T-021 y [S-106](specs/S-106-reference-links.md) T-022…T-026 completadas. PR29 MERGED el 2026-10-31; control de cinco cumplido. Frontera revisa el hito y toma la prioridad del dueño: voz. No reabre estos contratos ni traslada sus evidencias a I2.

## I2 / M2-RC1 · Voz y versión local para pruebas del dueño

Prioridad confirmada por el dueño el 2026-10-31. [S-105 v2](specs/S-105-voice-notes.md) fija grabar/detener/transcribir en español, editar/copiar, guardar/consultar/corregir/borrar varias notas privadas, separadas de daily. Texto plano persistido; audio solo transitorio. Decisiones y límites cerrados, proveedor Groq/Whisper con activación externa separada.

| Tramo | Tareas ordenadas | Salida |
|---|---|---|
| Base backend | T-017 → T-027 → T-028 → T-029 | Disponibilidad apagada, persistencia CAS, API privada y transcripción acotada |
| Transporte y cliente | T-030 → T-031 → T-032 → T-033 | Proxies/doble, reparación de filtros/harness, HTTP multipart y captura segura |
| Producto integrado | T-034 → T-035 → T-036 | Pantalla, colección y guardia navegación/sesión |
| Cierre de versión | T-037 | VO-01…07, SHA/guía/evidencia y entrega M2-RC1 |

Solo T-017 ready; demás draft exclusivamente por dependencia anterior. No hace falta volver a planner entre tareas: Junie confirma MERGED y habilita la siguiente. Controles de cinco/diez tras T-030/T-035; **retorno a frontera al entregar T-037/M2-RC1** o por decisión fuera del contrato. No comenzar otra capacidad en la sesión de cierre.

[VOICE-RELEASE](VOICE-RELEASE.md) define salida técnica con dobles, ensayo externo ficticio y pruebas personales. Cuenta/clave/cuota/retención/autorización de envío no se acreditan por esta planificación. Si faltan al cerrar código, entregar «RC técnica, activación externa pendiente» con la acción concreta; no anunciar precisión ni aceptación del dueño. Después de sus pruebas se priorizan correcciones/mejoras en otra iteración. M2-RC1 es un hito, sin tag, despliegue ni bump automático de artefactos.

## M2-RC1 · Activación y pruebas del dueño

T-037 MERGED (`aef4213`, 2026-11-10) entregó la RC técnica. [T-039](tasks/T-039-voice-activation.md) documentó la activación de Groq, el fallo del ensayo y el veredicto «Aceptada con mejoras». [T-048](tasks/T-048-groq-multipart-fix.md) corrige el multipart y [T-049](tasks/T-049-voice-retest.md) reensaya con el dueño. T-049 verificó el dictado en español sobre `8d787c1`; el silencio quedó como limitación conocida aceptada por el dueño. T-049 MERGED (PR48, `fc8fda5`, 2026-11-10) cerró el hito y habilitó M3. [Resultado](VOICE-RELEASE.md#resultado-de-t-049)

## I3 / M3 · Portabilidad `.xlsx`

Prioridad del dueño del 2026-11-10. [S-107](specs/S-107-xlsx-portability.md): exportar todos los datos de la cuenta (diarias, versiones, voz y referencias) e importarlos solo en una cuenta vacía, con el archivo como respaldo y migración, no como editor. Tareas T-040 → T-041 → T-042 → T-043 → T-044 → T-045 (E2E de ida y vuelta y prueba del dueño), en la rama `codex/s-107-xlsx-portability` y un único PR, con gate integrado, control de avance y revisión al final. Salida: XL-01…10 y el veredicto del dueño.

M3 cumplida el 2026-11-11. PR49 está MERGED (squash `ff02bbd`), con XL-07…10 agregados durante la revisión. T-040…T-045 quedan `done` con la [aceptación del dueño](tasks/T-045-xlsx-journey.md#prueba-del-dueño).

## I3 posterior · Ajustes de UI

Pedido del dueño del 2026-11-11: una única tarea, [T-050](tasks/T-050-ui-adjustments.md), que compacta la interfaz para usar DevNotes como app instalada en una ventana chica y en el teléfono: sin pantalla de inicio, barra superior de una fila, controles de Notas en la barra del editor, Voz en dos mitades con señales de grabación y manifiesto de instalación. Alcance acordado con el dueño sobre capturas y maquetas (UI-01 a UI-09); Junie implementa en su propio PR. Solo `client/` y `e2e/`, sin cambios de API, permisos ni datos.

## I4 / M4 · Piloto en Render Free

Último paso del plan del 2026-11-10, solo si M3 sale bien y después de T-050 MERGED. [S-108](specs/S-108-render-pilot.md) con la receta de [DEPLOYMENT](DEPLOYMENT.md#piloto-de-devnotes-en-render-free): T-046 (imagen única y smoke local con 512 MB) → T-047 (primer deploy con Google real, migración `.xlsx` y aceptación del dueño). Los recursos, secretos y gastos quedan reservados al dueño. **Frontera vuelve al cerrar T-047**, o antes por un veredicto negativo o una decisión fuera de contrato.

## I5 / M5 · Espacios privados, continuidad diaria y disponibilidad

Pedido del dueño del 2026-11-12, preparado en [T-052](tasks/T-052-scope-expansion-plan.md). Excepción de rama/PR documental junto a PR54; las implementaciones esperan ambos MERGED y usan una tarea/PR/sesión cada vez. FULL/STARTER no se ejecutan hasta solicitud expresa, según [TESTING](TESTING.md#excepción-i5-del-2026-11-12).

| Capacidad | Ruta | Objetivo verificable |
|---|---|---|
| [S-111](specs/S-111-render-daily-availability.md) · Disponibilidad diaria | T-053 → T-054 → T-055 → T-056 | Ventana y sonda local verificadas; eficacia en Render separada y pendiente de ensayo autorizado |
| [S-109](specs/S-109-private-spaces.md) · Trabajo/Personal | T-057 → T-058 → T-059 → T-060 → T-061 → T-062 → T-063 → T-064 → T-065 | Diario, versiones, referencias y voz separados; navegación clara y respaldo compatible |
| [S-110](specs/S-110-previous-day-copy.md) · Continuidad de jornada | T-066 → T-067 | Copia explícita de la última anterior sin sobrescrituras ni mezcla de espacios |

Quince tareas de producto. Frontera cerró el [control final tras T-067](tasks/T-067-copy-previous-client.md#control-de-avance-de-i5--t-063-a-t-067) el 2026-11-14 con PR66…70 MERGED y evidencias dirigidas. Pendientes: SP-06 en Android físico con teclado real y zoom nativo, FULL/STARTER diferidos de I5 y el ensayo autorizado de Render. Las categorías y las propuestas restantes siguen fuera de I5.

## I6 / M6 · Herramientas de texto en el diario

Salida de [S-112 · Copiar texto de una captura](specs/S-112-screenshot-ocr.md): captura PNG/JPG a texto editable/copiar, con borrador intacto y UX verificada en escritorio al 25 %, escritorio amplio y Android emulado. Secuencia de entorno local: T-068 API con doble → T-069 diálogo → T-070 navegador/API real con doble externo → T-071 precisión con capturas ficticias y autorización del dueño. El dueño autorizó Trabajo y Personal con aviso antes de cada envío. La clave real se usa en T-071. El corte acordado el 2026-11-16 se alcanza al cerrar T-071 con el recorrido y el veredicto de precisión registrados. El despliegue conserva su autorización separada sobre SHA y ventana.

## Objetivos futuros sin contrato de ejecución

[T-072 · Evaluar Redactar y proveedores](tasks/T-072-writing-provider-evaluation.md) conserva la investigación y los modelos candidatos. Su evaluación queda en pausa hasta una decisión expresa del dueño.

Restauración/comparación/múltiples revisiones por día, búsquedas, plantillas de enlaces y personalización son opciones del contexto, no tareas ready ni dependencias. La exportación/importación y el piloto de despliegue tienen contrato en S-107/S-108; producción en VPS sigue como propuesta de DEPLOYMENT. No instalar infraestructura para ellas. Google real, servicios pagos y datos reales reservados al dueño.

## Después de I5 · Ideas seleccionadas pendientes

El dueño seleccionó las ideas 2, 9, 16, 21, 22, 24 y 34 para ampliar el producto al terminar lo ya definido. [Resúmenes y dirección de UX](FUTURE-FEATURES.md): notas libres, listas, formato compacto, código, búsqueda unificada, consulta en paralelo y reutilización de voz. Conservarlas como candidatas para definir contratos y prioridad con el dueño tras la ampliación de herramientas de texto.
