# Herramientas externas de Junie

Fuente canónica del inventario declarado y de la última disponibilidad comprobada de MCP servers y Agent Skills para este proyecto. Sirve a Junie CLI y al plugin de IntelliJ IDEA/AIR; no configura, instala ni autoriza herramientas. Reglas y permisos en [AGENTS](../AGENTS.md) y [AUTONOMY](../docs/AUTONOMY.md).

## Estado y procedencia
Inventario heredado declarado: cinco MCP y siete skills. Su presencia en esta copia no acredita que el dueño haya elegido/configurado esas herramientas en DevNotes. La tabla indica disponibilidad declarada, no instalación o ejecución comprobada. Cada sesión Junie verifica las herramientas expuestas en su propio entorno; las de otro agente no acreditan las suyas. No inspeccionar archivos privados globales ni secretos.

Estados: **declarado** = informado sin comprobar disponibilidad; **activo verificado** = listado en la sesión indicada y sonda pertinente exitosa; **filtrado/deshabilitado** = existe pero no está expuesto/habilitado en ese contexto; **no instalado** = ausencia comprobada en el alcance indicado, sin generalizar a otros; **error/autorización pendiente** = existe y no se puede usar. Una definición en disco no basta para afirmar activo. Registrar fecha, superficie CLI/IDE/ACP, alcance proyecto/usuario/cliente y evidencia saneada al cambiar un estado.

Comprobación Junie, 2026-10-21, superficie IDE IntelliJ IDEA/AIR (plugin Junie), sesión propia del dueño para E-01 de T-000. Launcher CLI detectado: `junie --version` → **26.10.12 (3659.7)** exit0. Configuración MCP de usuario en `~/.junie/mcp/mcp.json` con 4 servers (Playwright, Chrome DevTools, Context7, GitHub). Skills expuestos por el plugin IDE: 7 skills (context7, database-connection-management, demo-setup, frontend-design, ij-debugger, java-engineer, spring-boot-engineer). Sin skills en `.junie/skills/` del proyecto ni en `~/.junie/skills/`. Sin `mcp.json` de proyecto en `.junie/mcp/`. GitHub MCP usa URL de cliente con header Authorization (token no impreso). Context7 usa URL remota sin auth visible. Playwright y Chrome DevTools usan npx local.

## MCP servers
| Herramienta | Uso previsto | Estado actual | Alcance/evidencia |
|---|---|---|---|
| Context7 | Documentación actualizada de librerías y frameworks | activo verificado | 2026-10-21, IDE; `~/.junie/mcp/mcp.json` URL remota https://mcp.context7.com/mcp. Herramientas mcp_Context7_resolve-library-id y mcp_Context7_query-docs expuestas en sesión |
| Playwright | Automatización del navegador | activo verificado | 2026-10-21, IDE; `~/.junie/mcp/mcp.json` npx @playwright/mcp@latest. Herramientas mcp_Playwright_* expuestas en sesión |
| ChromeDevTools | Snapshot, red, performance y screenshots de Chrome | activo verificado | 2026-10-21, IDE; `~/.junie/mcp/mcp.json` npx chrome-devtools-mcp@latest. Herramientas mcp_ChromeDevTools_* expuestas en sesión |
| GitHub | Repositorios, PRs, issues, commits y búsqueda | activo verificado | 2026-10-21, IDE; `~/.junie/mcp/mcp.json` URL cliente con auth. Herramientas mcp_GitHub_* expuestas en sesión. Sonda: `gh pr view 1` exit0, PR OPEN |
| junie-cli-docs | Documentación interna de Junie; puede presentarse como subagente según la instalación | activo verificado | 2026-10-21, IDE; disponible como custom agent en CAPABILITIES. No requiere MCP, se spawnea como subagente |

Origen de los 4 MCP: configuración de usuario `~/.junie/mcp/mcp.json` (no de proyecto). junie-cli-docs es built-in del plugin IDE. Sin `mcp.json` en `.junie/mcp/` del proyecto.

Sonda propia de Junie, 2026-10-21, superficie IDE: `junie --version` → **26.10.12 (3659.7)** exit0. Los 4 MCP de usuario están activos y expuestos como herramientas en esta sesión. junie-cli-docs disponible como custom agent. La versión CLI no prueba modelo/sesión, pero la presencia de herramientas MCP en la sesión sí acredita los servers activos.

