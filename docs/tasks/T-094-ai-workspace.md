---
id: T-094
status: in_progress
priority: P1
size: L
milestone: M8
spec: S-116
depends_on: [T-093]
branch: codex/t-094-ai-workspace
role: implementer
executor: frontier
pr: null
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

2026-11-22. Frontera implementer en Codex desktop (GPT-6, PowerShell). Base `dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795`, PR #89 y ascendencia verificados. Impacto previsto: selección de IA en el navbar, API privada de texto y lectura autorizada de fragmentos guardados, sin persistencia nueva. FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Prompts de salida

```text
Frontera reviewer independiente de T-094 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, ambos AGENTS de capa, STATUS, docs/agents/reviewer.md, T-094 y S-116. Comprobá gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,headRefOid,baseRefOid,statusCheckRollup contra HEAD/base publicados. Revisá cada selección, los cuatro adaptadores, acceso a fragmentos, prueba real por modelo y gate dirigido. Si aprobás y verify-required está verde, squash al SHA revisado y confirmá MERGED, fecha y oid. Si hay hallazgos devolvé el mismo PR a un implementer nuevo. Entregá el prompt vigente completo.
```

```text
Frontera implementer de T-095 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/implementer.md y docs/tasks/T-095-trailer-v2.md. Comprobá gh pr view <PR de T-094> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y la ascendencia del squash en origin/main. Conciliá T-094 en codex/t-095-trailer-v2. Partí del tráiler local y del producto probado, entregá los dos cortes con música, sus fuentes y el gate de T-095 en un PR. Cerrá con el prompt completo de reviewer independiente.
```
