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

## I2 / M2 · Notas de voz, posterior al MVP

Intención del dueño 2026-10-21: botón de grabación con indicador rojo, detener/transcribir, texto editable/copiable y colección privada guardable/borrable. [S-105 draft](specs/S-105-voice-notes.md) propone transcripción al detener con Groq/Whisper y persistencia solo de texto, separada de las notas diarias. [T-017](tasks/T-017-voice-readiness.md) se toma por frontera tras I1: revalidar candidato/configuración/smoke ficticio y convertir paquetes A…F en tareas Junie completas antes de ejecución. Objetivo de salida futuro VO-01…07; no sustituye CA ni introduce dependencias/infraestructura en I1. Proveedor externo, audio real y eventuales costos mantienen límites de AUTONOMY.

## Objetivos futuros sin contrato de ejecución

Restauración/comparación/múltiples revisiones por día, búsquedas, exportación, plantillas de enlaces, personalización y despliegue son opciones del contexto, no tareas ready ni dependencias del MVP. No instalar infraestructura para ellas. Google real, servicios pagos y datos reales reservados al dueño.
