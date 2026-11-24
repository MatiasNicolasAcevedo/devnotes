---
id: T-100
status: ready
priority: P1
size: S
milestone: post-M9
spec: null
depends_on: [T-098]
branch: codex/t-100-flexible-links-nav-order
role: implementer
executor: frontier
pr: null
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

## Checkpoint vigente

2026-11-24. Frontera planner en Claude Code Desktop con Claude Opus 5.5, esfuerzo sin dato expuesto. Herramientas: Git Bash, gh, Node y Java 21 del host. Base `origin/main@190e105` tras el [PR documental #98](https://github.com/MatiasNicolasAcevedo/devnotes/pull/98) MERGED. Impacto: UI del diálogo de enlace y de la navegación principal. Sin cambios de API, permisos ni datos guardados.

| Evidencia | Resultado |
|---|---|
| `gh pr list --repo MatiasNicolasAcevedo/devnotes --state all --limit 8` | Exit 0. PR #98 MERGED el 2026-11-24T15:12:15Z, squash `190e105` en `origin/main`. |
| `new URL(...)` en Node 24 | `URL` acepta y conserva `%` suelto, `\|`, un segundo `#` y `mi_sitio.test`. Entrega punycode, minúsculas y `/` final según la tabla. |
| `java UriCheck.java` en el scratchpad, Java 21 | `java.net.URI` rechaza `100%`, `a\|b`, `a#b#c` y `a[b]`. Devuelve host nulo para `mi_sitio.test` y `ejemplo.123` y acepta las formas codificadas de la tabla. |

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| Sin correcciones todavía | | | |

## Prompts de salida

Al publicar la implementación:

```text
Frontera reviewer independiente de T-100 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/tasks/T-100-flexible-links-nav-order.md y los ajustes del 2026-11-24 en S-102 y S-112. PRECONDICIÓN: gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <SHA> y verify-required verde en ese HEAD. Si no se cumple, devolvé el estado vigente. ACCIÓN: revisá normalizeLinkHref contra la tabla y los rechazos de T-100. Comprobá que todo href aceptado pasa dailyDocument.ts y DailyContent, que no se relajó el servidor, los mensajes y el foco del diálogo, y el orden único de navegación en móvil y escritorio. Cotejá el gate diario y corré el E2E dirigido de escritorio de T-100 con un namespace propio. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Tras el merge de T-100:

```text
Frontera implementer de T-099 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md y docs/tasks/T-099-persistent-google-session.md con sus referencias. PRECONDICIÓN: gh pr view codex/t-100-flexible-links-nav-order --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED con fecha y oid. Actualizá origin/main con git fetch origin main y comprobá que git merge-base --is-ancestor con el oid confirmado y origin/main sale 0. ACCIÓN: desde origin/main usá la rama codex/t-099-persistent-google-session. En el primer commit conciliá T-100 como done y pasá T-099 a ready en la tarea, BACKLOG y STATUS. Reproducí primero la pérdida de sesión al reiniciar y después implementá persistencia en PostgreSQL con siete días de inactividad y un máximo de 30 días desde cada login. Conservá OIDC, CSRF, revocación y privacidad por propietario. Ejecutá los IT y E2E dirigidos de T-099 con datos ficticios, corré el gate diario y publicá un único PR para revisión independiente. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR con evidencia de reinicio, expiración y logout, y prompt completo de reviewer.
```
