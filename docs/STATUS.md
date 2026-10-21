# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-000](tasks/T-000-adoption.md) |
| Estado | changes_requested |
| Acción actual | R1 requiere evidencia E-01 en sesión propia Junie; luego revisión frontera R2 del mismo PR |
| Rama / PR | chore/t-000-adoption · [PR #1](https://github.com/MatiasNicolasAcevedo/devnotes/pull/1) |

Revisión R1 y evidencia/checkpoint solo en T-000. STARTER conservado sobre mismas fuentes/base; contratos I1 revisados. [HANDOFF](HANDOFF.md) mantiene NO_LISTO por pendientes reales. PR abierto, sin aprobación ni merge; T-001 sigue draft. Negocio sin implementar.

### Prompt de la siguiente sesión
```text
Retomar T-000, PR #1, rama chore/t-000-adoption, en sesión propia de Junie abierta por el dueño, únicamente para completar E-01 pedido en revisión R1. Leer explícitamente AGENTS.md, docs/STATUS.md, docs/tasks/T-000-adoption.md (checkpoint R1 y comprobación Junie), docs/AUTONOMY.md, docs/SETUP.md y .junie/TOOLS.md. Primera comprobación: raíz/checkouts, git status, PR/HEAD/base/CI publicados y cambios ajenos. Registrar modelo/herramienta/esfuerzo solo si están expuestos. Consultar /mcp y /skills o equivalente de esta instalación y actualizar filas de TOOLS con fecha/superficie/origen/estado; no atribuir pruebas de frontera. Ejecutar las sondas mínimas saneadas de T-000: lectura/edición del repo, Git Bash/Node/Docker, Git/PR/CI y docs-check; usar .env.example, sin secretos/configuración privada. No instalar/autenticar, delegar, abrir otra sesión, ejecutar microensayo, implementar T-001 ni crear otra tarea/PR. Opcionales ausentes no bloquean si shell autorizado cubre la función; indispensable ausente exige checkpoint concreto al dueño. Registrar evidencia en T-000, preservar STARTER solo con mismas fuentes/base, publicar con docs-check y CI del nuevo HEAD. Después dejar un único prompt para sesión nueva frontera reviewer R2 del mismo PR. Sin autoaprobar/mergear la evidencia propia; T-001 continúa draft hasta cierre elegible y MERGED/conciliación de T-000.
```
