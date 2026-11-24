---
id: T-100
status: done
priority: P1
size: S
milestone: post-M9
spec: null
depends_on: [T-098]
branch: codex/t-100-flexible-links-nav-order
role: implementer
executor: frontier
pr: 100
---

# T-100 · Enlaces sin esquema y navegación con Notas primero

## Objetivo

Pedido del dueño del 2026-11-24, antes de T-099. Al agregar o editar un enlace en Notas, `google.com` o `www.google.com` se guardan sin escribir `https://`. El formato deja de bloquear el guardado aunque el destino no exista. La navegación principal muestra un único orden en escritorio y móvil: **Notas · Referencias · Voz · Imagen · Historial**.

Los dos ajustes van juntos por pedido del dueño. Ambos se hacen en el cliente, no comparten decisiones y no dependen uno del otro. Tras el MERGED sigue [T-099](T-099-persistent-google-session.md), que espera esta tarea solo por ese orden.

## Alcance y decisiones resueltas

**Enlaces.** Contrato en [S-102 · Ajuste del dueño](../specs/S-102-text-links.md#ajuste-del-dueño-del-2026-11-24).

- Nueva función pura `normalizeLinkHref(entrada)` en `client/src/features/daily/editor/linkHref.ts`. Devuelve el href normalizado o el mensaje de error. `LinkDialog` la usa para validar y entrega a `onSave` el valor normalizado. El servidor y `dailyDocument.ts` no cambian: siguen exigiendo HTTP/HTTPS absoluto.
- Pasos sobre la entrada sin espacios en los extremos:
  1. Vacía: «Ingresá una dirección web.»
  2. Esquema `http` o `https` en cualquier combinación de mayúsculas, con o sin `//`: se interpreta tal cual. `//host` recibe `https:`.
  3. Otro esquema explícito (`javascript:`, `data:`, `mailto:`, `ftp://`, `file:`, `tel:`…): «Solo se aceptan direcciones web (http o https).» Un `host:puerto` con dígitos después de los dos puntos, como `localhost:5173`, no cuenta como esquema.
  4. Sin esquema: se antepone `https://`.
  5. Se interpreta con `URL` y se toma `url.href`: dominio en minúsculas y punycode, espacios y caracteres no ASCII codificados, y `/` final si solo hay dominio. Después se codifica con `%` todo carácter de ruta, consulta o fragmento fuera del conjunto de RFC 3986, porque `URL` los deja y `java.net.URI` los rechaza. El conjunto es `A–Z a–z 0–9 - . _ ~ ! $ & ' ( ) * + , ; = : @ / ?` más los escapes `%XX` válidos. Se codifican también un `%` suelto y cada `#` después del primero.
  6. Si `URL` falla o el dominio no cumple la gramática de host de `java.net.URI`, el mensaje es «Ingresá una dirección web válida, por ejemplo google.com.». La gramática acepta etiquetas alfanuméricas con guiones internos y una última etiqueta que empieza con letra, IPv4 o IPv6 entre corchetes. Por ejemplo, rechaza `mi_sitio.test` y `ejemplo.123`. Las credenciales y los más de 2048 caracteres tras normalizar conservan sus mensajes actuales.
- Invariante: todo valor que el diálogo entrega a `onSave` pasa `validateHref` del cliente y `DailyContent` del servidor. Ninguna entrada aceptada puede terminar en un autosave rechazado. El servidor es la referencia: ante una discrepancia, se ajusta la normalización del cliente, nunca `DailyContent`.
- El placeholder pasa a `google.com`. Se conservan la etiqueta «URL», los botones, el foco, Ctrl+K, Quitar, Abrir y Cancelar. Al editar se muestra el href guardado. Sin autolink, linkOnPaste, vista previa ni consulta al destino. Los enlaces ya guardados no se migran.

| Entrada | Href guardado |
|---|---|
| `google.com` | `https://google.com/` |
| `www.google.com` | `https://www.google.com/` |
| `  WWW.Ejemplo.test/Ruta?q=a b  ` | `https://www.ejemplo.test/Ruta?q=a%20b` |
| `http://ejemplo.test` | `http://ejemplo.test/` |
| `HTTPS://jira.ejemplo.test/browse/ABC-1279` | `https://jira.ejemplo.test/browse/ABC-1279` |
| `//ejemplo.test/a` | `https://ejemplo.test/a` |
| `localhost:5173/notas` | `https://localhost:5173/notas` |
| `ñandú.test` | `https://xn--and-6ma2c.test/` |
| `ejemplo.test/100%` | `https://ejemplo.test/100%25` |
| `ejemplo.test/a\|b` | `https://ejemplo.test/a%7Cb` |
| `ejemplo.test/a#b#c` | `https://ejemplo.test/a#b%23c` |

Rechazos con el mensaje del paso correspondiente: vacío o solo espacios; `javascript:alert(1)`, `data:text/html,x`, `mailto:a@ejemplo.test` y `ftp://ejemplo.test`; `https://usuario:clave@ejemplo.test` y `usuario@ejemplo.test`; `mi_sitio.test`, `ejemplo.123` y `ejemplo .test`. Los tres casos con `%`, `|` y `#` hoy pasan el diálogo y el servidor los rechaza al guardar ([comprobado con `java.net.URI`](#checkpoint-vigente)).

**Navegación.** Contrato en [S-112 · Orden de navegación](../specs/S-112-screenshot-ocr.md#ajuste-del-dueño-del-2026-11-24).

- `PrimaryNavigation` en `client/src/app/AppShell.tsx` usa una sola lista para todos los anchos: Notas, Referencias, Voz, Imagen, Historial. Se mantienen sin cambios los iconos, el estado activo, los enlaces con espacio, las cinco celdas móviles de 48 px, la densidad compacta de T-098, Demo fuera de la navegación y la ruta índice en Notas.
- La demo narrada y el tráiler publicados conservan el orden anterior hasta que el dueño pida regrabarlos. Solo se alinea el orden de recorrido de la escena S03 en `e2e/tests/demo-tour.spec.ts`, que no afirma el orden, y nada se regraba.

## Leer antes

- [client/AGENTS.md](../../client/AGENTS.md). Para el test de dominio, [server/AGENTS.md](../../server/AGENTS.md).
- [S-102](../specs/S-102-text-links.md#ajuste-del-dueño-del-2026-11-24) y la regla de href de [S-101](../specs/S-101-daily-notes.md).
- [LinkDialog.tsx](../../client/src/features/daily/editor/LinkDialog.tsx), `validateHref` en [dailyDocument.ts](../../client/src/features/daily/editor/dailyDocument.ts) y en [DailyContent.java](../../server/src/main/java/com/example/devnotes/daily/domain/DailyContent.java).
- `PrimaryNavigation` en [AppShell.tsx](../../client/src/app/AppShell.tsx) y [S-112 · Orden de navegación](../specs/S-112-screenshot-ocr.md#ajuste-del-dueño-del-2026-11-24).
- E2E `T-020:` y `CA-05:` de [daily-notes.spec.ts](../../e2e/tests/daily-notes.spec.ts), `T-050:` de [system.spec.ts](../../e2e/tests/system.spec.ts) y `captureLayout` de [ocr.spec.ts](../../e2e/tests/ocr.spec.ts).

## Archivos y pasos

1. **Rojo.** Agregar `linkHref.test.ts` con la tabla y los rechazos, el orden nuevo en `AppShell.test.tsx` y `AppRoutes.test.tsx`, y el caso E2E `flexible link:` en `daily-notes.spec.ts`. Comprobar que fallan sobre la base. Agregar en `DailyContentTest` un caso parametrizado que acepte cada href de la columna derecha. Ese caso pasa en la base y fija la invariante.
2. **Enlaces.** Crear `linkHref.ts` y usarlo en `LinkDialog.tsx` desde el esquema Zod y `onSave`. Actualizar los mensajes en `LinkDialog.test.tsx` y en `CA-05:`, y agregar un caso que guarda `www.ejemplo.test` y entrega `https://www.ejemplo.test/`.
3. **Navegación.** Usar una lista única en `AppShell.tsx`. Actualizar el orden esperado en `system.spec.ts` (`T-050:`), en `captureLayout` de `ocr.spec.ts` y en la escena S03 de `demo-tour.spec.ts`. `spaces.spec.ts` recorre nombres sin afirmar orden y no cambia.
4. Correr el gate y publicar un único PR.

El E2E `flexible link:` entra a Notas con identidad ficticia. Enlaza una palabra con `www.ejemplo.test` y otra con `jira.ejemplo.test/browse/ABC 1279`. Espera el PUT 200 de la API propia, recarga y comprueba `https://www.ejemplo.test/` y `https://jira.ejemplo.test/browse/ABC%201279`, con `target=_blank` y `rel` seguros. No abre los destinos.

## Aceptación y pruebas

| Criterio observable | Capa y razón | Comando exacto | Resultado esperado |
|---|---|---|---|
| AC-01. Las entradas de la tabla se guardan normalizadas. Los esquemas no web, las credenciales y los dominios inválidos muestran el mensaje junto al campo sin mutar el documento ni disparar autosave. | Unitario puro y componente: la regla es una función y el diálogo solo la conecta. | En `client/`: `npx vitest run src/features/daily/editor/linkHref.test.ts src/features/daily/editor/LinkDialog.test.tsx` y `npm run typecheck` | Rojo en la base y verde con el cambio. `onSave` recibe el href normalizado. |
| AC-02. Cada href normalizado de la tabla pasa la validación del servidor. | Unitario de dominio Java: el servidor es la referencia. | En `server/`: `./mvnw -q test -Dtest=DailyContentTest` | Verde, con el caso parametrizado nuevo. |
| AC-03. En el navegador real, los enlaces sin esquema persisten tras recargar y `javascript:` sigue rechazado. | E2E: cruza diálogo, autosave, API propia y PostgreSQL. | Desde la raíz, en Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t100-desktop bash scripts/e2e.sh --grep 'flexible link:\|T-020:\|CA-05:\|T-050:\|T-064:\|screenshot OCR: extract through the proxy' --project desktop` | `flexible link:` falla en la base y los seis casos pasan con el cambio. |
| AC-04. Notas · Referencias · Voz · Imagen · Historial de 320 a 1280 px, con iconos y 48 px táctiles en móvil y sin desborde horizontal. | Componente y E2E móvil: el orden depende del ancho y del proyecto táctil. | En `client/`: `npx vitest run src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx`. Desde la raíz: `STARTER_E2E_PROJECT=starter-e2e-t100-mobile bash scripts/e2e.sh --grep 'flexible link:\|T-050:\|T-064:\|screenshot OCR: extract through the proxy' --project mobile` | Rojo del orden en la base y verde con el cambio. Los cuatro casos móviles pasan. |

Completar el [gate diario](../TESTING.md) con `node scripts/docs-check.mjs`, `git diff --check origin/main...HEAD` y `verify-required` sobre el HEAD publicado. Acreditar el cleanup Docker por label exacto de cada namespace. `bash scripts/verify.sh --policy origin/main` solo informa el perfil. FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Conciliación

2026-11-24. `gh pr view codex/t-100-flexible-links-nav-order --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` devolvió MERGED, `2026-11-24T17:42:55Z` y `70729d3b5ec038b6ba0c600b8bcb963d842a1be9`. `git fetch origin main` y `git merge-base --is-ancestor 70729d3b5ec038b6ba0c600b8bcb963d842a1be9 origin/main` salieron 0. La siguiente tarea es [T-099](T-099-persistent-google-session.md), que pasa a `ready`.

## Checkpoint vigente

### Revisión independiente · ronda 2

2026-11-24. Frontera reviewer en Claude Code Desktop con Claude Opus 5.5, sesión distinta de la implementer. Worktree aislado `.orchestrator/review-t100-r2` sobre HEAD `e711888` y base `5dcb171`; `verify-required` verde en ese HEAD. Veredicto: **APROBADO**. H1 queda cerrado.

Desde `8f91cc2` solo cambian `e2e/tests/daily-notes.spec.ts`, la tarea y STATUS. `linkWord` recibe la palabra, espera con `expect.poll` la selección nativa igual a esa palabra, deja pasar un frame con `requestAnimationFrame` y afirma `«Sitio»` o `«Ticket»` en el diálogo, que `LinkDialog` muestra con `«{selectedText}»`. El diff no agrega retries, timeouts ni `waitForTimeout`. El código de producto no cambió desde la ronda 1, que lo revisó sin hallazgos.

| Comando del reviewer | Resultado |
|---|---|
| `STARTER_E2E_PROJECT=starter-e2e-t100-review-r2 bash scripts/e2e.sh --grep 'flexible link:\|T-020:\|CA-05:\|T-050:\|T-064:\|screenshot OCR: extract through the proxy' --project desktop`, barras verticales sin escapar en la shell | Exit 0, 8/8 |
| Cleanup por label exacto `com.docker.compose.project=starter-e2e-t100-review-r2` | 0 contenedores, 0 volúmenes y 0 redes |
| `node scripts/docs-check.mjs` y `git diff --check origin/main...HEAD` en el worktree | Exit 0 ambos |
| `bash scripts/verify.sh` | No corrido: FULL/STARTER: DIFERIDO POR EL DUEÑO |

**Pendiente.** `verify-required` sobre el commit de transición, comentario `APROBADO`, squash ligado a ese HEAD y confirmación `MERGED`. La sesión siguiente concilia T-100 como `done`.

### Corrección de H1 · ronda 1

2026-11-24. Frontera implementer de corrección en Claude Code Desktop con Claude Opus 5.5, sesión nueva. Precondición: PR #100 OPEN, base `5dcb171`, HEAD `8f91cc2` (commit documental del reviewer). Corrección en `f9abefe`, solo `e2e/tests/daily-notes.spec.ts`; el producto no cambia. `linkWord` recibe la palabra y, tras soltar `Shift`, espera con `expect.poll` a que `window.getSelection()?.toString()` sea esa palabra, deja pasar un frame con `requestAnimationFrame` dentro de `page.evaluate` y, con el diálogo abierto, afirma que muestra `«Sitio»` o `«Ticket»`. Sin retries, timeouts nuevos ni `waitForTimeout`.

| Comando (Git Bash, desde la raíz) | Resultado |
|---|---|
| `STARTER_E2E_PROJECT=starter-e2e-t100-h1-d1 bash scripts/e2e.sh --grep 'flexible link:\|T-020:\|CA-05:\|T-050:\|T-064:\|screenshot OCR: extract through the proxy' --project desktop` | Exit 0, 8/8 |
| Igual con `starter-e2e-t100-h1-d2` | Exit 0, 8/8 |
| Igual con `starter-e2e-t100-h1-d3` | Exit 0, 8/8 |
| `STARTER_E2E_PROJECT=starter-e2e-t100-h1-m1 bash scripts/e2e.sh --grep 'flexible link:\|T-050:\|T-064:\|screenshot OCR: extract through the proxy' --project mobile` | Exit 0, 4/4 |
| Cleanup por label exacto `com.docker.compose.project=starter-e2e-t100-h1-{d1,d2,d3,m1}` | 0 contenedores, 0 volúmenes y 0 redes en cada namespace |
| `node scripts/docs-check.mjs` | Exit 1 solo por `trailer/CLAUDE.md`, directorio sin versionar previo y ajeno a T-100 |
| `git diff --check origin/main` | Exit 0 |
| `bash scripts/verify.sh` | No corrido: FULL/STARTER: DIFERIDO POR EL DUEÑO |

Las tres corridas de escritorio son consecutivas; en la shell las barras verticales del patrón van sin escapar y aquí se escapan solo por Markdown. **Pendiente.** `verify-required` en el HEAD publicado y revisión independiente, ronda 2.

### Revisión independiente · ronda 1

2026-11-24. Frontera reviewer en Claude Code Desktop con Claude Opus 5.5, sesión distinta de la implementer. Worktree aislado `.orchestrator/review-t100` sobre HEAD `e5642ea` y base `5dcb171`. `verify-required` verde en ese HEAD (corridas 45442600707 y 45442664102, `headSha` comprobado). Veredicto: **CAMBIOS REQUERIDOS**, con un solo hallazgo en el E2E nuevo. El código de producto queda revisado sin hallazgos.

**Revisado sin hallazgos.** `normalizeLinkHref` cumple los pasos, la tabla y los rechazos del contrato. Una prueba fuera del repo pasó 2375 entradas por `normalizeLinkHref`: 5 prefijos × 19 hosts × 25 rutas con `%`, `#`, `|`, espacios, no ASCII, IDN, IPv4/IPv6, puertos y corchetes. Aceptó 2000 y rechazó 375, y `java.net.URI` aceptó los 2000 hrefs con las reglas de `DailyContent.validateHref` (esquema, host, sin credenciales ni espacios). `DailyContent.java` y `dailyDocument.ts` no cambian. Mensajes y placeholder según contrato. El foco (`autoFocus`), Quitar, Abrir y Cancelar se conservan. `onSave` recibe el href normalizado. `PRIMARY_TABS` da un orden único en todos los anchos y `T-050:`, `captureLayout` y S03 están alineados. La corrección de `openDailyTools` es correcta: en escritorio no abre Herramientas si Enlace está visible en la barra, y en móvil sigue igual. Entradas como `javascript:1` o `http:5173` se toman como `host:puerto` y se guardan como `https://javascript:1/`. Son HTTPS e inofensivas: no es un hallazgo.

**Hallazgo H1 · `flexible link:` no es determinista.** Evidencia: con el comando AC-03 de escritorio falló 2/2 en esta revisión, cada vez con otro síntoma. Los otros siete casos pasaron en ambas corridas.
- `starter-e2e-t100-review`: tras escribir «Sitio Ticket», `End` y seis `Shift+ArrowLeft`, `Control+k` no abre el diálogo y vence `expect(dialog).toBeVisible()`. El párrafo queda sin enlaces y no había ningún PUT ni GET en vuelo: el PUT llega unos 650 ms después.
- `starter-e2e-t100-review2`: el enlace queda sobre «icket», cinco letras, y vence `getByRole('link', { name: 'Ticket' })`.
- Causa: `Shift+Arrow` mueve la selección nativa y ProseMirror la toma recién en el evento asíncrono `selectionchange`. `Control+k` llega unos 5 ms después y `openLinkDialog` lee una selección vieja, vacía o una letra corta. Con la selección vacía sale sin abrir. Es la misma causa que la segunda corrección registrada («itio»): cambiar el extremo no elimina la carrera. Los casos existentes usan `Control+a`, que ProseMirror resuelve en su keymap de forma síncrona.
- Corrección suficiente, solo en `e2e/tests/daily-notes.spec.ts` y sin tocar producto: en `linkWord`, después de soltar `Shift` y antes de `Control+k`, esperar con `expect.poll` a que `window.getSelection()?.toString()` sea la palabra y dejar pasar un frame con `requestAnimationFrame` dentro de `page.evaluate`. Tras abrir el diálogo, afirmar que muestra `«Sitio»` o `«Ticket»` según la palabra. Sin retries, timeouts más largos ni `waitForTimeout`. Vale otra técnica equivalente que deje la selección de ProseMirror aplicada antes del atajo y la afirme en el diálogo.
- Condición de cierre: tres corridas consecutivas del comando AC-03 de escritorio, cada una con namespace propio, todas 8/8, y una del comando AC-04 móvil 4/4, con exit y cleanup por label registrados.

**Fallo local de `FreeNotesPage`.** Se reproduce igual sobre `5dcb171` en un worktree de base: `FreeNotesPage.test.tsx › protege el borrador al cerrar sesión…`, sin el diálogo «Guardar los cambios». Es previo y ajeno a T-100 y no bloquea. `verify-required` lo pasa en CI.

| Comando del reviewer | Resultado |
|---|---|
| En `client/`: vitest dirigido de AC-01 y AC-04 y `npm run typecheck` | Exit 0, 88/88, typecheck exit 0 |
| En `server/`: `./mvnw -q test -Dtest=DailyContentTest` | Exit 0 |
| `node scripts/docs-check.mjs` y `git diff --check origin/main...HEAD` en el worktree | Exit 0 ambos |
| `STARTER_E2E_PROJECT=starter-e2e-t100-review` y `…-review2` con el patrón AC-03 de escritorio, barras verticales sin escapar | Exit 1 las dos, 7/8, falla `flexible link:` (H1). Cleanup por label exacto: 0 contenedores, volúmenes y redes en cada namespace |
| `npx vitest run src/features/free-notes/FreeNotesPage.test.tsx` en HEAD y en base | 1 fallo igual en ambos |

### Implementación

2026-11-24. Frontera implementer en Claude Code Desktop con Claude Opus 5.5, esfuerzo sin dato expuesto. Herramientas: Git Bash, gh, Node, Docker y Java 21 del host. Base `origin/main@5dcb171` tras el [PR de planificación #99](https://github.com/MatiasNicolasAcevedo/devnotes/pull/99) MERGED el 2026-11-24T15:33:06Z (`merge-base --is-ancestor` exit 0). Implementación en `2a122ba`, [PR #100](https://github.com/MatiasNicolasAcevedo/devnotes/pull/100). Impacto: UI del diálogo de enlace y de la navegación principal, y el helper E2E `openDailyTools`. Sin cambios de API, permisos, servidor ni datos guardados: `DailyContent.java` y `dailyDocument.ts` no cambian.

**Hecho.** `normalizeLinkHref` en `linkHref.ts` con los pasos del contrato. `LinkDialog` valida con ella desde Zod, entrega el href normalizado a `onSave` y usa el placeholder `google.com`. `AppShell` usa la lista única `PRIMARY_TABS`. Se alinearon `T-050:`, `captureLayout` de OCR y la escena S03 de la demo, sin regrabar. Una entrada que empieza con una sola `/` sigue rechazada con el mensaje de dirección inválida: `URL` la convertiría en host y S-101 rechaza las relativas.

**Tabla de hrefs comprobada.** Los once pares de la tabla dan exactamente el href de la columna derecha en `linkHref.test.ts`, y cada uno pasa `validateDailyContent` del cliente. `DailyContentTest#acceptsEveryHrefNormalizedByTheLinkDialog` acepta los once más `https://jira.ejemplo.test/browse/ABC%201279` del E2E. Los trece rechazos devuelven su mensaje.

| Comando | Resultado |
|---|---|
| Rojo, en `client/`: `npx vitest run src/features/daily/editor/linkHref.test.ts src/features/daily/editor/LinkDialog.test.tsx src/app/AppShell.test.tsx src/app/AppRoutes.test.tsx` sobre la base | Exit 1. `linkHref.test.ts` no resuelve el módulo; 15 fallos: orden en los 7 anchos de `AppShell` y en `AppRoutes`, placeholder, `mi_sitio.test` y los mensajes nuevos del diálogo. |
| Rojo E2E: `STARTER_E2E_PROJECT=starter-e2e-t100-red bash scripts/e2e.sh --grep 'flexible link:\|T-050:' --project desktop` | Exit 1, 2/2 fallan: placeholder `https://ejemplo.com` en lugar de `google.com` y orden `Voz, Notas…`. Dos intentos previos no valen como rojo: el primero cortó en el build de la imagen, que typecheckea los tests, porque `linkHref.ts` todavía no existía; el segundo, con el patrón escrito con barra invertida antes de cada barra vertical en la shell, corrió 0 tests. En la shell el patrón va con barras verticales sin escapar; en esta tabla se escapan solo por Markdown. |
| Verde, mismo vitest dirigido | Exit 0, 4 archivos, 88/88. |
| En `client/`: `npm run typecheck` y `npx eslint src/features/daily/editor src/app/AppShell.tsx --max-warnings 0` | Exit 0 ambos. |
| En `server/`: `./mvnw -q test -Dtest=DailyContentTest` | Exit 0, 96 tests, 0 fallos. |
| `STARTER_E2E_PROJECT=starter-e2e-t100-desktop bash scripts/e2e.sh --grep 'flexible link:\|T-020:\|CA-05:\|T-050:\|T-064:\|screenshot OCR: extract through the proxy' --project desktop` | Exit 0, 8/8: el filtro también toma el segundo `T-020:` y el segundo `CA-05:`. |
| `STARTER_E2E_PROJECT=starter-e2e-t100-mobile bash scripts/e2e.sh --grep 'flexible link:\|T-050:\|T-064:\|screenshot OCR: extract through the proxy' --project mobile` | Exit 0, 4/4. |
| `STARTER_E2E_PROJECT=starter-e2e-t100-helper bash scripts/e2e.sh --grep 'copy previous: preserves\|portability: A exports\|multiline clipboard, persistence, scroll focus and compact layout$\|remove a link only from the selected fragment' --project desktop` | Exit 0, 4/4. Usuarios de escritorio de `openDailyTools`. |
| Cleanup Docker por label exacto `com.docker.compose.project=starter-e2e-t100-{red,desktop,mobile,helper,base020}` | 0 contenedores, 0 volúmenes y 0 redes en cada namespace. |
| En `client/`: `npm run verify` | Exit 1: 940/941. Falla solo `FreeNotesPage.test.tsx › protege el borrador al cerrar sesión…`, que falla igual dos veces sobre un worktree limpio de `origin/main@5dcb171`. `verify-required` lo pasó en #97 y #99: es local y ajeno a T-100. Typecheck, lint, formato y build sin errores. |
| `node scripts/docs-check.mjs` | Exit 1 solo por `trailer/CLAUDE.md`, directorio sin versionar previo a la sesión y ajeno a T-100; no se tocó. |
| `git diff --check origin/main...HEAD` | Exit 0. |
| `bash scripts/verify.sh --policy origin/main` | Exit 0, `profile=APPLICATION`, 13 rutas técnicas. FULL/STARTER: DIFERIDO POR EL DUEÑO. |

**Pendiente.** Corregir H1 en el mismo PR y volver a revisión independiente.

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| `2a122ba` | `T-020:` no encontraba «Agregar enlace» en escritorio. Falla igual sobre `origin/main@5dcb171` (corrida `starter-e2e-t100-base020`): desde #84, en escritorio Enlace vive en la barra y `openDailyTools` abría el popover Herramientas, que deja la barra con `aria-hidden`. | `openDailyTools` no abre el popover si el botón de enlace ya está en la barra. | E2E de escritorio 8/8 y usuarios del helper 4/4. |
| `2a122ba` | `flexible link:` enlazaba «itio»: el cursor desde `End` cruzaba de forma distinta el enlace ya creado. | Cada palabra se selecciona desde su extremo, `End` para «Ticket» y `Home` para «Sitio». | Escritorio y móvil en verde. |
| `f9abefe` | H1: `Control+k` leía una selección de ProseMirror vieja, porque `Shift+Arrow` se aplica en el `selectionchange` asíncrono. | `linkWord` espera la selección nativa con la palabra y un frame, y afirma la palabra en el diálogo. | AC-03 escritorio 8/8 tres veces seguidas y AC-04 móvil 4/4. |

## Prompts de salida

Al publicar la implementación:

```text
Frontera reviewer independiente de T-100 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/tasks/T-100-flexible-links-nav-order.md y los ajustes del 2026-11-24 en S-102 y S-112. PRECONDICIÓN: gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <SHA> y verify-required verde en ese HEAD. Si no se cumple, devolvé el estado vigente. ACCIÓN: revisá normalizeLinkHref contra la tabla y los rechazos de T-100. Comprobá que todo href aceptado pasa dailyDocument.ts y DailyContent, que no se relajó el servidor, los mensajes y el foco del diálogo, y el orden único de navegación en móvil y escritorio. Cotejá el gate diario y corré el E2E dirigido de escritorio de T-100 con un namespace propio. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Tras la corrección de H1 (revisión independiente, ronda 2):

```text
Frontera reviewer independiente de T-100, ronda 2, en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md y docs/tasks/T-100-flexible-links-nav-order.md, en especial «Revisión independiente · ronda 1» y «Corrección de H1 · ronda 1». PRECONDICIÓN: gh pr view 100 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, base 5dcb1718051259cfbbf2cf68bd40e7162810ca12, HEAD igual al último commit de codex/t-100-flexible-links-nav-order (commit documental sobre f9abefe) y verify-required verde en ese HEAD. Si no se cumple, devolvé el estado vigente. ACCIÓN: comprobá que desde 8f91cc2 solo cambian e2e/tests/daily-notes.spec.ts y la documentación, y que linkWord espera la selección y un frame y afirma «Sitio»/«Ticket» en el diálogo, sin retries, timeouts más largos ni waitForTimeout. En un worktree aislado corré el comando AC-03 de escritorio con un namespace propio, barras verticales sin escapar, y registrá exit y cleanup por label. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view 100 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas: si H1 persiste, devolvé a dueño o frontera. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Tras el merge de T-100:

```text
Frontera implementer de T-099 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md y docs/tasks/T-099-persistent-google-session.md con sus referencias. PRECONDICIÓN: gh pr view codex/t-100-flexible-links-nav-order --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED con fecha y oid. Actualizá origin/main con git fetch origin main y comprobá que git merge-base --is-ancestor con el oid confirmado y origin/main sale 0. ACCIÓN: desde origin/main usá la rama codex/t-099-persistent-google-session. En el primer commit conciliá T-100 como done y pasá T-099 a ready en la tarea, BACKLOG y STATUS. Reproducí primero la pérdida de sesión al reiniciar y después implementá persistencia en PostgreSQL con siete días de inactividad y un máximo de 30 días desde cada login. Conservá OIDC, CSRF, revocación y privacidad por propietario. Ejecutá los IT y E2E dirigidos de T-099 con datos ficticios, corré el gate diario y publicá un único PR para revisión independiente. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR con evidencia de reinicio, expiración y logout, y prompt completo de reviewer.
```
