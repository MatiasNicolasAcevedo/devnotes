---
id: T-065
status: mergeable
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-064]
branch: codex/t-065-spaces-journey
role: implementer
executor: frontier
pr: 68
---

# T-065 · Recorrido dirigido de espacios y respaldo

## Objetivo

Demostrar integración de dos espacios con API/DB/OIDC reales y evidencia desktop/mobile.

Draft **solo por dependencias**: T-064 MERGED y conciliada. Contrato completo en S-109; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

E2E nuevo prefijo `spaces:` y dos actores: diario/versiones/ref/voz texto/navegación/backups. Proveedor/micrófono ficticios si se transcribe; no Groq real. Conservar suites históricas y adaptar helpers space. Guía Android real al dueño sin inventar aceptación.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [client/AGENTS](../../client/AGENTS.md).
4. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
5. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`e2e/tests/spaces.spec.ts`, helpers/fixtures necesarios y `portability.spec.ts` si comparte setup; bitácora. No mocks de API propia ni FULL.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

SP-01…10 integrados en recorridos pequeños: misma fecha dos espacios/reload, no cruces @/historial/voz, guardias/carreras, roundtrip v2/v1 y segundo actor denegado. Capturas ficticias en anchos; teclado Android real pendiente del dueño identificado.

Desde raíz, Git Bash con Docker Linux y Node >=24:

```bash
STARTER_E2E_PROJECT=starter-e2e-t065-desktop bash scripts/e2e.sh --grep 'spaces:' --project desktop
```

