---
id: T-064
status: in_progress
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-063]
branch: codex/t-064-space-navigation
role: implementer
executor: frontier
pr: null
---

# T-064 · Selector de espacio y navegación Windows/Android

## Objetivo

Cambiar desde selector visible y operar destinos principales con etiquetas/controles cómodos.

Draft **solo por dependencias**: T-063 MERGED y conciliada. Contrato completo en S-109; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

Wireframes/tokens/breakpoint768 S-109: reemplazar DevNotes interno, conservar marca del sistema, barra inferior cuatro destinos y Datos en cuenta. Selector usa T-063. DataPage preview v1/v2, countsBySpace y respaldo global; dejar de validar solo literal1.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`app/AppShell.tsx`, `features/spaces/SpaceSelector.tsx`, `features/auth/SessionControls.tsx`, `features/portability/api.ts`, `DataPage.tsx`, `messages.ts`; tema/íconos reutilizados; tests selector/shell/Datos.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

360/375/390/768/1280 CSS px, zoom200%, foco/teclado/Escape/labels/contraste; sin título duplicado/overflow. Datos accesible global. Guardado fallido no adelanta selector; no placeholder del contexto anterior. Preview v1 explica Trabajo.

Desde `client/`, Node >=24/npm del proyecto:

```bash
npm test -- --run src/features/spaces/SpaceSelector.test.tsx src/app/AppShell.test.tsx src/features/portability/api.test.ts src/features/portability/DataPage.test.tsx
```

Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

2026-11-14 · Frontera en rol implementer en sesión nueva de Codex Desktop, modelo GPT-6 (variante y esfuerzo no expuestos), con PowerShell, Git, `gh` y Node 24.21.0/npm 11.19.0. Worktree propio `.orchestrator/t-064`, rama `codex/t-064-space-navigation`, HEAD/base inicial `1a3e95d6de17d1a4e9b3fcc1118637704f219cb9`. `gh pr view 66` y `git fetch` exit 0. [T-063 conciliada](T-063-space-client-context.md#conciliación) en el primer avance de la rama. Se leyeron las tres observaciones de R1 de T-063.

Impacto:

- **Comportamiento y UI:** Trabajo/Personal con texto, ícono, acento y teclado. El selector lee el espacio confirmado y envía la URL de destino a `SpaceNavigation`; conserva la fecha en Notas/Historial, reinicia selección y filtros de Referencias/Voz, y muestra el bloqueo publicado por T-063 en una importación. Desde Datos, un cambio explícito abre Notas del destino. Una entrada directa a Datos inicializa el selector desde la preferencia de esa cuenta. Barra superior de 56 px, cuatro destinos abajo por debajo de 768 CSS px y Datos en el menú de cuenta. Marca de la aplicación instalada conservada.
- **API y datos:** el cliente acepta preview v1/v2 y valida la suma de `countsBySpace` frente al total. La vista previa, confirmación y resultado muestran ambos espacios. v1 informa que restaura en Trabajo. El respaldo cubre la cuenta completa.
- **Permisos:** se mantienen los permisos, la sesión y las guardias de T-063. Sin cambios en endpoints, base de datos ni dependencias.

Preparación local: `npm ci` exit 1 (`ENOTFOUND registry.npmjs.org` en sandbox); `npm ci --no-audit --no-fund` con acceso de red, exit 0 (384 paquetes del lockfile en el worktree). Primera prueba dirigida en rojo (mismas rutas de contrato con `--reporter=dot`), exit 1, 17 fallos y 81 casos verdes. Reprodujo rechazo de v2, falta de selector y barra con cinco destinos. Primera corrida verde del comando de contrato, exit 0, 98/98, antes del ajuste de bloqueo visible de importación.

Ensayo de navegador dirigido, desde Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t064-layout-1114 bash scripts/e2e.sh --grep 'T-064: selector' --project desktop`. Base/HEAD `1a3e95d`, fuentes de T-064 en el worktree. Usar solo el namespace indicado y el directorio de artefactos del harness, con fixtures ficticias y cleanup automático por labels exactos. Comprobar ausencia de recursos antes y después. Sin editar fuentes durante la corrida. Primer intento exit 1: pasó los anchos y Tab desde el foco heredado del login entró en el editor. La prueba parte del botón de cuenta y usa Escape y Shift+Tab. Reintentos `starter-e2e-t064-layout-r2` y `starter-e2e-t064-layout-r3` exit 1: la opción enfocada medía 36 px debido a la regla responsiva de MUI. Se ajustó la especificidad para sostener 48 px y se mantuvo un nombre de menú estable y restauración explícita del foco. R3 verificó el caso de visitante. Cleanup verificado para los tres namespaces. Corrida final con `starter-e2e-t064-layout-final`: los dos casos de navegador pasaron, incluidos 360/375/390/767/768/1280 CSS px, el viewport equivalente a 200 %, ausencia de overflow, tamaños, foco y selección por teclado. La aceptación con Android físico y zoom del navegador queda pendiente. **FULL/STARTER DIFERIDO POR EL DUEÑO.**

Checks locales de client: comando contractual de la sección «Aceptación y pruebas», exit 0, 98/98 en 4 archivos. `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`, exit 0 en cada uno. Vite conserva el aviso de chunks >500 kB. Regresión adicional de rutas, cuenta, navegación de espacios y voz, referencias y conexión: `npm test -- --run src/app/AppRoutes.test.tsx src/features/auth/SessionControls.test.tsx src/features/spaces/SpaceNavigation.test.tsx src/features/voice/VoiceDraftNavigation.test.tsx src/features/reference/ReferenceSession.test.tsx src/features/system/ServerStatus.test.tsx` → exit 0, 78/78 en 6 archivos. El reintento de navegador también incluye el caso de la barra de visitante (`--grep 'T-064: selector|T-050: visitor navigation' --project desktop`).

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-065 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
