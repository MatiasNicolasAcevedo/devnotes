# ROADMAP · devnotes

| Política | Valor |
|---|---|
| Cadencia efectiva | 5 |
| WIP | Una tarea y un PR activos; revisión independiente |

## M0 · Adopción propia

[T-000](tasks/T-000-adoption.md): conservar personalización, acordar contexto/autonomía, validar copia y lifecycle con datos ficticios y comprobar instalación/capacidades Junie en su superficie. Gate STARTER por el diff de identidad/Compose/POM, CI y revisión independiente. Ninguna tarea de negocio se ejecuta antes de MERGED y conciliación de T-000.

## I1 / M1 · MVP local completo

Objetivo de salida: abrir/editar notas privadas por fecha en editor oscuro Roboto Mono con números lógicos, asociar enlaces, insertar separadores y guardar/reemplazar/consultar una copia manual por día. CA-01…06 de PROJECT_CONTEXT demostrados en API/DB/OIDC/navegador reales, dos identidades y 1280/375, sin Google real ni datos reales.

| Capacidad/épica | Contrato | Tareas en orden |
|---|---|---|
| Notas privadas + editor + guardado seguro | [S-101](specs/S-101-daily-notes.md) | T-001…T-007 |
| Separadores visuales numerados | [S-103](specs/S-103-separators.md) | T-005 base, T-008 interacción, T-012 lectura, T-014 validación |
| Enlaces sobre texto | [S-102](specs/S-102-text-links.md) | T-005 base, T-009 interacción, T-012 lectura, T-014 validación |
| Copias manuales + historial + recorrido final | [S-104](specs/S-104-daily-versions.md) | T-010…T-014 |

Ruta completa y contratos pequeños en [BACKLOG](BACKLOG.md). Secuencial: implementación → revisión en sesión nueva → merge elegible → sesión nueva de siguiente tarea. Draft únicamente por dependencia no significa contrato por completar. WIP1 y máximo cinco ready; inicialmente cero hasta adopción mergeada. Junie puede habilitar la siguiente al conciliar MERGED.

Revisión de avance tras T-005 y T-010 mergeadas por Junie, no retorno obligatorio a frontera. Revisar contratos/dependencias/evidencia, tiempos medidos y hallazgos fuera de alcance en BACKLOG. **Frontera vuelve tras T-014 mergeada y objetivo I1 comprobado**, o antes por nueva intención/decisión/bloqueo fuera de contrato. No implementar otra tarea en la sesión que cierra un PR.

## Objetivos futuros sin contrato de ejecución

Restauración/comparación/múltiples revisiones por día, búsquedas, exportación, plantillas de enlaces, personalización y despliegue son opciones del contexto, no tareas ready ni dependencias del MVP. No instalar infraestructura para ellas. Google real, servicios pagos y datos reales reservados al dueño.