Raíz, Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t065-mobile bash scripts/e2e.sh --grep 'spaces:' --project mobile`. Filtro con cero tests seleccionados no es éxito.

Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Evidencia por criterio

| Criterio | Comprobación |
|---|---|
| SP-01 | Editor de la misma fecha vacío y sin filas al abrir; guardados distintos que sobreviven al cambio de espacio y a la recarga. |
| SP-02 | `PrivateSpaceMigrationIT` en PostgreSQL 18.6 instala V6 con fixtures y sube a V7. Compara las cuatro colecciones conservando contenido, IDs, relaciones, revisiones y timestamps. Personal queda vacío. |
| SP-03 | Búsqueda, listas, detalle, conteos, edición y borrado de referencias y voz según espacio. El segundo actor usa otra sesión OIDC. Se compara el 404 por ID fuera de alcance con el de ID inexistente y se comprueba el 404 del diario y la versión ajenos. |
| SP-04 | Reemplazo de la versión de Personal sin tocar Trabajo. El selector `@` devuelve coincidencias de Personal y un átomo de Trabajo se muestra como «Referencia no disponible». |
| SP-05 | PUT real retenido hasta el ACK, conflicto 409 de otro escritor y conservación de origen/borrador. Voz prueba quedarse, guardar y descartar. Una transcripción exitosa retenida con CDP y audio sintético no aparece tras cambiar de espacio. |
| SP-06 | Chromium en 360/375/390/767/768/1280 CSS px, más 640 × 400 como viewport equivalente al 200 %. Selector por teclado y foco visible. Captura con usuario ficticio tapado. Complementa la regresión de contraste, disposición y foco de T-064. Android real queda pendiente. |
| SP-07 | La URL explícita prevalece, Atrás/Adelante restauran el espacio, otra pestaña usa la preferencia y cambiarla no cambia la pestaña abierta. Valores inválidos no inician lecturas/escrituras privadas. Logout limpia la preferencia y la API devuelve 401. |
| SP-08 | Descarga y restauración v2 con dos espacios y fecha repetida, cuatro conteos por espacio, IDs nuevos de referencias y átomo cruzado intacto. Fixture histórico v1 importado solo en Trabajo; cuenta con datos únicamente en Personal rechaza la importación. |
| SP-09 | Solicitudes HTTP simultáneas de importación y escritura en cada espacio con un solo resultado válido. El IT existente fuerza ambos órdenes de la carrera. Confirmación obsoleta devuelve 409 visible y no presenta éxito. |
| SP-10 | Operaciones de diario y versiones sin `space` se mantienen en Trabajo. Se observa el parámetro explícito en las peticiones del cliente y se comprueban las claves privadas con `SpaceApiContext.test.ts`. |

El runner de Playwright construye la imagen con contexto `e2e/`. Se conservó una copia byte a byte de la fixture v1 de `server/src/test/resources/portability/xlsx/devnotes-v1.xlsx` en `e2e/fixtures/devnotes-v1.xlsx` (SHA-256 `7e7f784b5b8c4d6fe3952d197cb29c606687141ebdbee0f27330feef4ad4a9c5`). La prueba histórica de Referencias conserva sus aserciones y reconoce la URL canónica con `space=work`.

## Checkpoint vigente

2026-11-14 · Frontera implementer en Codex Desktop, GPT-6 (variante/esfuerzo no expuestos), PowerShell, Git, gh, Git Bash, Node 24.21.0 y Docker Desktop Linux. Worktree propio `.orchestrator/t-065` sobre main publicado `dc18096cc25e53f07212143c3b62558c416fffd2`. PR67 MERGED y conciliada en T-064. Sin PR abierto al tomar la tarea. El cambio cubre pruebas y documentación; comportamiento, API, permisos, datos y UI de producto se ejercitan con fixtures.

**FULL/STARTER DIFERIDO POR EL DUEÑO.**

Fuentes técnicas verificadas en `eae5484a9b901c443f15b915308f9ff1cf86e12b` contra `origin/main` en `dc18096cc25e53f07212143c3b62558c416fffd2`. API propia, Chromium, PostgreSQL 18.6 y OIDC de prueba. Los comandos de Aceptación se ejecutaron desde raíz en Git Bash con Node de host. Evidencia saneada local por namespace:

| Comando | Exit y alcance | Artefactos |
|---|---|---|
| `STARTER_E2E_PROJECT=starter-e2e-t065-desktop bash scripts/e2e.sh --grep 'spaces:' --project desktop` | 0 · 11/11, 0 omitidos | `e2e/artifacts/starter-e2e-t065-desktop/sanitized/` |
| `STARTER_E2E_PROJECT=starter-e2e-t065-mobile bash scripts/e2e.sh --grep 'spaces:' --project mobile` | 0 · 11/11, 0 omitidos | `e2e/artifacts/starter-e2e-t065-mobile/sanitized/` |
| `STARTER_E2E_PROJECT=starter-e2e-t065-regression bash scripts/e2e.sh --grep 'private reference CRUD&#124;portability: A exports' --project desktop` | 0 · 2/2, 0 omitidos, sobre `6e4fcc904161b38cc6398723375317744b161e0a` | `e2e/artifacts/starter-e2e-t065-regression/sanitized/` |

En cada namespace se comprobó `label=com.docker.compose.project=<namespace>` con `docker container ls -aq --filter`, `docker network ls -q --filter` y `docker volume ls -q --filter`. Antes y después, 0 contenedores, 0 redes y 0 volúmenes. Los JUnit saneados tienen casos positivos, cero fallos y cero omitidos. Hay una captura saneada por proyecto.

Complemento SP-02 y SP-09. En `server/` con Git Bash y JDK 21, `./mvnw -o -B -q verify -Dtest=PrivateSpaceTest -Dit.test=PrivateSpaceMigrationIT,PortabilityImportServiceIT -Djacoco.skip=true` sobre el backend de la base. Exit 0 con 10 unitarios y 22 IT, cero omitidos. SP-02 comprobó el upgrade de V6 poblada a V7 con las cuatro colecciones y los datos originales intactos. Los IT de importación cubrieron ambos órdenes de la carrera en cada espacio. Cleanup por IDs exactos de los dos PostgreSQL 18.6 y Ryuk, cero restantes.

Complemento SP-05 y SP-10. Desde `client/`, `npm.cmd ci --no-audit --no-fund` → 0 y `npm.cmd test -- --run src/features/spaces/SpaceApiContext.test.ts src/features/spaces/SpaceNavigation.test.tsx` → 0, 31/31. La primera instalación con `--offline` devolvió `ENOTCACHED` y se repitió desde el mismo lockfile. El diff modifica pruebas E2E y documentación.

Cierre: `node scripts/docs-check.mjs` → 0 (124 Markdown, 68 tareas, HANDOFF 22/22). `git diff --check` y `git diff --check origin/main...HEAD` → 0. `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → 0, `policy=FULL`, `profile=APPLICATION`, 6 rutas (3 técnicas). El cierre documental conserva las fuentes probadas y la misma base.

## Bitácora de correcciones

- Primer desktop sobre el blob `ebd8c8cec44f8b49367aa7fd1beb2be394156e08`: exit 1, 10 casos, 5 fallos y cleanup 0/0/0 por label exacto. Se corrigieron los selectores de búsqueda y de error de importación, la lectura del detalle de voz y el acceso por Tab en ambos layouts. JUnit saneado en `e2e/artifacts/t065-desktop-first-sanitized/`. Se agregó el caso de respuesta de transcripción real retenida con CDP y micrófono/proveedor sintéticos.
- Primer arranque Maven: PowerShell separó `.skip=true` y Maven salió 1 antes de crear recursos. Se pasó el comando completo a Git Bash con `-c` y el dirigido quedó verde con 10/10 unitarios y 22/22 IT (migración 1, importación 21). Cleanup de Testcontainers por IDs exactos de los dos PostgreSQL y Ryuk: cero restantes.
- Desktop, mobile y regresión sobre `184945a` salieron 1 sin ejecutar casos. La imagen propia con `playwright test --list --reporter=list` reprodujo el fallo: Playwright exige declarar `launchOptions` a nivel de archivo porque cambia el worker. Se movió la opción del dispositivo sintético al nivel del spec; los demás casos no solicitan micrófono. Cleanup de los tres namespaces por label exacto: 0/0/0.
- Desktop y mobile sobre `6e4fcc9` salieron 1 con 10/11 verdes cada uno. El único fallo fue esperar una revisión 0 en un GET de diario ajeno. Conforme a la API y a la regresión histórica, se exige 404, ausencia de contenido y cero notas en la segunda cuenta. JUnit saneado preservado en `e2e/artifacts/t065-{desktop,mobile}-6e4fcc9-sanitized/`. Regresiones desktop de referencias y portabilidad sobre el mismo SHA: 2/2, exit 0.