## Agent Skills
| Skill | Uso previsto | Estado actual | Alcance/evidencia |
|---|---|---|---|
| context7 | Docs de librerías mediante Context7 MCP | activo verificado | 2026-10-21, IDE; skill expuesta en CAPABILITIES, requiere Context7 MCP activo |
| database-connection-management | Conexiones BD en DataGrip/IDE | activo verificado | 2026-10-21, IDE; skill expuesta en CAPABILITIES |
| demo-setup | Configuración de `/demo` | activo verificado | 2026-10-21, IDE; skill expuesta en CAPABILITIES |
| frontend-design | Diseño de interfaces web | activo verificado | 2026-10-21, IDE; skill expuesta en CAPABILITIES |
| ij-debugger | Análisis de runtime con debugger de IntelliJ | activo verificado | 2026-10-21, IDE; skill expuesta en CAPABILITIES |
| java-engineer | Políticas y buenas prácticas Java | activo verificado | 2026-10-21, IDE; skill expuesta en CAPABILITIES |
| spring-boot-engineer | Spring Boot4.x/Framework7/Security7/Hibernate7/Jackson3 | activo verificado | 2026-10-21, IDE; skill expuesta en CAPABILITIES |

Los 7 skills están expuestos por el plugin IDE en esta sesión. Sin skills en `.junie/skills/` del proyecto ni en `~/.junie/skills/`.

La skill es instrucción reutilizable, el MCP expone herramientas: disponer de uno no demuestra disponer del otro. Consultar solo las skills pertinentes, sin cargar todas por rutina.

## Configuración y límites
- Ruta estándar actual de MCP de proyecto: `.junie/mcp/mcp.json`; skills: `.junie/skills/<nombre>/SKILL.md`. `.junie/mcp.json`, mencionado por el dueño, no se observó en este checkout: comprobar si su instalación usa una ruta personalizada/otra versión antes de mover nada. No crear ambas como configuraciones duplicadas.
- El formato MCP de proyecto se comparte entre CLI e IDE. Leer la misma configuración requiere la misma raíz/checkout, rutas de búsqueda y versión compatibles. En ACP también puede haber herramientas aportadas por el cliente. Una conexión de debugger o DataGrip del IDE no se vuelve automáticamente utilizable por un CLI aislado.
- La configuración de usuario bajo `~/.junie/` depende de usuario, host y contexto de ejecución y no viaja con Git. En la instalación declarada por el dueño los contextos globales se gestionan por separado; verificar cada superficie, sin inferir igualdad ni aislamiento únicamente por el nombre del agente.
- Versionar este inventario no instala MCP/skills, no concede acceso GitHub/BD ni publica credenciales. Una configuración futura solo se versiona saneada y con versiones/rutas revisadas; no registrar tokens, headers privados, variables sensibles ni respuestas con datos reales.
- Si una herramienta no está disponible, usar el comando local ya autorizado por la tarea cuando demuestre lo mismo. Si es indispensable, registrar el bloqueo y requisito concreto; no instalar, autenticar, abrir subagentes ni ampliar permisos por cuenta propia. Las reglas de sesión, seguridad y revisión prevalecen sobre una sugerencia de skill.

Fuentes oficiales consultadas el 2026-10-19: [MCP en CLI/IDE](https://junie.jetbrains.com/docs/junie-cli-mcp-configuration.html), [Agent Skills](https://junie.jetbrains.com/docs/agent-skills.html). Describen el mecanismo general, sin acreditar esta instalación.

## Comprobación y mantenimiento
Al adoptar el template, cambiar herramientas o preparar el traspaso, el dueño/Junie consulta `/mcp` y `/skills` en las superficies que vaya a usar; no se abre otra sesión desde un agente para hacerlo. Registrar solo nombres, estado/origen y fecha; si se declara activo, una sonda de lectura pertinente y saneada. No operar cuentas Google, BD real o recursos ajenos para verificarlo. Skills vinculadas al IDE pueden quedar limitadas a esa superficie.

Actualizar las filas existentes; las correcciones de una tarea viven en su bitácora, sin duplicar una cronología aquí. En una copia nueva este catálogo es inventario heredado declarado, nunca evidencia de herramientas activas: revalidar en T-000 y referenciarlo desde su PROJECT_CONTEXT completado. [HANDOFF E-01](../docs/HANDOFF.md) comprueba documentación y límites explícitos; no exige instalar todo el catálogo para empezar un MVP.
