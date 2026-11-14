---
id: T-064
status: changes_requested
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-063]
branch: codex/t-064-space-navigation
role: implementer
executor: frontier
pr: 67
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

Ensayo de navegador dirigido, desde Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t064-layout-1114 bash scripts/e2e.sh --grep 'T-064: selector' --project desktop`. Base/HEAD `1a3e95d`, fuentes de T-064 en el worktree. Usar solo el namespace indicado y el directorio de artefactos del harness, con fixtures ficticias y cleanup automático por labels exactos. Comprobar ausencia de recursos antes y después. Sin editar fuentes durante la corrida. Primer intento exit 1: pasó los anchos y Tab desde el foco heredado del login entró en el editor. La prueba parte del botón de cuenta y usa Escape y Shift+Tab. Reintentos `starter-e2e-t064-layout-r2` y `starter-e2e-t064-layout-r3` exit 1: la opción enfocada medía 36 px debido a la regla responsiva de MUI. Se ajustó la especificidad para sostener 48 px y se mantuvo un nombre de menú estable y restauración explícita del foco. R3 verificó el caso de visitante. Cleanup verificado para los tres namespaces. Corrida final con `starter-e2e-t064-layout-final`: exit 0, los dos casos de navegador pasaron, incluidos 360/375/390/767/768/1280 CSS px, el viewport equivalente a 200 %, ausencia de overflow, tamaños, foco y selección por teclado. Cleanup confirmado por labels exactos, 2 tests y 0 fallos en el JUnit saneado del worktree. La aceptación con Android físico y zoom del navegador queda pendiente. **FULL/STARTER DIFERIDO POR EL DUEÑO.**

Checks locales de client: comando contractual de la sección «Aceptación y pruebas», exit 0, 98/98 en 4 archivos. `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`, exit 0 en cada uno. Vite conserva el aviso de chunks >500 kB. Regresión adicional de rutas, cuenta, navegación de espacios y voz, referencias y conexión: `npm test -- --run src/app/AppRoutes.test.tsx src/features/auth/SessionControls.test.tsx src/features/spaces/SpaceNavigation.test.tsx src/features/voice/VoiceDraftNavigation.test.tsx src/features/reference/ReferenceSession.test.tsx src/features/system/ServerStatus.test.tsx` → exit 0, 78/78 en 6 archivos. El reintento de navegador también incluye el caso de la barra de visitante (`--grep 'T-064: selector|T-050: visitor navigation' --project desktop`).

Cierre desde la raíz sobre el commit técnico `14110d714a4f37a3aa05158f90dbf15975d3fc2e` y base `1a3e95d6de17d1a4e9b3fcc1118637704f219cb9`: `node scripts/docs-check.mjs` exit 0 (124 Markdown, 68 tareas, HANDOFF 22/22), `git diff --check` y `git diff --check origin/main..HEAD` exit 0. `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` exit 0, `policy=FULL`, `profile=STARTER`, 28 rutas y 25 técnicas. **FULL/STARTER DIFERIDO POR EL DUEÑO**. La clasificación informa el perfil y la CI liviana se verifica en el HEAD final del [PR67](https://github.com/MatiasNicolasAcevedo/devnotes/pull/67).

### Correcciones significativas

| Problema / causa | Arreglo | Prueba / SHA |
|---|---|---|
| La vista previa del cliente solo aceptaba v1 y descartaba `countsBySpace` | Esquemas v1/v2 y validación de totales y destino de v1 | Rojo contractual, 98/98 al cierre, `14110d7` |
| MUI aplicaba un mínimo de 36 px a las filas del menú a partir de 600 px | Mantener 48 px con especificidad de estilo y comprobar foco y Escape en Chromium | R2/R3 exit 1 (36 px); final 2/2, `14110d7` |

Pendiente: revisión independiente de PR67 y aceptación visual en Android físico. Se conserva el checkout principal, `trailer/` y el worktree local de T-063.

## Revisión independiente R1

2026-11-14 · Frontera en rol reviewer, sesión de Codex Desktop (GPT-6, variante y esfuerzo no expuestos), con PowerShell, Git, `gh`, Node 24.21.0/npm 11.19.0, Git Bash y Docker. Checkout aislado `.orchestrator/t-064-review`. [PR67](https://github.com/MatiasNicolasAcevedo/devnotes/pull/67) OPEN, listo para revisión contra `main`; HEAD `7968bae115051523d84ca18d7ada7780a6d3e42f` y base `1a3e95d6de17d1a4e9b3fcc1118637704f219cb9`, squash de PR66 MERGED y ancestro comprobado. [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43555358946/job/132326880751) en la ejecución `pull_request` del HEAD publicado.

Checkpoint previo a Chromium. Desde Git Bash, `STARTER_E2E_PROJECT=starter-e2e-t064-review-1114 bash scripts/e2e.sh --grep 'T-064: selector|T-050: visitor navigation|portability: A exports|T-020: direct URL' --project desktop`. PostgreSQL/OIDC de prueba en el proyecto propio, fixtures ficticias, artefactos saneados por el harness y cleanup con los labels exactos del proyecto. Comprobar ausencia de contenedores/red/volúmenes antes y después. Fuentes técnicas congeladas en el HEAD citado. Sigue la revisión del resultado de importación y de las aserciones de URL canónica. **FULL/STARTER DIFERIDO POR EL DUEÑO.**

Veredicto de código **CAMBIOS REQUERIDOS**. Se verificó el selector sobre el espacio confirmado, el coordinador único de T-063, la fecha de Historial y el reinicio de filtros de Referencias/Voz. A 767 px la navegación va abajo y a 768 px pasa a la cabecera. Datos es de toda la cuenta y acepta v1/v2 con `countsBySpace`, rechaza sumas incompatibles, explica v1 en Trabajo y muestra conteos de ambos espacios. El resultado se pierde en la transición descrita en B2.

1. **B1 · El selector adelanta la ruta y sustituye el editor antes del ACK.** `SpaceSelector.tsx` envía el `Link` al destino directamente. `SpaceNavigation.tsx` conserva el espacio confirmado y las lecturas, pero procesa la transición después de que cambia la URL y presenta el estado de espera/error en lugar del editor. La prueba negativa temporal de revisión extendió el caso de 503 de `SpaceSelector.test.tsx`: esperaba `/notes/2026-11-13?space=work` y recibió `?space=personal`. El borrador vuelve al pulsar «Volver a Trabajo». Integrar la intención explícita del selector al coordinador de T-063 para conservar ruta, selector y editor de origen durante el guardado y ante error, con aviso/reintento. Cierre observable con una respuesta retenida seguida de error y con ACK exitoso: solo el ACK publica el destino y habilita sus lecturas.
2. **B2 · Un enlace del espacio activo desmonta Datos mientras se importa.** `AppShell.tsx` construye los enlaces de Notas, Voz, Referencias e Historial con el espacio activo y `SpaceNavigation.tsx` los deja pasar aunque esté publicado el bloqueo. Al pulsar Notas con el POST retenido, desaparece «Datos de la cuenta». Su desmontaje aborta la espera del cliente y puede ocultar el resultado aunque el servidor complete la escritura. La limitación estaba registrada en T-063 y el selector de T-064 solo bloquea la otra opción. Hacer que el coordinador retenga las transiciones de SPA que sacarían al usuario de Datos y explique el bloqueo. Cierre observable con POST retenido: pulsar Notas del espacio activo, intentar cambiar de espacio y usar Atrás deja Datos montado, un solo POST y el resultado final visible.
3. **B3 · La regresión Playwright de fechas heredó URLs anteriores a S-109.** El caso dirigido `T-020: direct URL` falla en Chromium. `e2e/tests/daily-helpers.ts` y `e2e/tests/daily-versions.spec.ts` aún exigen URLs exactas sin `?space=work`, aunque la app las canonicaliza con ese parámetro. La discrepancia ya estaba en la base de T-064. Actualizar las aserciones exactas para comprobar fecha y espacio esperado, conservando las verificaciones de contenido, ausencia de escrituras y separación por cuenta. Cierre observable con el caso T-020 y los recorridos de historial que usan `readVersion` en Playwright dirigido.

Evidencia independiente en `7968bae`/`1a3e95d`:

- `npm.cmd ci --no-audit --no-fund` → 0. El comando contractual de cuatro archivos de esta tarea pasó 98/98. La regresión adicional de seis archivos registrada por el implementer pasó 78/78. `npm.cmd run typecheck`, `lint`, `format:check` y `build` → 0; Vite conservó el aviso de chunks >500 kB.
- Las dos pruebas negativas temporales para B1 y B2 ejecutaron un caso cada una, ambas con exit 1 por la aserción descrita. La prueba de B2 usó la respuesta de importación retenida y handlers ficticios para las lecturas de diario. Se retiraron ambas copias temporales.
- El Playwright dirigido del checkpoint salió 1 con 3/4 verdes: T-064 selector, T-050 visitante y exportación/vista previa v2/importación/rechazo de reimportación pasaron con API propia y PostgreSQL reales. T-020 falló. El JUnit saneado confirma 4 casos y 1 fallo; quedaron cero contenedores, red y volúmenes con el label exacto. Los anchos de 360/375/390/767/768/1280 CSS px y el viewport equivalente al 200 % se comprobaron en Chromium. Android físico, teclado real y zoom nativo quedan pendientes.
- `node scripts/docs-check.mjs` y `git diff --check` → 0. `node scripts/ci/classify-diff.mjs --base 1a3e95d6de17d1a4e9b3fcc1118637704f219cb9 --head HEAD --phase FULL` → 0, `policy=FULL`, `profile=STARTER`, 28 rutas, 25 técnicas en el HEAD recibido. **FULL/STARTER DIFERIDO POR EL DUEÑO.**

Siguiente sesión de implementer en el mismo PR para B1–B3. La revisión se publica en PR67 tras confirmar CI en el nuevo HEAD documental, que conserva las fuentes revisadas. El merge requiere autorización expresa del dueño. T-065 espera el cierre de T-064. El ensayo de Render requiere autorización expresa sobre SHA y ventana.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-065 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