## Revisión independiente R1

Checkpoint del 2026-11-14. Frontera reviewer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh, Git Bash, Node 24.21.0 y Docker Desktop Linux. Worktree propio `.orchestrator/t-065-review` en HEAD publicado `9a8129ac9670b016c682d2e555d0f3e3dbfaeae4`, base `dc18096cc25e53f07212143c3b62558c416fffd2`, fuentes de `eae5484a9b901c443f15b915308f9ff1cf86e12b`. Alcance de PR68: pruebas y bitácora que ejercitan comportamiento, API, permisos, datos y UI.

Dirigidos propios desde raíz con `bash scripts/e2e.sh --grep 'spaces:.*(second actor|import competing|stale import)' --project desktop` y `bash scripts/e2e.sh --grep 'spaces:.*(late transcription|responsive navigation)' --project mobile`, namespaces exactos `starter-e2e-t065-r1-desktop` y `starter-e2e-t065-r1-mobile`. JUnit saneado bajo `e2e/artifacts/<namespace>/sanitized/`. Cleanup del harness y comprobación de contenedores/redes/volúmenes por label exacto.

Desde `server/`, `./mvnw -o -B -q verify -Dtest=PrivateSpaceTest -Dit.test=PrivateSpaceMigrationIT,PortabilityImportServiceIT -Djacoco.skip=true` para migración e importación concurrente, con Testcontainers y fixtures locales. Validar resumen Failsafe y cleanup por IDs propios. Retoma de este checkpoint: revisar resultados por criterio y publicar la transición documental.

**FULL/STARTER DIFERIDO POR EL DUEÑO.**

### Resultado de R1

GitHub confirmó PR68 abierto, la rama esperada y [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43606830349/job/132483174162) en `9a8129ac9670b016c682d2e555d0f3e3dbfaeae4`. PR67 figura MERGED y su squash coincide con la punta de main y base de PR68. Desde `eae5484a9b901c443f15b915308f9ff1cf86e12b` cambian solo Markdown de tarea y STATUS. PR68 añade pruebas y documentación; conserva la regresión de Referencias con la URL canónica y mantiene la fixture v1 idéntica a la del servidor por SHA-256.

| Criterio | Contraste con fuentes y evidencia |
|---|---|
| SP-01 | En ambos proyectos, el editor vacío conserva cero filas y no emite escrituras. La misma fecha mantiene borradores distintos al cambiar de espacio y recargar. |
| SP-02 | `PrivateSpaceMigrationIT` instala V6, carga las cuatro colecciones y aplica V7 en PostgreSQL 18.6. Comprueba las filas originales, espacio Trabajo, Personal vacío, unicidad por dueño/espacio/fecha, restricciones y relación de la versión con su nota. |
| SP-03 | Dos contextos de navegador autentican identidades locales distintas por el proveedor OIDC ficticio. CRUD, listas y conteos por espacio, búsqueda de Referencias, 404 indistinguibles para GET/PUT/DELETE de referencia y voz, denegación de diario y versión ajenos y 403 sin CSRF. Repetido en desktop. |
| SP-04 | Reemplazar la versión manual en Personal preserva la de Trabajo. El selector `@` solo encuentra referencias del espacio y el átomo cruzado se ve como «Referencia no disponible». |
| SP-05 | CDP retiene la respuesta HTTP real del guardado hasta comprobar origen y ausencia de lecturas de destino. El 409 conserva el borrador; Voz permite seguir, guardar o descartar. Repetido en mobile el descarte durante una transcripción real con audio/proveedor sintéticos. El dirigido de cliente cubre también el 409 de Voz y el bloqueo durante el guardado de una versión. |
| SP-06 | Capturas saneadas desktop/mobile inspeccionadas. Chromium verifica 360/375/390/767/768/1280 CSS px y reducción a 640 × 400 equivalente al 200 %, con foco, teclado y áreas táctiles. Contraste complementado por R2 de T-064. La aceptación en Android físico con teclado y zoom nativos sigue pendiente del dueño. |
| SP-07 | Preferencia, URL explícita, Atrás/Adelante, nueva pestaña, parámetros inválidos sin pedidos privados, logout y 401. Repetido en mobile. |
| SP-08 | Descarga y restauración v2 con la misma fecha en ambos espacios, cuatro conteos por espacio, IDs nuevos, versiones ligadas a su espacio y átomo cruzado intacto. La fixture v1 restaura solo en Trabajo. Se repitió en desktop el rechazo por cuenta con datos únicamente en Personal. |
| SP-09 | Repetidas ambas carreras HTTP en desktop. Se verifica un único resultado válido, estado final y 409 de confirmación obsoleta sin éxito UI. `PortabilityImportServiceIT` fuerza ambos órdenes por espacio. |
| SP-10 | Diario e historial sin `space` conservan Trabajo. Las solicitudes observadas llevan un único contexto explícito y `SpaceApiContext.test.ts` verifica todas las operaciones persistentes y las claves privadas por identidad y espacio. |

