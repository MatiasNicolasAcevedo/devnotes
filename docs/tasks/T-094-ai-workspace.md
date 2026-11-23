---
id: T-094
status: in_review
priority: P1
size: L
milestone: M8
spec: S-116
depends_on: [T-093]
branch: codex/t-094-ai-workspace
role: implementer
executor: frontier
pr: 90
---

# T-094 · Elegir y probar IA gratuita desde DevNotes

## Objetivo

Desde el navbar se puede elegir un destino Free y obtener una respuesta copiable usando los cinco destinos habilitables del piloto aprobado. Una sola tarea incluye los cuatro adaptadores, la interfaz, los fragmentos y la prueba del piloto. [Contrato S-116](../specs/S-116-ai-workspace.md) · [Diseño](../design/WRITING-WORKSPACES.md#ia) · [Muestras ficticias](T-072-writing-provider-evaluation.md).

## Alcance y pasos

1. En `server/` crear la feature `ai` y actualizar seguridad, OpenAPI, configuración y ejemplo de variables. Catalogar modelos de S-116 y usar cuatro adaptadores independientes. Solo el servidor acepta o rechaza la pareja pedida. Preservar las rutas y claves de Voz/Imagen.
2. En `client/src/app/AppShell.tsx`, rutas y `client/src/features/ai/` implementar el control lila, pantalla, opciones y envío. Conectar Diario y Libres al mismo flujo de selección, consentimiento y vista previa. Reutilizar el cliente HTTP con sesión/CSRF y la tipografía del tema.
3. En el doble externo de `docker-compose.e2e.yml` y los tests, simular éxito y fallos de cada proveedor. Incluir positivos/negativos de propiedad y espacio, origen cambiado, Unicode, precio desconocido, secreto ausente, respuesta tardía, 429 sin reenvío y regresiones de Voz/OCR. El navegador llama a DevNotes.
4. En backend local aislado, usar las variables privadas ya cargadas por el dueño. Verificar Free sin cargos antes de consumir cuota. Ejecutar una muestra corta de T-072 por cada uno de los cinco destinos del piloto, ligero primero. Validar el filtro de OpenRouter con dobles y actualizar solo los metadatos reales si el acceso existente lo permite. Sin reintento automático. Registrar cada resultado y, por separado, la evidencia de los destinos diferidos. Pedir al dueño solo el dato de plan ausente si fuese necesario. Durante este ensayo no transmitir notas personales.

## Aceptación y pruebas

| Superficie | Comprobación y resultado esperado |
|---|---|
| Contrato backend | Los cuatro adaptadores responden con texto válido o error saneado, sin enviar en los negativos de S-116. Cambiar proveedor/modelo es deliberado. IT con PostgreSQL 18 y dos actores. |
| Navbar/editor | Destino visible antes del envío, teclado y foco de retorno, sin pérdida de borrador o desplazamiento lateral a 360 px, cuarto de pantalla y escritorio. Acción contextual en ambos editores; el texto copiado coincide con la respuesta. |
| Piloto | Matriz con proveedor, modelo, Free, muestra, estado, modelo servido, duración, cuota conocida y fecha. Distinguir doble, prueba real y diferimiento. Exigir texto real en los cinco destinos del alcance aprobado, incluidas las dos alternativas directas de Groq y Workers AI. Registrar los dos diferimientos y la condición de reactivación. |

Comandos desde Git Bash con JDK 21, Node ≥24 y Docker. Crear las pruebas de la feature nombradas a continuación. Registrar cantidades por fase, duración y cleanup por label del proyecto.

```bash
# server/
./mvnw -q verify -Dtest=GroqAiClientTest,WorkersAiClientTest,GeminiAiClientTest,OpenRouterAiClientTest,OpenRouterCatalogTest,AiMessageServiceTest,AiNoteContextTest -Dit.test=AiMessageApiIT,VoiceTranscriptionApiIT,FreeNoteApiIT -Djacoco.skip=true
# client/
npm test -- --run src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx src/features/ai
npm run typecheck
# raíz
STARTER_E2E_PROJECT=starter-e2e-t094-desktop bash scripts/e2e.sh --grep 'ai workspace:' --project desktop
STARTER_E2E_PROJECT=starter-e2e-t094-mobile bash scripts/e2e.sh --grep 'ai workspace: navbar' --project mobile
```

Si cambia el doble compartido, ejecutar además `STARTER_E2E_PROJECT=starter-e2e-t094-regression bash scripts/e2e.sh --grep 'screenshot OCR:|voice' --project desktop`. Aplicar el [gate diario](../TESTING.md#gate-diario). FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Decisión de alcance del dueño

2026-11-22. Se aprueba ajustar S-116/T-094 y continuar en el PR #90. El piloto comprende los dos destinos Groq, los dos Workers AI y Gemini 3.1 Flash-Lite. Gemini 3.8 Flash queda diferido tras el agotamiento del plazo y el 502 saneado del piloto. OpenRouter Free queda diferido porque el piloto no acreditó una ruta compatible para la variante Free. Los dos diferimientos se aplican en catálogo y servidor aunque el proveedor esté configurado. La evidencia histórica describe lo observado en esa corrida.

| Condición de cierre | Evidencia exigida |
|---|---|
| Piloto acotado | Matriz actualizada con texto real en los cinco destinos habilitables y muestras ficticias T-072. Por destino: fecha y hora, plan Free, muestra, pedido/servido, estado, duración y consumo o cuota informados. Conservar corridas previas y filas diferidas con su motivo. Si falla un destino del alcance, conservar el bloqueo. |
| Destinos diferidos | GET y selector los presentan indisponibles y POST directo los rechaza sin inferencia externa aunque haya credenciales configuradas en el fixture. En esta ronda, para OpenRouter se puede consultar el catálogo y los metadatos de ruta con el acceso existente. Registrar compatibilidad comprobada, ausencia o evidencia insuficiente, con fecha y motivo. |
| Política de rutas OpenRouter | GET y POST usan la misma comprobación vigente de la variante `:free` exacta, con ruta de texto, ZDR, rechazo de recolección, precio cero de entrada, salida y por solicitud cuando se publique, sin fallback, créditos ni BYOK. Casos negativos con cero POST al tercero: ruta ausente, variante distinta, precio desconocido o no cero, política incompatible y caché vencida sin refresco válido. Positivo con doble para la variante y ruta compatibles, con las restricciones efectivas en el POST. |
| Cuota Groq | La UI muestra hora de observación junto a solicitudes restantes por día y tokens restantes por minuto según las cabeceras válidas. Cubrir válidas, cero, parciales, ausentes e inválidas. Sin inferir saldo ni presentar consumo como cuota. |
| Disponibilidad y recuperación visibles | Selector y compositor muestran etiqueta e icono además del color, con motivo accesible. Reproducir en componente y E2E dirigido con doble externo el timeout o fallo transitorio y el 429 remoto con y sin espera válida. Preservar el borrador, probar bloqueo del destino afectado, que la concurrencia local no se presente como cuota y que elegir o rehabilitar destino no envíe. Verificar que solo un Enviar deliberado llega al destino confirmado. |
| Revisión | Gate diario y `verify-required` verde sobre el HEAD publicado. Reviewer independiente para el veredicto y eventual squash. Render Auto-Deploy On Commit, sin cambios de configuración ni datos reales. FULL/STARTER: DIFERIDO POR EL DUEÑO. |

Reactivación en una decisión posterior del dueño. Para Gemini 3.8 Flash, comprobar acceso a texto Standard en el proyecto Free y obtener texto dentro de 30 s con una muestra ficticia T-072. Para OpenRouter, acreditar con metadatos vigentes una ruta compatible por cada ID exacto del ligero y una alternativa explícita Free y obtener texto real con ambos bajo la política completa y con muestras ficticias T-072. Completar la misma matriz en los dos casos.

## Checkpoint vigente

2026-11-23. Frontera implementer de corrección limitada en Claude Code desktop (Claude Opus 5.5, `claude-opus-5-5`), Git Bash, Git, gh, Maven, Node y Docker. Se aplicaron los dos P2 de la [revisión de la corrección extraordinaria](#hallazgos-de-la-revisión-de-la-corrección-extraordinaria) en el [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90), dentro del contrato cerrado. Commit técnico `176f66c`. Próximo responsable: frontera reviewer independiente. T-095 espera MERGED verificado con `gh pr view` y `--repo` explícito.

Impacto: el adaptador OpenRouter diferido rechaza también un estado de ruta fuera de rango. En la UI, un 429 con espera cero conserva su aviso y deja Enviar habilitado. No cambian API, permisos, datos, dependencias ni el doble E2E compartido. Se conservan los cinco destinos, los dos diferimientos, los cuatro adaptadores y Render Auto-Deploy On Commit. No hubo inferencia real.

| Causa | Arreglo | Prueba / SHA |
|---|---|---|
| `status.longValue() == 0` truncaba `18446744073709551616` a cero | `status.isIntegralNumber() && status.bigIntegerValue().signum() == 0` en `OpenRouterCatalog.compatibleRoute`, la misma comprobación para GET y POST | `OpenRouterCatalogTest#listsUnavailableAndRejectsBeforeInferenceWithIncompatibleEndpoints` con cuatro casos nuevos: `status-overflow`, `status-decimal`, `status-negative` y `status-absent`. Cada uno verifica la opción indisponible, el rechazo `MODEL` y `never()` sobre `generate`. Rojo exit 1 en el caso overflow (1/21), verde 21/21 · `176f66c` |
| `Retry-After: 0` generaba un vencimiento inmediato y `AiProvider` borraba el aviso | La espera cero crea un `limited` con `ready: true` y `retryAt: null`. `modelStatus` lo muestra con tono `warning` y conserva la etiqueta «Límite temporal del proveedor» o «Cuota agotada». `allowed` acepta `warning`, así que Enviar queda habilitado. El botón de rehabilitación manual no aparece en este caso. El aviso se limpia al empezar el siguiente Enviar deliberado | `AiWorkspace.test.tsx` «conserva el aviso %s con Retry-After: 0…» para `ai-rate-limit` y `ai-quota`: aviso en la región viva y en el selector, Enviar habilitado, borrador intacto, 1 POST sin reenvío y 2 POST tras pulsar Enviar. Rojo exit 1 (2/2), verde · `176f66c` |

Nota para el reviewer: el fragmento comparte el camino del borrador (`setExcerpt(null)` solo ocurre ante una respuesta exitosa). El caso nuevo no agrega un fragmento y los casos existentes de fragmentos siguen verdes.

| Comando | Resultado |
|---|---|
| `gh pr view 90 --repo … --json state,isDraft,headRefOid,baseRefOid,mergedAt,mergeCommit` y `git fetch origin main codex/t-094-ai-workspace` | Exit 0. OPEN, `isDraft=false`, HEAD `239fff8` igual al remoto, base `dee843c` igual a `origin/main` |
| `./mvnw -q test -Dtest=OpenRouterCatalogTest` (rojo, antes del arreglo) | Exit 1, 21 casos, 1 falla (`status-overflow`) |
| `npm test -- --run src/features/ai/AiWorkspace.test.tsx -t 'Retry-After: 0'` (rojo) | Exit 1, 2/2 fallan con «Disponible para intentar» |
| `./mvnw -q verify -Dtest=…siete… -Dit.test=AiMessageApiIT,VoiceTranscriptionApiIT,FreeNoteApiIT -Djacoco.skip=true` | Exit 0. Surefire 42/42, Failsafe 14/14 con PostgreSQL 18.6 |
| `npm test -- --run src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx src/features/ai`, `npm run typecheck`, `eslint src/features/ai --max-warnings 0` | Exit 0, 40/40 · exit 0 · exit 0 |
| `STARTER_E2E_PROJECT=starter-e2e-t094c-desktop bash scripts/e2e.sh --grep 'ai workspace:' --project desktop` | Exit 0, 4/4 |
| `STARTER_E2E_PROJECT=starter-e2e-t094c-mobile bash scripts/e2e.sh --grep 'ai workspace: navbar' --project mobile` | Exit 0, 1/1 |
| Cleanup `docker ps -a` / `docker volume ls` con `label=com.docker.compose.project=<proyecto>` exacto | 0 contenedores y 0 volúmenes en ambos proyectos |
| Regresión `screenshot OCR:\|voice` | No se ejecutó: el doble compartido no cambió |
| `bash scripts/verify.sh --policy origin/main` | Exit 0, informativo: perfil STARTER. **FULL/STARTER: DIFERIDO POR EL DUEÑO** |
| `node scripts/docs-check.mjs`, `git diff --check origin/main...HEAD` y `verify-required` | Ver la fila de cierre del commit documental en el PR. El reviewer debe confirmar `verify-required` verde sobre el HEAD publicado |

### Hallazgos de la revisión de la corrección extraordinaria

2026-11-22. Frontera reviewer independiente en Codex desktop (familia GPT-6, versión puntual sin exponer), PowerShell, Git, gh, Maven y Node. **CAMBIOS REQUERIDOS** para el [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90), HEAD `718a3847a2bd60694b540a28a10e54abaf29451d`, base `dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795`, padre técnico `4a99c87e29fb5477c6313ed47dadfbe2ef3ba1d3`. Impacto pendiente en la decisión de despacho del adaptador OpenRouter diferido y el aviso accesible de un 429. La sesión solo publica documentación de revisión.

| Hallazgo | Evidencia y condición de cierre |
|---|---|
| P2 · Un estado de ruta fuera del rango de `long` se acepta como operativo | `OpenRouterCatalog.compatibleRoute` usa `status.longValue() == 0`. Con la ruta ficticia exacta y los demás campos válidos, el estado entero `18446744073709551616` se reduce a cero y `generate` llega al doble de inferencia. Exigir cero exacto sin conversión que trunque. El negativo debe observar opción indisponible, rechazo antes del despacho y cero llamadas al doble. La exclusión de OpenRouter del piloto contiene este caso en la aplicación vigente. |
| P2 · Un 429 con `Retry-After: 0` pierde su aviso | `AiPage` genera un vencimiento inmediato y `AiProvider` borra el estado en el efecto de expiración. La sonda con el mismo destino confirmado y un único POST ficticio no encuentra «Límite temporal del proveedor». Mantener el anuncio accesible del rechazo y conservar borrador y fragmento. Para cero segundos, dejar disponible Enviar sin espera adicional y exigir otra pulsación deliberada. Cubrir límite temporal y cuota diaria, además de conservar los casos de espera positiva y rehabilitación manual. [RFC 9110 §10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3). |

| Comando o evidencia | Resultado |
|---|---|
| `gh pr view 90 --repo MatiasNicolasAcevedo/devnotes` con estado, refs, CI y datos de merge | Exit 1 en sandbox por conexión, exit 0 con red autorizada. OPEN, `isDraft=false`, HEAD/base indicados, sin merge y [verify-required SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/45100543946/job/137450166436). Consulta GraphQL exit 0, cero hilos de revisión. |
| `git fetch origin main codex/t-094-ai-workspace`, `git rev-parse HEAD origin/main origin/codex/t-094-ai-workspace 'origin/codex/t-094-ai-workspace^'`, `git diff --check origin/main...HEAD` | Exit 0. Los refs coinciden con GitHub, el padre técnico coincide y el HEAD solo agrega los dos archivos de continuidad. |
| `mvnw.cmd -q test -Dtest=OpenRouterCatalogTest,OpenRouterAiClientTest,GroqAiClientTest,AiMessageServiceTest` | 31/31, exit 0, en el worktree del HEAD publicado. Confirma el ID exacto, precios y política, los negativos publicados de política y slug, las restricciones del POST, clasificación de 429 y concurrencia local. |
| `npm.cmd ci --offline --no-audit --no-fund`, `npm.cmd test -- --run src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx src/features/ai` y `npm.cmd run typecheck` | Exit 0. Vitest 38/38. Se cotejó el estado por destino, borrador, foco y cero reenvíos sin Enviar en los casos publicados. |
| Sonda aislada `mvnw.cmd -q test -Dtest=OpenRouterCatalogTest#listsUnavailableAndRejectsBeforeInferenceWithIncompatibleEndpoints` | Exit 1, 1/16 falla con estado entero fuera de rango. El rechazo esperado no se produjo y la segunda sonda comprueba la llamada al doble. |
| Sonda aislada `npm.cmd test -- --run src/features/ai/AiWorkspace.test.tsx -t 'confirma el modelo elegido'` | Exit 1, 1/1 falla por aviso temporal ausente con espera cero. El caso conserva el paso de confirmación y el POST deliberado. |
| Dos GET públicos sin clave de OpenRouter y `node scripts/docs-check.mjs` | Exit 0. 476 modelos, 11 candidatos textuales Free de precio cero, 934 endpoints ZDR, cero coincidencias de ID exacto y cero endpoints que declaren recolección o BYOK. Docs-check en el worktree: 154 Markdown, 91 tareas y HANDOFF 22/22. |

Se cotejaron las fuentes y el gate registrado del implementer para el padre técnico: rojos previos de OpenRouter y 429, Surefire 38/38, Failsafe 14/14 con PostgreSQL 18.6, Vitest 38/38 con typecheck, E2E IA escritorio 4/4, móvil 1/1 y OCR/Voz 7/7 tras repetir el mismo filtro sin concurrencia. Failsafe y los E2E se cotejaron con la evidencia del implementer. El IT conserva ambos 409 con cero llamadas externas en el piloto. El E2E publicado conserva fragmento, espera positiva y rehabilitación sin reenvío. El doble de OpenRouter verifica el ID `:free` y el slug único con ZDR, rechazo de recolección, parámetros exigidos, techo de precio cero y fallback desactivado. [Enrutamiento OpenRouter](https://openrouter.ai/docs/guides/routing/provider-selection) · [Índice ZDR](https://openrouter.ai/docs/api/api-reference/endpoints/list-endpoints-zdr) · [Límites Groq](https://console.groq.com/docs/rate-limits).

Se mantienen cinco respuestas reales de la matriz, los dos destinos diferidos y Render Auto-Deploy On Commit. No hubo inferencia externa en esta revisión. **FULL/STARTER: DIFERIDO POR EL DUEÑO.** El dueño o frontera decide el siguiente paso. T-095 espera MERGED verificado.

### Evidencia de la corrección extraordinaria

2026-11-22. Frontera implementer en Codex desktop (familia GPT-6, versión puntual no expuesta), PowerShell, Git Bash, Git, gh y Docker Desktop. Corrección extraordinaria autorizada por el dueño en el [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90), commit técnico `4a99c87e29fb5477c6313ed47dadfbe2ef3ba1d3`, base `dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795`. Impacto en el despacho externo de OpenRouter, el código de error de la API y el estado de selector y compositor. Se conservan los permisos, el almacenamiento, los cinco destinos del piloto, los dos diferimientos y Render Auto-Deploy On Commit. Pruebas nuevas con dobles y muestras ficticias. T-095 espera MERGED verificado.

| Causa | Arreglo | Prueba |
|---|---|---|
| OpenRouter aceptaba políticas y slugs indeterminados | Catálogo y despacho comparten el snapshot vigente. La ruta de la variante exacta `:free` exige pertenencia al índice ZDR, `data_collection: deny`, `byok: false`, estado operativo, precio cero y soporte para el límite de tokens. Solo se admite un slug con sufijo que seleccione una única ruta entre las del modelo, comprobando duplicados y descendientes aunque sean incompatibles. El POST usa el ID `:free`, `only` con un solo slug, sin fallback, ZDR, exclusión de recolección y tope cero. | `OpenRouterCatalogTest` verifica indisponibilidad y cero inferencia con metadatos ausentes, ambiguos o incompatibles y caché vencida sin refresco. `OpenRouterAiClientTest` inspecciona el POST al doble y verifica que incluye una sola ruta, con una alternativa incompatible publicada en el mismo catálogo. |
| Un 429 remoto se anunciaba siempre como cuota agotada | `ai-rate-limit` para motivo indeterminado. `ai-quota` si Groq devuelve en ese 429 una única cabecera válida de solicitudes diarias restantes en cero. `ai-busy` conserva el estado local. Ambos límites remotos usan el flujo de espera o rehabilitación explícita, con borrador y fragmento intactos hasta un envío exitoso. | Dobles de adaptador y Vitest cubren las tres señales. El E2E comprueba espera válida, recuperación manual sin espera válida, conservación de fragmento y nuevos envíos deliberados. |

El índice público de OpenRouter acredita ZDR. Su esquema documentado no acredita por sí solo recolección ni BYOK para una ruta `:free`. El consumo BYOK histórico en cero por sí solo tampoco demuestra su exclusión. Los campos explícitos del caso positivo se probaron con un doble. La elegibilidad real y la reactivación del proveedor siguen diferidas. [Índice ZDR](https://openrouter.ai/docs/api/api-reference/endpoints/list-endpoints-zdr) · [Enrutamiento](https://openrouter.ai/docs/guides/routing/provider-selection).

Un 429 genérico, `Retry-After`, los tokens por minuto y los contadores ausentes, inválidos o contradictorios dejan indeterminado si se agotó una cuota diaria. Eso incluye el posible consumo por pruebas previas. Gemini, Workers AI y OpenRouter conservan la clasificación temporal mientras falte una señal inequívoca implementada. [Límites de GroqCloud](https://console.groq.com/docs/rate-limits).

| Comando o fase | Resultado |
|---|---|
| `gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup`, `git fetch origin main codex/t-094-ai-workspace`, `git rev-parse HEAD origin/main origin/codex/t-094-ai-workspace 'origin/codex/t-094-ai-workspace^'` y `git diff --name-only e19dc465..b37fd39` | Consulta inicial exit 1 por red del sandbox y exit 0 con acceso autorizado. Fetch, refs y diff exit 0. PR OPEN, listo para revisión, HEAD inicial `b37fd394ee8a638117c6fb155f8d18118d49dd3f`, base esperada y padre `e19dc465d72073f0a0d3af15c2ffe8d4587f7834`. El HEAD inicial modificaba solo T-094 y STATUS. |
| Rojos sobre `b37fd394` | `mvnw.cmd -q test -Dtest=OpenRouterCatalogTest#listsUnavailableAndRejectsBeforeInferenceWithIncompatibleEndpoints`, exit 1, 1/8 falló al aceptar la ruta sin política de recolección. En una copia aislada, `mvnw.cmd -q test -Dtest=GroqAiClientTest#quotaIsSaneAndNeverRetried`, exit 1, 1/1 devolvió `ai-quota` en lugar de `ai-rate-limit` con 429 genérico. También falló la sonda de Vitest del aviso temporal. |
| Maven `verify` dirigido de esta tarea con `-Djacoco.skip=true` | Surefire 38/38. Primer Failsafe 13/14, exit 1. El doble de `AiMessageApiIT` usaba la firma anterior de `AiHttp.exchange`. Se ajustaron los stubs y las verificaciones existentes. Repetición de `./mvnw -q verify` con los mismos filtros, exit 0, Surefire 38/38 en 6,10 s de casos y Failsafe 14/14 en 86,46 s de casos con PostgreSQL 18.6. |
| `npm test -- --run src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx src/features/ai` y `npm run typecheck` | Vitest 38/38, 23,94 s. Typecheck y ESLint dirigido exit 0. |
| E2E escritorio/IA, `STARTER_E2E_PROJECT=starter-e2e-t094-extra-desktop bash scripts/e2e.sh --grep 'ai workspace:' --project desktop` | 4/4, exit 0, 34,83 s de casos. Incluye los cinco destinos del piloto con doble, los diferimientos y los recorridos de recuperación con y sin espera válida. |
| E2E móvil/navbar, `STARTER_E2E_PROJECT=starter-e2e-t094-extra-mobile-check bash scripts/e2e.sh --grep 'ai workspace: navbar' --project mobile` | 1/1, exit 0, 1,83 s de caso. Selector y teclado a 360 px. |
| E2E regresión OCR/Voz, `STARTER_E2E_PROJECT=starter-e2e-t094-extra-regression bash scripts/e2e.sh --grep 'screenshot OCR:\|voice' --project desktop` | Primera corrida concurrente 5/7, exit 1. Fallaron el rechazo de PNG mixto con `text/uri-list` y el caso de aislamiento SP-03/SP-04/SP-10. Se repitió el mismo filtro y proyecto de navegador sin otras corridas en paralelo, con `STARTER_E2E_PROJECT=starter-e2e-t094-extra-regression-check`. 7/7, exit 0, 69,72 s de casos, con los mismos plazos. |
| Cleanup E2E por label exacto `com.docker.compose.project` | Cero contenedores, redes y volúmenes para los cinco namespaces E2E propios. Consultas con filtro exacto, exit 0. |
| `node scripts/docs-check.mjs` y `git diff --check` | Docs-check exit 1 en el workspace por `trailer/CLAUDE.md` local sin seguimiento. Copia limpia de archivos versionados con el cierre, exit 0. Diff check exit 0. |
| `bash scripts/verify.sh --policy origin/main` | Exit 0 en Git Bash con PATH de Node y acceso autorizado. Clasificación `policy=FULL`, `profile=STARTER`. **FULL/STARTER: DIFERIDO POR EL DUEÑO.** |
| GitHub CI | `verify-required` sobre el HEAD del cierre, comprobación por `gh pr view` en el [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90/checks). Pendiente de veredicto independiente. |

### Hallazgos y evidencia de la segunda revisión

2026-11-22. Frontera reviewer independiente, segunda ronda, en Codex desktop (familia GPT-6, versión puntual no expuesta), PowerShell, Git y gh. **CAMBIOS REQUERIDOS** para el [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90), HEAD `4eaf719ae2023f0a6e05be1bee958567cae07e3c`, base `dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795`. Impacto pendiente en validación previa a despacho externo y en la clasificación de 429 de la API y la UI. La segunda ronda termina sin aprobación y la decisión vuelve al dueño o a frontera.

| Hallazgo | Evidencia sobre el HEAD revisado | Condición de cierre |
|---|---|---|
| P1 · OpenRouter acepta evidencia incompleta de la ruta Free | `OpenRouterCatalog.routes` admite ausencia de `data_collection` y conserva solo el `tag`. El positivo de `OpenRouterAiClientTest` omite ese dato. En la sonda, al quitarlo de la única ruta ficticia exacta, el catálogo devolvió `available=true`. El envío consulta ese mismo snapshot antes del POST. La guía del proveedor distingue ZDR y recolección. Un slug general también puede abarcar varios endpoints. [Enrutamiento de OpenRouter](https://openrouter.ai/docs/guides/routing/provider-selection). | Acreditar con metadatos vigentes que la variante `:free` exacta y la ruta seleccionable cumplen toda la política de S-116, incluida la exclusión de recolección y BYOK. Emitir el POST solo si el identificador enviado restringe el despacho a la ruta acreditada. Agregar negativos de política ausente o indeterminada y ruta ambigua con cero POST de inferencia, y un positivo con doble que acredite las condiciones y las restricciones del cuerpo. Conservar el rechazo del piloto. |
| P2 · La UI atribuye todo 429 remoto a cuota agotada | `AiHttp.exchange` clasifica cualquier 429 remoto como `QUOTA` a partir del estado HTTP y un `Retry-After` opcional. `modelStatus` anuncia siempre «Cuota agotada» para ese código. El doble E2E devuelve 429 con un cuerpo genérico. La sonda de componente esperó el estado temporal con espera válida y falló. | Reservar «Cuota agotada» para evidencia de cuota y usar «Límite temporal del proveedor» cuando el remoto solo acredita limitación. Probar ambos estados accesibles en selector y compositor, 429 con y sin espera válida, concurrencia local diferenciada, borrador/fragmento conservados y cero reenvíos al seleccionar, actualizar, vencer la espera o rehabilitar. |

| Comando o evidencia | Resultado |
|---|---|
| `gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup` | Exit 1 por conexión en sandbox y exit 0 con red. OPEN, `isDraft=false`, HEAD y base esperados, [verify-required SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/45096999731/job/137438905661). |
| `git fetch origin main codex/t-094-ai-workspace`, `git rev-parse origin/main origin/codex/t-094-ai-workspace 'origin/codex/t-094-ai-workspace^'` y `git diff --name-only 15e94c4f69d5e2f172627a262f440f7ad3f1a331..origin/codex/t-094-ai-workspace` | Exit 0. Remotos iguales a GitHub. Padre técnico `15e94c4f69d5e2f172627a262f440f7ad3f1a331`. El checkpoint cambia solo STATUS y T-094. |
| `git worktree add --detach`, `node scripts/docs-check.mjs` y `git diff --check origin/main...HEAD` | Creación en sandbox exit 128 por restricción de escritura de Git y exit 0 con autorización. Docs-check sobre el worktree con 154 Markdown, 91 tareas y HANDOFF 22/22, exit 0. Diff check exit 0. |
| `mvnw.cmd -q test -Dtest=OpenRouterCatalogTest,OpenRouterAiClientTest,GroqAiClientTest` | Exit 1 en sandbox por bloqueo de la caché Maven y exit 0 en entorno autorizado. Sonda aislada `-Dtest=OpenRouterCatalogTest#listsUnavailableAndRejectsBeforeInferenceWithIncompatibleEndpoints` con caso adicional sin `data_collection`: exit 1, 1/8 falló por disponibilidad verdadera. |
| `npm.cmd ci --offline --no-audit --no-fund` y `npm.cmd test -- --run src/features/ai/AiWorkspace.test.tsx` | Exit 0 ambos, 9/9 pruebas vigentes. Sonda aislada con `-t 'confirma el modelo elegido'`: exit 1 al esperar «Límite temporal del proveedor» para el 429 temporal ficticio. Se restauraron las fuentes de ambas sondas. |
| `GET /api/v1/models` y `GET /api/v1/endpoints/zdr` públicos | Exit 0. 476 modelos, 11 candidatos Free de texto a precio cero, 934 endpoints ZDR y 0 coincidencias por ID exacto. Coincide con la matriz histórica de esta ronda. [Catálogo de OpenRouter](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties). |

El gate del implementer corresponde al padre técnico. Registró Surefire 26/26, Failsafe 14/14 en PostgreSQL 18.6, Vitest 37/37 tras repetir un fallo de carga del editor, typecheck verde, E2E IA escritorio 4/4 y móvil 1/1, y regresión OCR/Voz 7/7. La revisión cotejó el IT de cinco destinos y dos rechazos 409 con cero llamadas al tercero, sesión y CSRF, propietario, espacio, origen, revisión, rango y digest en ambos editores, y los cuatro adaptadores. Se constató el plazo, la caché de cinco minutos y el refresco deduplicado en los casos ya cubiertos. La hora y las unidades de Groq concuerdan con las cabeceras válidas. Las pruebas vigentes verifican timeout, recuperación de borrador, 429 local, espera y ausencia de reenvío automático. [Cabeceras de Groq](https://console.groq.com/docs/rate-limits).

La matriz registra texto real para los cinco destinos con el primer ejemplo ficticio de T-072, según la aceptación del dueño. Las condiciones de reactivación de Gemini 3.8 Flash y OpenRouter Free siguen documentadas. Esta sesión usó dobles y lecturas públicas de metadatos, sin repetir inferencia real ni los E2E del implementer. Render conserva Auto-Deploy On Commit. **FULL/STARTER: DIFERIDO POR EL DUEÑO.** Se mantiene la recomendación de integrado acumulado por Compose y las rutas privadas.

### Evidencia de la corrección del implementer

2026-11-22. Frontera implementer de corrección en Codex desktop (GPT-6, versión puntual no expuesta, PowerShell, Git Bash, Git, gh y Docker). [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90), base `dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795`, candidato técnico `15e94c4f69d5e2f172627a262f440f7ad3f1a331`. El siguiente commit documenta este gate. El impacto abarca elegibilidad de destinos en API, comprobación de la ruta externa, cuota observada y recuperación en la UI. Se conservaron sesión/CSRF, propiedad de los fragmentos, límites del turno, los cuatro adaptadores y Render Auto-Deploy On Commit. El dueño confirmó usar [las cinco respuestas reales documentadas](#piloto-free-del-2026-11-22). Pendiente el veredicto del reviewer independiente.

| Comando | Resultado |
|---|---|
| `gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup` | Exit 1 por conexión dentro del sandbox y exit 0 con red. Al ingresar, OPEN, `isDraft=false`, base solicitada y `verify-required` SUCCESS sobre `f9793500ca49bcc0847580fdb14062d1a5aacf39`, que publica la decisión del dueño. |
| `git fetch origin main codex/t-094-ai-workspace`, `git rev-parse HEAD origin/main origin/codex/t-094-ai-workspace`, `git merge-base --is-ancestor 3f0ffde6f16c1c703c32edbbc6c9afba34e1b97f origin/codex/t-094-ai-workspace` | Exit 0 para los tres. Los refs coincidieron con GitHub y se verificó la ascendencia del checkpoint del reviewer. |
| Rojo previo | `npm test -- --run src/features/ai/AiWorkspace.test.tsx`, exit 1, Enviar seguía activo tras 429 con espera válida. `mvnw.cmd -q test -Dtest=GroqAiClientTest`, exit 1, faltaba la hora de observación pese al cero válido de solicitudes. |
| Backend dirigido y Failsafe | Comando de [Aceptación y pruebas](#aceptación-y-pruebas) por `mvnw.cmd` con JDK 21, exit 0. Surefire 26/26 en las siete clases dirigidas, Failsafe 14/14 con `AiMessageApiIT,VoiceTranscriptionApiIT,FreeNoteApiIT` contra PostgreSQL 18.6. |
| Cliente | `npm run typecheck` y `npx eslint src/features/ai --max-warnings 0`, ambos exit 0. `npm test -- --run src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx src/features/ai`, primer intento con el editor diario todavía en carga 36/37, exit 1. Repetición con el mismo comando y deadlines, 37/37, 38,83 s, exit 0. |
| E2E escritorio | `STARTER_E2E_PROJECT=starter-e2e-t094-quota-desktop bash scripts/e2e.sh --grep 'ai workspace:' --project desktop`, 4/4, exit 0. 12,78 s de casos, aproximadamente 283 s desde inicio hasta exportación. |
| E2E móvil | `STARTER_E2E_PROJECT=starter-e2e-t094-fix-mobile bash scripts/e2e.sh --grep 'ai workspace: navbar' --project mobile`, 1/1, exit 0. 1,38 s de caso, aproximadamente 176 s desde inicio hasta exportación. |
| E2E regresión del doble compartido | `STARTER_E2E_PROJECT=starter-e2e-t094-fix-regression bash scripts/e2e.sh --grep 'screenshot OCR:\|voice' --project desktop`, 7/7, exit 0. 130,55 s de casos, aproximadamente 419 s desde inicio hasta exportación. |
| Cleanup E2E | `docker ps -aq`, `docker network ls -q` y `docker volume ls -q`, filtrados por cada label exacto `com.docker.compose.project`, exit 0. Cero contenedores, redes y volúmenes en los cinco proyectos de la sesión, incluidos los intentos iniciales. |
| Documentación | `node scripts/docs-check.mjs` sobre una copia del árbol versionado, 154 Markdown y 91 tareas, exit 0. La sonda en el workspace completo devolvió exit 1 por un `CLAUDE.md` de `trailer/`, que es local y ajeno a este PR. `git diff --check origin/main...HEAD`, exit 0. |
| Perfil informativo | `bash scripts/verify.sh --policy origin/main` por Git Bash con Node 24.21.0, exit 0, política FULL y perfil STARTER por el diff técnico del PR. **FULL/STARTER: DIFERIDO POR EL DUEÑO.** |
| Metadatos OpenRouter | Dos GET públicos, exit 0. [Matriz y diferimientos](#piloto-free-del-2026-11-22). |
| Publicación y CI | El commit documental inmediatamente posterior al candidato técnico fija el HEAD para revisión. Consultar `gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup` contra los refs publicados y confirmar `verify-required` sobre ese HEAD. |

| Causa | Arreglo | Evidencia en el candidato técnico |
|---|---|---|
| Las credenciales bastaban para ofrecer los destinos diferidos. | El piloto publica cinco destinos elegibles. Gemini 3.8 Flash y OpenRouter Free muestran motivo de diferimiento y el POST los rechaza antes del tercero. | `AiMessageApiIT` prueba ambos 409 saneados y cero interacciones remotas aun con configuración ficticia. E2E comprueba el catálogo y el rechazo directo. |
| El catálogo de OpenRouter acreditaba candidatos por modelo y precio, sin ruta vigente. | Opciones y envío comparten el catálogo comprobado. Se exige ID `:free` exacto, modalidades de texto, precio cero y endpoint ZDR compatible. Se fija el endpoint permitido en el POST y se conservan ZDR, rechazo de recolección, precio cero y fallback desactivado. La caché dura hasta cinco minutos y deduplica refrescos. | `OpenRouterCatalogTest` prueba ruta ausente, variante distinta, precio desconocido o no cero, recolección incompatible, ruta sin ZDR, BYOK y caché vencida con refresco fallido. Cada negativo devuelve indisponibilidad y verifica cero despacho. `OpenRouterAiClientTest` prueba el positivo de compatibilidad con un doble HTTP y el cuerpo de inferencia restringido a la ruta probada. |
| Los contadores de Groq llegaban sin hora; 429 o fallo remoto permitían volver a pulsar Enviar de inmediato. | El backend conserva la hora de observación con las cabeceras válidas. La UI muestra hora y unidades. El selector y el compositor anuncian el estado por destino y bloquean Enviar cuando corresponde, con selección, actualización y recuperación explícitas. | Groq y E2E cubren válidas, cero, parcial, ausente e inválida. El cliente comprueba timeout, concurrencia local y conservación del borrador. E2E cubre fallo remoto, teclado, anuncios, 429 con y sin espera válida, cambio manual, refresco y ausencia de reenvío al vencer la espera. |
| El doble de cuota trataba 20B y 120B como el mismo modelo al comparar sufijos. | Comparar el ID completo del modelo. | Primer E2E de escritorio con 3/4 y exit 1 por la aserción de cero para 120B. El ajuste solo cambia las cabeceras ficticias de la ruta Groq de texto. |

### Hallazgos y evidencia del reviewer anterior

2026-11-22. Frontera reviewer independiente en Codex desktop (GPT-6, PowerShell, Git Bash y gh). [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90), base `dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795`, HEAD revisado `1ab08eb47057d91ba48cf948ee6bd3dcb230e51d`. `gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup` dio exit 1 dentro del sandbox al conectar a la API y exit 0 con acceso de red. PR OPEN, listo para revisión, con ambos `verify-required` SUCCESS. `git fetch origin main codex/t-094-ai-workspace` y `git merge-base --is-ancestor cd0076b70fc81f75bc126800747b14fb016ca677 origin/codex/t-094-ai-workspace` dieron exit 0. Los refs coincidieron con GitHub y `git log --name-only cd0076b..origin/codex/t-094-ai-workspace` confirmó un único commit de checkpoint y transición. T-093 ya estaba conciliada en esta rama.

**Cambios requeridos del reviewer.** La revisión dejó el PR abierto y remitió el alcance del piloto al dueño. La decisión vigente está arriba.

| Hallazgo | Evidencia | Condición de cierre |
|---|---|---|
| P1 · El piloto Free está incompleto | Gemini 3.8 Flash agotó 30 s y la repetición manual devolvió 502 saneado de DevNotes. El estado remoto exacto queda sin determinar. Tres modelos OpenRouter devolvieron indisponibilidad. El piloto registró cero coincidencias por ID `:free` exacto entre 11 candidatos y 934 endpoints ZDR. Los dobles acreditan el contrato HTTP local. | Obtener texto real para Gemini 3.8 Flash y para OpenRouter ligero y una alternativa Free elegible, con matriz por modelo, o aplicar un ajuste explícito de alcance autorizado por el dueño a S-116/T-094. Usar exclusivamente muestras ficticias. Si sigue ausente la ruta compatible, conservar el bloqueo bajo el contrato actual. |
| P1 · OpenRouter ofrece candidatos sin comprobar la compatibilidad de la ruta | `OpenRouterCatalog.options/filter` usa `/api/v1/models` sin comprobar endpoints ZDR y marca `available=true` por ID, precios y modalidades. `AiMessageService.send` habilita el POST según ese catálogo. El adaptador exige ZDR al inferir y puede recibir rechazo después de ofrecer el destino. [Catálogo de OpenRouter](https://openrouter.ai/docs/api/api-reference/models/get-models). | Hacer que opciones y envío usen disponibilidad comprobada para la variante Free y la política completa. Probar candidato Free sin ruta compatible, catálogo vencido sin refresco válido y candidato válido con el doble externo. Los casos no elegibles muestran indisponibilidad y registran cero POST de inferencia. Conservar ZDR, `data_collection: deny`, precio cero, sin fallback, sin créditos ni BYOK. |
| P2 · La cuota de Groq pierde la hora de medición | `GroqAiClient` recoge los dos contadores válidos y `AiPage` los muestra por turno sin hora. S-116 exige hora y unidades cuando hay cabeceras válidas. [Cabeceras de Groq](https://console.groq.com/docs/rate-limits). | Mostrar la hora de observación junto con las unidades válidas. Probar cabeceras válidas y ausentes o inválidas, sin inferir saldo. |

En el diff publicado se revisaron selección manual y confirmación por turno, descarte de respuestas tardías, adaptadores y configuración, sesión/CSRF, y resolución de fragmentos contra propietario, espacio, revisión, rango Unicode y digest. El backend aplica permisos por proveedor, espacio y origen antes de inferir. La separación entre filtros de catálogo y restricciones de inferencia de OpenRouter origina el hallazgo anterior. La decisión del dueño que solicitó la revisión quedó registrada arriba.

### Verificación independiente del reviewer

| Fase | Comando y resultado |
|---|---|
| Backend dirigido | El comando de [Aceptación y pruebas](#aceptación-y-pruebas) con `mvnw.cmd` en PowerShell dio exit 0. Surefire 18/18 con los cuatro dobles HTTP. Failsafe 14/14 en PostgreSQL 18.6 con los tres IT indicados, incluidos permiso, propiedad, espacio y revisión con OIDC ficticio. |
| Cliente dirigido | `npm.cmd test -- --run src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx src/features/ai` dio exit 0, 30/30 en 13,75 s. `npm.cmd run typecheck` dio exit 0. |
| E2E y piloto | Se cotejaron el código y la evidencia aportada abajo sobre el mismo candidato técnico. Esta sesión repitió backend y cliente, y no repitió los E2E ni consumió cuota de proveedores. |
| Perfil | `bash scripts/verify.sh --policy origin/main` dio exit 0 en Git Bash del host, FULL y perfil STARTER. La primera invocación de Git Bash en el sandbox terminó con código -1073741502. |
| Documentación y diff | `git diff --check origin/main...HEAD` dio exit 0. `node scripts/docs-check.mjs` en el árbol de trabajo detectó `trailer/CLAUDE.md` ajeno y sin seguimiento, exit 1. Sobre el índice exportado del cierre, `node scripts/docs-check.mjs` y `git diff --cached --check` dieron exit 0. |

### Evidencia aportada por el implementer

Impacto en UI, API y permisos. Selector en memoria por cuenta y espacio, dos rutas privadas, envío con sesión y CSRF, y selección exacta de Diario y Libres reconstruida en el backend. Cambios de revisión o del texto visible invalidan el fragmento. Conversación y preferencia son efímeras. Claves y flags por proveedor se configuran en el backend. Los permisos sobre fragmentos empiezan vacíos y requieren habilitación por proveedor, espacio y origen. El piloto usa texto ficticio. Render conserva Auto-Deploy On Commit.

### Piloto Free del 2026-11-22

Proceso Java aislado con los adaptadores de T-094, variables inyectadas desde el entorno local y primer ejemplo ficticio de T-072 («Redactá un aviso breve del T-055»). El dueño confirmó las cuentas Free y el nombre original de la variable de Groq. El ensayo inicial de Groq quedó bloqueado por ausencia de `GROQ_AI_API_KEY`. Se inyectó temporalmente el mismo valor como variable de IA solo en el proceso del piloto. El dueño luego agregó la variable de IA a su entorno. Voz conserva `GROQ_API_KEY`.

| Proveedor y modelo pedido | Evidencia Free | Hora AR | Resultado y modelo servido | Duración | Consumo o cuota informados |
|---|---|---|---|---:|---|
| Groq `openai/gpt-oss-20b` | Proyecto Free confirmado por el dueño | 21:51:50 | Texto, `openai/gpt-oss-20b`, 2/3 términos exactos | 1.384 ms | 104 entrada, 164 salida, 6 razonamiento. 999 solicitudes/día y 7.570 tokens/min restantes |
| Groq `openai/gpt-oss-120b` | Proyecto Free confirmado por el dueño | 21:51:52 | Texto, `openai/gpt-oss-120b`, 1/3 términos exactos | 900 ms | 104 entrada, 251 salida, 22 razonamiento. 999 solicitudes/día y 7.424 tokens/min restantes |
| Workers AI `@cf/openai/gpt-oss-20b` | Workers Free confirmado por el dueño | 21:44:00 | Texto, `@cf/openai/gpt-oss-20b`, 2/3 términos exactos | 4.939 ms | 102 tokens de entrada y 453 de salida. Neurons pendientes de consola |
| Workers AI `@cf/openai/gpt-oss-120b` | Workers Free confirmado por el dueño | 21:44:05 | Texto, `@cf/openai/gpt-oss-120b`, 1/3 términos exactos | 8.757 ms | 100 tokens de entrada y 495 de salida. Neurons pendientes de consola |
| Gemini `gemini-3.1-flash-lite` | Proyecto Free confirmado por el dueño | 21:44:13 | Texto, `gemini-3.1-flash-lite`, 3/3 términos exactos | 1.930 ms | 42 entrada, 180 salida, 139 razonamiento |
| Gemini `gemini-3.8-flash` | Proyecto Free confirmado por el dueño | 21:44:15 | Plazo de 30 s agotado | 30.019 ms | Sin medición |
| Gemini `gemini-3.8-flash`, repetición manual | Proyecto Free confirmado por el dueño | 22:03:05 | Fallo remoto saneado, categoría HTTP 502 de DevNotes | 5.561 ms | Sin medición |
| OpenRouter `baidu/ernie-5.5-flash-preview:free` | `is_free_tier` y uso BYOK declarado 0 | 21:44:47 | Modelo no disponible | 40 ms | Sin medición |
| OpenRouter `google/gemma-4-26b-a4b-it:free` (ligero) | `is_free_tier` y uso BYOK declarado 0 | 21:47:53 | Modelo no disponible | 152 ms | Sin medición |
| OpenRouter `google/gemma-4-31b-it:free` | `is_free_tier` y uso BYOK declarado 0 | 21:47:53 | Modelo no disponible | 112 ms | Sin medición |

En la corrida histórica de OpenRouter, 11 modelos de texto de 441 cumplieron el filtro local. El catálogo ZDR devolvió 934 endpoints y cero coincidencias por ID `:free` exacto con esos 11. Las solicitudes conservaron ZDR, rechazo de recolección, techo de precio cero y fallback desactivado.

El dueño confirmó en esta sesión que las primeras cinco filas son la evidencia real del piloto acotado. Cada una obtuvo una respuesta de texto con la muestra ficticia indicada, en las cuentas Free ya autorizadas. Las credenciales estaban ausentes del entorno expuesto a esta sesión y no se repitieron los ensayos de inferencia.

| Destino diferido | Evidencia vigente y condición para reactivarlo |
|---|---|
| Gemini 3.8 Flash | El piloto previo agotó 30 s y obtuvo 502 saneado al repetirlo manualmente. Requiere decisión del dueño, acceso a texto Standard en el proyecto Free y respuesta real en 30 s con una muestra T-072. |
| OpenRouter Free | El 2026-11-22 a las 22:42:44 AR, `GET /api/v1/models` y `GET /api/v1/endpoints/zdr` públicos devolvieron 476 modelos, 11 candidatos Free de texto a precio cero y 934 endpoints ZDR. Hubo 0 coincidencias por ID exacto y 0 rutas compatibles. Los dos GET salieron con exit 0 con acceso de red. La consulta sin clave acredita metadatos públicos. Reactivar con decisión del dueño, ruta y respuesta real para un ligero y una alternativa con ID `:free` exacto, Free sin créditos ni BYOK y todas las restricciones de [S-116](../specs/S-116-ai-workspace.md#catálogo-y-cuota). |

Referencias consultadas para formatos y límites. [Groq](https://console.groq.com/docs/rate-limits) · [Workers AI](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/) · [Gemini](https://ai.google.dev/gemini-api/docs/pricing) · [OpenRouter](https://openrouter.ai/docs/guides/routing/provider-selection) · [Endpoints ZDR](https://openrouter.ai/docs/api/api-reference/endpoints/list-endpoints-zdr).

### Gate dirigido y correcciones

Los comandos exactos están en [Aceptación y pruebas](#aceptación-y-pruebas). Base `dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795`. Candidato técnico `cd0076b70fc81f75bc126800747b14fb016ca677`.

| Fase | Evidencia |
|---|---|
| Surefire, los siete tests de IA del comando | Exit 0, 18 casos, 5,58 s de suites. Los cuatro clientes hablaron HTTP con un doble local. |
| Failsafe `AiMessageApiIT,VoiceTranscriptionApiIT,FreeNoteApiIT` | Exit 0, 14 casos, 49,62 s de suites. PostgreSQL 18.6, Flyway hasta V9 y OIDC ficticio real para dos actores. |
| Cliente, `npm run typecheck` y lint dirigido | Exit 0 sobre el candidato técnico. |
| Cliente, Vitest de rutas, shell y feature | 30/30, 19,68 s, exit 0. Un intento durante las construcciones paralelas quedó en 29/30. La repetición conservó el filtro y los tiempos del runner. |
| E2E escritorio `ai workspace:` | 3/3, exit 0, 252,4 s en `starter-e2e-t094-desktop`. Cuatro adaptadores, copia, cuota sin reenvío y fragmentos de Diario y Libres. Navbar a 1280 px, cuarto de pantalla (480 px) y zoom 200 % simulado con 640 px a DPR 2. |
| E2E móvil `ai workspace: navbar` | 1/1, exit 0, 169,8 s en `starter-e2e-t094-mobile`. Selector, foco, navegación y ancho de 360 px. |
| E2E regresión `screenshot OCR:\|voice` | 479,6 s, exit 1 inicial por tres aserciones de OCR sobre el menú. Los cuatro casos de Voz y aislamiento pasaron. |
| E2E corrección `screenshot OCR:` en `starter-e2e-t094-ocr-check` | 175,5 s, exit 0, 3/3. El diff de `40cecba` a `cd0076b` conserva backend, Compose, dobles y specs de Voz y Espacios. |
| Contraste de tokens | Lila sobre fondo 9,58:1 y sobre panel 8,66:1, tinta sobre lila 9,31:1, texto sobre panel 12,27:1. |
| Clasificación `bash scripts/verify.sh --policy origin/main` | Exit 0, política FULL y perfil STARTER por las rutas técnicas, incluido Compose. |
| Documentación y CI | `node scripts/docs-check.mjs` sobre el árbol versionado, 154 Markdown y 91 tareas, exit 0. `git diff --check origin/main...HEAD`, exit 0. `verify-required` SUCCESS sobre `cd0076b70fc81f75bc126800747b14fb016ca677` con base `dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795`. [Run del candidato técnico](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/45092728647). El commit de transición es solo documental y tiene su propio run. |

| Causa | Arreglo | Comprobación |
|---|---|---|
| La identidad o el espacio desmontaban el navbar y una referencia de prueba quedaba desconectada. | Mantener el navbar montado y limpiar la preferencia de IA al confirmar el nuevo contexto. Los providers de borrador conservan su clave de cuenta por debajo de la barra. | `AppShell.test.tsx` cubre siete anchos. |
| El doble OIDC se iniciaba con callback automático y la primera prueba esperaba el formulario interactivo. | Activar el modo interactivo como preparación ficticia de la sesión piloto. | E2E de navbar y proveedores alcanza el producto. |
| El selector de Testing Library usaba una opción de Playwright que TypeScript rechaza. | Usar patrones de nombre accesible anclados para las consultas de Testing Library. | `npm run typecheck`. |
| La selección de teclado del fixture no se acreditaba en el editor de Diario. | Guardar el fixture y verificar una selección de texto real con Range y el control Enlace habilitado antes de consultar. | E2E de fragmentos de Diario y Libres. |
| OCR buscaba ausencia de Herramientas, aunque el menú de Diario ahora incluye acciones de nota en la base. | Conservar el negativo funcional y comprobar que Herramientas carece de una entrada de OCR antes de navegar por Imagen. | Tres casos OCR verdes, `cd0076b`. |
| Spotless reformateó dos archivos de Libres heredados durante la primera compilación. | Aplicar solo el formato que requiere `spotless:check` en el gate. | Maven `verify`, exit 0. |

El implementer registró el cierre de sus proyectos aislados. La revisión conserva el resultado inicial de regresión y el resultado corregido de OCR como fases distintas.

FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Prompts de salida

```text
Frontera reviewer independiente de T-094 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, ambos AGENTS de capa, STATUS, docs/agents/reviewer.md, T-094 y S-116. Comprobá gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,headRefOid,baseRefOid,statusCheckRollup contra HEAD/base publicados. Revisá cada selección, los cuatro adaptadores, acceso a fragmentos, matriz del piloto acotado, diferimientos, negativos de cero inferencia, hora y unidades de Groq y gate dirigido. Si aprobás y verify-required está verde, squash al SHA revisado y confirmá MERGED, fecha y oid. Si hay hallazgos devolvé el mismo PR a un implementer nuevo. Entregá el prompt vigente completo.
```

```text
Frontera implementer de T-095 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/implementer.md y docs/tasks/T-095-trailer-v2.md. Comprobá gh pr view <PR de T-094> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y la ascendencia del squash en origin/main. Conciliá T-094 en codex/t-095-trailer-v2. Partí del tráiler local y del producto probado, entregá los dos cortes con música, sus fuentes y el gate de T-095 en un PR. Cerrá con el prompt completo de reviewer independiente.
```
