# HANDOFF · devnotes

- **Veredicto:** `NO_LISTO` — 0/22 verificados.
- **Continuidad:** `POR_SESION`.
- **Merge:** `MANUAL_POR_DUENO` hasta autorización/configuración propia.

| ID | Criterio | Estado | Evidencia heredada / propia requerida | Responsable / condición de revalidación |
|---|---|---|---|---|
| C-01 | Contexto propio aceptado: objetivo, usuarios, flujos, exclusiones y decisiones | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| C-02 | Spec del primer flujo o contrato de infraestructura vigente, aceptación y pruebas trazadas | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| C-03 | Arquitectura, contratos API/datos y versiones efectivos; auth y persistencia decididas | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| E-01 | Raíz, modelo/herramienta/esfuerzo y ejecutor siguiente; inventario [TOOLS](../.junie/TOOLS.md) actualizado con MCP/skills, estados, fecha, superficie y limitaciones explícitos; disponibilidad requerida por la tarea comprobada | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| E-02 | Wrappers/locks/imágenes inventariados; instalar, levantar, probar, detener y retomar desde copia limpia | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| E-03 | Ejemplos ficticios, variables/URLs/puertos claros; configuración real fuera de Git/builds | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| B-01 | db/server/client conectados; UI/API/DB reales, restart/rebuild/retoma conservan datos propios | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| B-02 | PostgreSQL 18, Flyway sobre DB vacía y validación JPA/Testcontainers, aislamiento de datos | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| B-03 | Patrones reales API/DTO/validación/errores, router/tema/HTTP/Query/formularios y estados | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| S-01 | OIDC local real, callback/sesión/identidad y recarga; Google real con estado explícito | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| S-02 | 401/403, propiedad/permisos, CSRF y logout/cache con dos identidades; perfiles separados | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| S-03 | Google real: smoke del dueño o pendiente externo explícito, responsable y acción sin secretos | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| V-01 | Unitarios/slices, PostgreSQL IT, componentes, typecheck/lint/formato/build reales | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| V-02 | Playwright desktop/móvil con API/DB/OIDC reales, errores, saneamiento y cleanup labels cero | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| V-03 | FULL local y CI requerida del HEAD publicado verdes, sin omitidos interpretados como éxito | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| G-01 | Git propio, licencia, kit excluido, repo y ruleset efectivos propios; copia sin kit funciona | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| G-02 | Autonomía propia, capacidades Git/PR/CI y continuidad/merge comprobadas | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| G-03 | PRs revisados en sesión distinta, checks y merges confirmados sobre SHA/base | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| H-01 | AGENTS/CLAUDE/docs/protocolos coherentes y autosuficientes, sin historia ni kit obligatorio | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| H-02 | Adopción limpia con contexto distinto y primera tarea derivada, sin evidencia por herencia | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| H-03 | Checkpoint, pendientes externos y único prompt vigente con precondición, continuidad explícita | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |
| O-01 | Swagger opt-in apagado por defecto, HTTP loopback/GET/api/docs; UI/JSON/Try it out y negativos nginx/Vite | pendiente | Sin evidencia propia; revalidar en T-000 | Dueño y revisor del producto |

## Pendientes externos
Revalidar los 22 criterios con contexto, pruebas y GitHub propios. Google real pendiente del dueño. Las tareas y los resultados del mantenimiento no se trasladan a esta aplicación.
