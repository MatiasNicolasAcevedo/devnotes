---
id: T-097
status: done
priority: P2
size: M
milestone: M9
spec: null
depends_on: [T-096]
branch: codex/t-097-demo-page
role: implementer
executor: frontier
pr: 94
---

# T-097 · Página Demo con el tráiler y la demo narrada

## Objetivo

Cualquier persona, con o sin sesión, abre **Demo** desde la barra superior y mira el tráiler v2 o la demo narrada sin salir de DevNotes. Un reproductor central muestra el video elegido y una lista lateral permite pasar de uno a otro con un clic. Hasta ese clic la página no hace ningún pedido a YouTube. Es la última tarea del M9 pedida por el dueño ([intención](T-096-narrated-demo.md#intención-del-dueño-para-la-tarea-siguiente)). Al quedar MERGED no hay otra tarea predefinida: la sesión siguiente es frontera planner con los pendientes del dueño.

## Decisiones del dueño

2026-11-23, en el chat de la sesión de planificación, sobre opciones presentadas por frontera:

| Tema | Decisión |
|---|---|
| Lugar en móvil | Barra superior: enlace rojo con ícono de reproducción y texto «Demo», antes del estado del servidor. La barra inferior conserva sus cinco destinos sin cambios |
| Visibilidad | Pública. Un visitante ve el destino y los dos videos sin iniciar sesión. La página no llama a la API propia ni usa datos privados |

## Alcance y decisiones resueltas

**Destino Demo.** Un único enlace `Demo` a `href('/demo')` (con `useSpaceHref`, así un usuario con sesión conserva `?space=`). Va en la barra superior y **fuera** del landmark «Navegación principal», para que esa lista siga con cinco enlaces en todos los anchos.
- Escritorio (≥ 768 px): inmediatamente después de `PrimaryNavigation`, a la derecha de Historial.
- Móvil (< 768 px): primer elemento del grupo derecho, antes de `ServerStatus`. Por debajo de 360 px se oculta el texto visible y queda solo el ícono. El nombre accesible sigue siendo «Demo» en todos los anchos (`aria-label="Demo"`).
- Color `DEMO_RED = '#ff6b6b'`, definido en `theme.ts` junto a `AMBER`. Contraste de 5,6:1 sobre `#212324`. Borde `alpha(DEMO_RED, 0.48)`, alto mínimo 44 px, ícono `PlayIcon` (`'M8 5v14l11-7z'`, en `shared/ui/icons.tsx`) siempre visible. `aria-current="page"` en `/demo` con fondo `alpha(DEMO_RED, 0.16)`. Foco visible con contorno de 2 px rojo. Mismo patrón visual que `AiNavbar`.
- Las guardias de salida existentes (Imagen editada, Libres en borrador, importación de Datos) aplican igual que a cualquier otro enlace; no se agrega lógica nueva.

**Ruta.** `<Route path="demo" element={<DemoPage />} />` dentro del `AppShell`, sin comprobación de sesión.

**Datos.** `client/src/features/demo/videos.ts` exporta una lista fija `DEMO_VIDEOS` con dos entradas, en este orden. Las portadas se copian sin cambios desde `media/demo/youtube/` a `client/src/features/demo/` y se importan como módulos de Vite (quedan con hash en `/assets/`).

| Campo | Tráiler | Demo |
|---|---|---|
| `id` | `-xhokMtK-Hw` | `XAIHdmHAhA0` |
| `title` (lista y botón) | `Tráiler` | `Demo completa` |
| `iframeTitle` | `Tráiler de DevNotes` | `Demo completa de DevNotes` |
| `duration` | `0:46` | `5:53` |
| `summary` | `DevNotes en menos de un minuto.` | `Todas las funciones paso a paso, narrada y con subtítulos.` |
| `poster` | `miniatura-trailer.jpg` | `miniatura-demo.jpg` |
| `watchUrl` | `https://youtu.be/-xhokMtK-Hw` | `https://youtu.be/XAIHdmHAhA0` |

**Página.** `DemoPage` en `/demo`:
- `h1` «Demo» y una línea: «Mirá el tráiler o el recorrido completo de DevNotes.»
- Reproductor: caja de `aspect-ratio: 16 / 9`, ancho completo de su columna, fondo negro. Estado inicial con el tráiler seleccionado y **sin iframe**: la portada (`<img alt="">`) cubre la caja y encima hay un botón rojo de 64 px con `PlayIcon` y nombre accesible «Reproducir Tráiler» (o «Reproducir Demo completa»).
- Al hacer clic en el botón se reemplaza la portada por `<iframe title={iframeTitle} src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin">`. Es el único lugar que construye la URL del embed.
- Lista lateral `<ul aria-label="Videos">` con un `<button>` por video: miniatura, título, duración y resumen. El seleccionado lleva `aria-current="true"` y un borde izquierdo rojo. Un clic en un ítem lo selecciona **y lo reproduce**: monta el iframe de ese video, sin pasar por la portada. Volver a elegir el que está sonando no lo reinicia.
- Debajo del reproductor: título del video, resumen y enlace «Ver en YouTube» a `watchUrl` con `target="_blank"` y `rel="noopener noreferrer"`.
- Disposición: desde 900 px (`md`) en dos columnas `minmax(0, 2fr) minmax(260px, 1fr)` con la lista a la derecha. Por debajo, una columna con la lista debajo del reproductor. Sin desplazamiento horizontal desde 320 px.
- Sin estados de carga ni error propios: no hay datos remotos. No se agrega Content-Security-Policy ni se tocan `nginx.conf`, `vite.config.ts` ni el servidor (verificado: hoy no hay CSP).

**Fuera de alcance.** Reproducir MP4 locales, subtítulos propios, analítica, autoplay al abrir la página, cambios en la barra inferior, en el servidor o en el tráiler v1 (`trailer/` sigue sin versionar y nadie lo borra).

## Leer antes

1. [client/AGENTS.md](../../client/AGENTS.md)
2. [`AppShell.tsx`](../../client/src/app/AppShell.tsx) (`PrimaryNavigation` y el `Toolbar` de `AppShellContent`) y [`AiNavbar.tsx`](../../client/src/features/ai/AiNavbar.tsx) como patrón visual
3. [`AppShell.test.tsx`](../../client/src/app/AppShell.test.tsx) y [`AppRoutes.test.tsx`](../../client/src/app/AppRoutes.test.tsx)
4. [`e2e/tests/system.spec.ts`](../../e2e/tests/system.spec.ts) (caso `T-050`, lista `controls`)
5. [`media/demo/YOUTUBE.md`](../../media/demo/YOUTUBE.md)

## Archivos y pasos

Archivos: nuevos `client/src/features/demo/{DemoPage.tsx, DemoLink.tsx, videos.ts, DemoPage.test.tsx, miniatura-trailer.jpg, miniatura-demo.jpg}` y `e2e/tests/demo-page.spec.ts`. Cambios en `client/src/app/{AppRoutes.tsx, AppShell.tsx, theme.ts, AppShell.test.tsx, AppRoutes.test.tsx}`, `client/src/shared/ui/icons.tsx` y `e2e/tests/system.spec.ts`.

1. `DEMO_RED`, `PlayIcon`, `videos.ts` con las portadas copiadas y `DemoPage` con su prueba de componente.
2. `DemoLink` montado en el `Toolbar` según el ancho, ruta `/demo` y ajustes de `AppShell.test.tsx` y `AppRoutes.test.tsx`.
3. `e2e/tests/demo-page.spec.ts` y el agregado de Demo a la lista `controls` del caso `T-050` en `system.spec.ts`: en escritorio después de los cinco enlaces y en móvil antes del estado del servidor.
4. Gate diario, checkpoint y PR.

## Aceptación y pruebas

| Criterio | Capa y por qué | Resultado esperado |
|---|---|---|
| AC-01 Estado inicial sin YouTube | Componente: render puro, sin red | `/demo` muestra `h1` «Demo», la lista «Videos» con dos botones en orden Tráiler, Demo completa, Tráiler con `aria-current="true"`, dos `img` con las portadas, botón «Reproducir Tráiler» y **ningún** `iframe`. MSW sin pedidos no manejados |
| AC-02 Reproducir y cambiar | Componente con user-event | Clic en «Reproducir Tráiler» → un `iframe` titulado «Tráiler de DevNotes» con `src` exacto `https://www.youtube-nocookie.com/embed/-xhokMtK-Hw?autoplay=1&rel=0`. Clic en el ítem Demo completa → un solo `iframe`, «Demo completa de DevNotes», `src` con `XAIHdmHAhA0`, y `aria-current` pasa a ese ítem. «Ver en YouTube» apunta a `https://youtu.be/XAIHdmHAhA0` con `rel="noopener noreferrer"` |
| AC-03 Destino en la barra | Componente, `AppShell.test.tsx` en sus siete anchos | Con sesión, `banner` contiene un enlace «Demo» a `/demo?space=work`, fuera de «Navegación principal», que conserva sus cinco enlaces en el orden actual. Tiene ícono `svg` en todos los anchos. En `/demo`, `aria-current="page"` |
| AC-04 Público | Componente, `AppRoutes.test.tsx` | Un visitante en `/demo` ve el `h1` «Demo», el enlace «Ingresar» y el botón «Reproducir Tráiler», sin aviso de iniciar sesión |
| AC-05 Recorrido real sin pedidos previos | E2E contra el stack real, sin tocar la API propia | `demo page: visitor`: visitante en escritorio entra por el enlace «Demo» de la barra, URL `/demo`. Registrar `page.on('request')`: hasta el clic, cero pedidos a hosts que contengan `youtube`, `ytimg`, `googlevideo` o `doubleclick`. El host de terceros `www.youtube-nocookie.com` se atiende con `page.route` y un HTML mínimo, sin internet. Clic en «Reproducir Tráiler» → pedido a `/embed/-xhokMtK-Hw` e `iframe` visible. Clic en Demo completa → pedido a `/embed/XAIHdmHAhA0` y un único `iframe` |
| AC-06 Disposición y color | E2E | `demo page: layout`: con sesión, a 320, 360, 375, 390, 767, 768 y 1280 px sin desplazamiento horizontal en documento, `main` ni `banner`. El enlace Demo es visible, mide ≥ 44 px de alto, tiene color `rgb(255, 107, 107)` y no se superpone con otro control. Desde 900 px la lista queda a la derecha del reproductor; por debajo, debajo. La barra inferior sigue con cinco enlaces |
| AC-07 Regresión de la barra | E2E existente | `T-050` pasa con Demo en su lista `controls`. `T-064` y `SP-06` pasan sin cambios |

Comandos desde Git Bash con Node ≥ 24 y Docker:

```bash
# client/
npm test -- --run src/features/demo src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx
npm run typecheck
npx eslint src/features/demo src/app src/shared/ui --max-warnings 0
npx prettier --check src/features/demo src/app src/shared/ui
# raíz
STARTER_E2E_PROJECT=starter-e2e-t097-desktop bash scripts/e2e.sh --grep "demo page:" --project desktop
STARTER_E2E_PROJECT=starter-e2e-t097-mobile bash scripts/e2e.sh --grep "demo page:" --project mobile
STARTER_E2E_PROJECT=starter-e2e-t097-shell bash scripts/e2e.sh --grep "T-050|T-064|SP-06" --project desktop
node scripts/docs-check.mjs
git diff --check
bash scripts/verify.sh --policy origin/main
```

El último comando solo informa el perfil del diff. FULL/STARTER: DIFERIDO POR EL DUEÑO. `verify-required` verde sobre el HEAD publicado. Si una corrida E2E supera el presupuesto del gate diario, detenerla, registrar el comando y la duración, y acotar el filtro. Render despliega al mergear en `main`; no hay cambio de configuración ni de variables.

## Checkpoint vigente

### Conciliación

Conciliada el 2026-11-23 en la rama de planificación `codex/m9-close-plan`. `gh pr view 94 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` devolvió `MERGED`, `2026-11-23T16:11:23Z` y `8b0ddd5c8079fe0f697cf8ece8f4a1e3bd018dc5`. `git fetch origin` y `git merge-base --is-ancestor 8b0ddd5c8079fe0f697cf8ece8f4a1e3bd018dc5 origin/main` dieron exit 0. Con T-097 cierra el M9 y el lote Imagen, Libres e IA. No hay tarea siguiente predefinida; la elige el dueño ([STATUS](../STATUS.md)).

### Revisión independiente

2026-11-23. Frontera reviewer, ronda 1, en Claude Code desktop (Claude Opus 5.5, `claude-opus-5-5`), Git Bash, Git, gh, Docker Desktop, Node 24 y el navegador integrado. Sesión nueva, distinta de la del implementer. **APROBADO**, estado `mergeable`. Revisado el HEAD publicado `22f7c0d7251b3687e8a241777159e766b1f99736` del [PR #94](https://github.com/MatiasNicolasAcevedo/devnotes/pull/94) sobre base `74ccaf6`: OPEN, no draft, `verify-required` success sobre ese SHA (una corrida previa del mismo SHA quedó `cancelled`, reemplazada). `git merge-base --is-ancestor 8efa323 22f7c0d` exit 0 y `git diff --name-only 8efa323 22f7c0d` lista solo `docs/STATUS.md` y esta tarea.

**Contraste con el contrato.** El diff toca solo `client/src/{app,features/demo,shared/ui}`, `e2e/tests/` y documentos: sin servidor, `nginx.conf`, `vite.config.ts` ni CSP. AC-01/AC-02: `DemoPage` arranca con el tráiler, portada local y sin iframe; `embedUrl` en `videos.ts` es el único constructor de `youtube-nocookie.com/embed/<id>?autoplay=1&rel=0`; `key={selected.id}` evita reiniciar el video que suena. AC-03: `DemoLink` va tras `PrimaryNavigation` en escritorio y antes de `ServerStatus` en móvil, fuera de «Navegación principal», `aria-label="Demo"`, `DEMO_RED` en `theme.ts`, texto oculto por debajo de 360 px. AC-04: ruta `demo` sin guardia. Portadas idénticas a `media/demo/youtube/` (`cmp` exit 0). Correcciones de regresión aceptadas: T-064 refleja el orden de foco que impone el contrato (Demo entre selector y estado en angosto); T-050 a 48 px es coherente con `AppShell.tsx` (`daily ? 48 : 56`) y la ruta índice que redirige a `/notes`, falla previa demostrada con línea base roja sobre `origin/main`.

| Comando | Exit | Resultado |
|---|---|---|
| `npm test -- --run src/features/demo src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx` (client/) | 0 | 3 archivos, 34 pruebas |
| `npm run typecheck` (client/) | 0 | |
| `STARTER_E2E_PROJECT=starter-e2e-t097-review bash scripts/e2e.sh --grep "demo page:" --project mobile` | 0 | 2/2 (`visitor` y `layout`); stack retirado por el script |
| `bash scripts/dev.sh up --mode local --proxy nginx --project starter-dev-local-nginx` | 0 | Stack local del dueño en `http://127.0.0.1:5175`, queda activo |
| Prueba manual en `/demo` (visitante) | — | Sin iframe y cero recursos de `youtube`/`ytimg`/`googlevideo`/`doubleclick` antes del clic. «Reproducir Tráiler» monta un iframe y el video reproduce; clic en «Demo completa» deja un único iframe con `XAIHdmHAhA0`, reproduce con subtítulos, `aria-current` pasa al ítem y «Ver en YouTube» apunta a `https://youtu.be/XAIHdmHAhA0`. Único host de terceros contactado: `www.youtube-nocookie.com` |

**Observación no bloqueante.** Las portadas traen un ícono de reproducción propio dibujado en la imagen, desplazado respecto del botón rojo de 64 px: en el estado inicial se ven dos símbolos de play. Cumple el contrato (portadas sin cambios); si molesta, una tarea futura puede usar una variante de la portada sin ese ícono.

FULL/STARTER: DIFERIDO POR EL DUEÑO.

### Implementación

2026-11-23. Frontera implementer en Claude Code desktop (Claude Opus 5.5, `claude-opus-5-5`), Git Bash, gh, Node 24 y Docker Desktop. [PR #94](https://github.com/MatiasNicolasAcevedo/devnotes/pull/94), rama `codex/t-097-demo-page` sobre `origin/main` `74ccaf6`. Precondición: PR #93 `MERGED` (`2026-11-23T15:36:29Z`, `74ccaf61abcb69b805115e37cb3389fb4701b00d`) y `git merge-base --is-ancestor` exit 0. Commits: `5fe5bb3` (estado), `ac5154e` (implementación), `8efa323` (ajuste de regresiones, último commit técnico) y después solo commits documentales de checkpoint y STATUS; el último de ellos es el HEAD de entrega.

**Hecho.** Pasos 1 a 3 completos según el contrato: `DEMO_RED`, `PlayIcon`, `videos.ts` con `embedUrl` como único constructor de la URL del embed, portadas copiadas byte a byte (`cmp`) desde `media/demo/youtube/`, `DemoPage`, `DemoLink` fuera de «Navegación principal» (tras Historial en escritorio, antes del estado en móvil, solo ícono por debajo de 360 px), ruta pública `/demo`. Sin cambios de servidor, `nginx.conf`, `vite.config.ts` ni CSP. `trailer/` sigue sin versionar.

**Impacto.** UI: un destino nuevo en la barra superior y una página pública. Sin cambios de API, permisos ni datos. El único tercero es `www.youtube-nocookie.com`, contactado solo tras un clic.

| Comando | Exit | Resultado |
|---|---|---|
| `npm test -- --run src/features/demo src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx` | 0 | 3 archivos, 34 pruebas |
| `npm run typecheck` | 0 | |
| `npx eslint src/features/demo src/app src/shared/ui --max-warnings 0` | 0 | |
| `npx prettier --check src/features/demo src/app src/shared/ui` | 0 | |
| `STARTER_E2E_PROJECT=starter-e2e-t097-desktop bash scripts/e2e.sh --grep "demo page:" --project desktop` | 0 | 2/2, 129 s |
| `STARTER_E2E_PROJECT=starter-e2e-t097-mobile bash scripts/e2e.sh --grep "demo page:" --project mobile` | 0 | 2/2, 92 s |
| `STARTER_E2E_PROJECT=starter-e2e-t097-shell bash scripts/e2e.sh --grep "T-050\|T-064\|SP-06" --project desktop` | 1 → 0 | Primera corrida: T-050 y T-064 rojas (ver correcciones). Tras `8efa323`: 3/3, 118 s |
| Línea base en worktree temporal de `origin/main`: `STARTER_E2E_PROJECT=starter-e2e-t097-baseline bash scripts/e2e.sh --grep "T-050" --project desktop` | 1 | Mismo error de T-050 (56 esperado, 48 recibido): falla previa a T-097 |
| `node scripts/docs-check.mjs` | 0 | En worktree limpio del HEAD técnico. En el checkout del dueño da 1 error solo por `trailer/CLAUDE.md`, carpeta no versionada que no se toca |
| `git diff --check origin/main...HEAD` | 0 | |
| `bash scripts/verify.sh --policy origin/main` | 0 | `policy=FULL`, `profile=APPLICATION`, 16 rutas. FULL/STARTER: DIFERIDO POR EL DUEÑO |

| Corrección | Causa | Arreglo | Prueba / SHA |
|---|---|---|---|
| T-064 | A 640 px, Shift+Tab desde Cuenta ahora llega a Demo, que el contrato ubica entre el selector y el estado. La frase «T-064 pasa sin cambios» choca con esa ubicación | La prueba pasa por Demo enfocado y con otro Shift+Tab llega al selector; el resto del caso queda igual | Regresión 3/3, `8efa323` |
| T-050 | Esperaba barra de 56 px en `/notes`; T-081 (PR #84) la compactó a 48 px. Ya fallaba en `origin/main` | Expectativa a 48 px con comentario; Demo agregado a `controls` según el contrato | Línea base exit 1; regresión 3/3, `8efa323` |

Pendiente: revisión independiente y `verify-required` verde sobre el HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Prompts de salida

```text
Frontera reviewer independiente de T-097 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la del implementer. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md y docs/tasks/T-097-demo-page.md (Decisiones del dueño, Alcance y Checkpoint vigente). PRECONDICIÓN: gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup devuelve OPEN, no draft, headRefOid <SHA> y verify-required verde sobre ese HEAD; si no, devolvé el paso vigente. ACCIÓN: revisá el diff contra AC-01…AC-07: enlace Demo fuera de «Navegación principal», público, color #ff6b6b, iframe youtube-nocookie montado recién al clic y sin pedidos a YouTube antes, portadas locales, sin cambios de servidor, nginx, vite.config ni CSP. En client/: npm test -- --run src/features/demo src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx y npm run typecheck. Desde la raíz: STARTER_E2E_PROJECT=starter-e2e-t097-review bash scripts/e2e.sh --grep "demo page:" --project mobile. Abrí /demo en el stack local y comprobá a mano que un clic reproduce cada video. Ante hallazgos devolvé el mismo PR con la lista cerrada. Si aprobás, squash sin --admin ligado al HEAD revisado y verificá MERGED con gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto con evidencia en la tarea y el prompt completo de la sesión siguiente (el segundo prompt de esta sección si quedó MERGED).
```

```text
Frontera planner de cierre del M9 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/planner.md, docs/AUTONOMY.md y docs/tasks/T-097-demo-page.md. PRECONDICIÓN: gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit devuelve MERGED con mergedAt y mergeCommit.oid válidos, y git merge-base --is-ancestor con ese oid y origin/main sale con exit 0; si no, devolvé el paso vigente. ACCIÓN: conciliá T-097 a done con el SHA de merge en una rama de planificación (tarea, BACKLOG, ROADMAP M9, STATUS y la fila de T-097 en AUTONOMY). No hay tarea siguiente predefinida: presentá al dueño los pendientes de STATUS (PostgreSQL Free vence el 2026-12-11, sonda interna, SP-06, limpieza local) y la recomendación del integrado del corte acumulado, y preguntá qué sigue. Sin decisión del dueño no escribas tareas nuevas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR de planificación con la conciliación y el prompt completo de la sesión que el dueño elija.
```