- Playwright del checkpoint: desktop 4/4 y mobile 2/2, exit 0 en ambos, con JUnit saneado sin errores, fallos ni omitidos. Cleanup verificado antes y después en ambos namespaces por `label=com.docker.compose.project=<namespace>`, con 0 contenedores, 0 redes y 0 volúmenes. En los tres namespaces del implementer también se verificó cero recursos y se contrastaron sus JUnit saneados: desktop 11/11, mobile 11/11 y regresión histórica 2/2 sobre el SHA consignado en la bitácora.
- Maven dirigido: Surefire 10/10 y Failsafe 22/22 (migración 1, portabilidad 21), cero errores, fallos y omitidos. El primer control posterior encontró Ryuk retirándose y el wrapper devolvió 2. La segunda comprobación por los tres IDs exactos encontró cero contenedores.
- Desde `client/`, `npm.cmd ci --offline --no-audit --no-fund` devolvió `ENOTCACHED`. `npm.cmd ci --no-audit --no-fund` desde el mismo lockfile devolvió 0. `npm.cmd test -- --run src/features/spaces/SpaceApiContext.test.ts src/features/spaces/SpaceNavigation.test.tsx` → 0, 31/31.
- `node scripts/docs-check.mjs` y `git diff --check` → 0. Clasificador sobre la base publicada → `policy=FULL`, `profile=APPLICATION`, 6 rutas y 3 técnicas. **FULL/STARTER DIFERIDO POR EL DUEÑO.**

Veredicto técnico R1 **favorable, sin bloqueantes**. El comentario canónico de [PR68](https://github.com/MatiasNicolasAcevedo/devnotes/pull/68) liga esta revisión al HEAD de transición documental y a la base exacta, con `verify-required` en SUCCESS. Merge pendiente en otra sesión según AUTONOMY y Render sujeto a autorización expresa separada sobre SHA y ventana.

## Comprobación del dueño en Android físico

Pendiente de aceptación. Usar un entorno de prueba con este SHA, dos espacios y una cuenta ficticia. Registrar modelo, versión de Android, navegador, teclado, orientación, SHA y resultado por paso. Si se reproduce un problema, anotar la acción y el resultado esperado/observado. Adjuntar solo capturas con datos ficticios y la identidad tapada.

1. En vertical, abrir Notas. Verificar selector con texto e ícono, etiquetas de los cuatro destinos y acceso a Datos desde Cuenta. Cambiar entre Trabajo y Personal y confirmar que la fecha se conserve y que cada espacio muestre su propia nota.
2. Con el teclado real abierto, escribir varias líneas, mover el cursor al final, agregar un enlace y guardar una versión. Comprobar que el cursor, los avisos y las acciones de confirmación queden alcanzables sin que la cabecera, la barra inferior o el teclado los tapen. Repetir en horizontal y con el teclado cerrado.
3. En Voz, escribir un borrador y cambiar de espacio. Probar «Seguir aquí» y luego «Guardar y cambiar». Comprobar que el texto quede guardado solo en el espacio de origen.
4. Con el zoom nativo del navegador al 200 %, repetir el cambio de espacio, la navegación y la edición con el teclado abierto y cerrado. Comprobar etiquetas, foco, acceso a controles y ausencia de desplazamiento horizontal de la página. Registrar el método de zoom y el resultado.

El ensayo de Render requiere una autorización expresa separada sobre SHA y ventana.

## Cierre y siguiente tarea

Implementación publicada en [PR68](https://github.com/MatiasNicolasAcevedo/devnotes/pull/68). La revisión independiente R1 deja el veredicto en PR68 y la evidencia en esta tarea. El dueño conserva la aceptación física de Android. El merge y T-066 corresponden a sesiones posteriores.

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-066 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
