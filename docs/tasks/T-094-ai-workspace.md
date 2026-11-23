---
id: T-094
status: in_review
priority: P1
size: L
milestone: M8
spec: S-116
depends_on: [T-093]
branch: codex/t-094-ai-workspace
role: reviewer
executor: frontier
pr: 90
---

# T-094 · Elegir y probar IA gratuita desde DevNotes

## Objetivo

Desde el navbar se puede elegir un destino Free y obtener una respuesta copiable usando cualquiera de los cuatro proveedores. Una sola tarea incluye los adaptadores, la interfaz, los fragmentos y la prueba del piloto. [Contrato S-116](../specs/S-116-ai-workspace.md) · [Diseño](../design/WRITING-WORKSPACES.md#ia) · [Muestras ficticias](T-072-writing-provider-evaluation.md).

## Alcance y pasos

1. En `server/` crear la feature `ai` y actualizar seguridad, OpenAPI, configuración y ejemplo de variables. Catalogar modelos de S-116 y usar cuatro adaptadores independientes. Solo el servidor acepta o rechaza la pareja pedida. Preservar las rutas y claves de Voz/Imagen.
2. En `client/src/app/AppShell.tsx`, rutas y `client/src/features/ai/` implementar el control lila, pantalla, opciones y envío. Conectar Diario y Libres al mismo flujo de selección, consentimiento y vista previa. Reutilizar el cliente HTTP con sesión/CSRF y la tipografía del tema.
3. En el doble externo de `docker-compose.e2e.yml` y los tests, simular éxito y fallos de cada proveedor. Incluir positivos/negativos de propiedad y espacio, origen cambiado, Unicode, precio desconocido, secreto ausente, respuesta tardía, 429 sin reenvío y regresiones de Voz/OCR. El navegador llama a DevNotes.
4. En backend local aislado, usar las variables privadas ya cargadas por el dueño. Verificar Free sin cargos antes de consumir cuota. Ejecutar una muestra corta de T-072 por cada modelo directo ofrecido, ligero primero; para el catálogo dinámico de OpenRouter, probar el ligero y una alternativa explícita disponible, y validar el filtro sobre todo el catálogo. Sin reintento automático. Registrar cada resultado y motivo si una credencial, modelo, cuota o ruta ZDR impide la prueba. Pedir al dueño solo el dato de plan ausente si fuese necesario. Durante este ensayo no transmitir notas personales.

## Aceptación y pruebas

| Superficie | Comprobación y resultado esperado |
|---|---|
| Contrato backend | Los cuatro adaptadores responden con texto válido o error saneado, sin enviar en los negativos de S-116. Cambiar proveedor/modelo es deliberado. IT con PostgreSQL 18 y dos actores. |
| Navbar/editor | Destino visible antes del envío, teclado y foco de retorno, sin pérdida de borrador o desplazamiento lateral a 360 px, cuarto de pantalla y escritorio. Acción contextual en ambos editores; el texto copiado coincide con la respuesta. |
| Piloto | Matriz con proveedor, modelo, Free, muestra, estado, modelo servido, duración, cuota conocida y fecha. Distinguir doble, prueba real y bloqueo. Las cuatro integraciones requieren resultado real explícito antes de anunciar validación integral. |

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

## Checkpoint vigente

2026-11-22. Frontera implementer en Codex desktop (GPT-6, PowerShell y Git Bash). [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90), base `dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795`. T-093 conciliada en `d039bae038eebff069012d15ea23488ee09e4b1d` tras verificar PR #89 y ascendencia.

Impacto en UI, API y permisos. Selector en memoria por cuenta y espacio, dos rutas privadas, envío con sesión y CSRF, y selección exacta de Diario y Libres reconstruida en el backend. Cambios de revisión o del texto visible invalidan el fragmento. Conversación y preferencia son efímeras. Claves y flags por proveedor se configuran en el backend. Los permisos sobre fragmentos empiezan vacíos y requieren habilitación por proveedor, espacio y origen. El piloto usa texto ficticio. Render conserva Auto-Deploy On Commit.

### Piloto Free del 2026-11-22

Proceso Java aislado con los adaptadores de T-094, variables inyectadas desde el entorno local y primer ejemplo ficticio de T-072. El dueño confirmó las cuentas Free y el nombre original de la variable de Groq. El ensayo inicial de Groq quedó bloqueado por ausencia de `GROQ_AI_API_KEY`. Se inyectó temporalmente el mismo valor como variable de IA solo en el proceso del piloto. El dueño luego agregó la variable de IA a su entorno. Voz conserva `GROQ_API_KEY`.

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

OpenRouter: 11 modelos de texto de 441 cumplieron el filtro local. El catálogo ZDR devolvió 934 endpoints y cero coincidencias por ID `:free` exacto con esos 11. Las solicitudes conservaron ZDR, rechazo de recolección, techo de precio cero y fallback desactivado. Se observaron respuestas reales de Groq, Workers AI y Gemini Flash-Lite. La aceptación integral del piloto sigue pendiente por Gemini 3.8 Flash y OpenRouter.

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

Los scripts cerraron sus proyectos aislados. La aceptación del piloto queda en revisión independiente con los fallos remotos indicados arriba.

FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Prompts de salida

```text
Frontera reviewer independiente de T-094 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, ambos AGENTS de capa, STATUS, docs/agents/reviewer.md, T-094 y S-116. Comprobá gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,headRefOid,baseRefOid,statusCheckRollup contra HEAD/base publicados. Revisá cada selección, los cuatro adaptadores, acceso a fragmentos, prueba real por modelo y gate dirigido. Si aprobás y verify-required está verde, squash al SHA revisado y confirmá MERGED, fecha y oid. Si hay hallazgos devolvé el mismo PR a un implementer nuevo. Entregá el prompt vigente completo.
```

```text
Frontera implementer de T-095 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/implementer.md y docs/tasks/T-095-trailer-v2.md. Comprobá gh pr view <PR de T-094> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y la ascendencia del squash en origin/main. Conciliá T-094 en codex/t-095-trailer-v2. Partí del tráiler local y del producto probado, entregá los dos cortes con música, sus fuentes y el gate de T-095 en un PR. Cerrá con el prompt completo de reviewer independiente.
```
