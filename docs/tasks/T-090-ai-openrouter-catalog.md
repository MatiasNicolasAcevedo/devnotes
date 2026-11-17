---
id: T-090
status: draft
priority: P2
size: M
milestone: M8
spec: S-116
depends_on: [T-089]
branch: codex/t-090-ai-openrouter-catalog
role: implementer
executor: frontier
pr: null
---

# T-090 · Elegir un modelo gratuito de OpenRouter

## Objetivo

Elegir un modelo gratuito de OpenRouter con el recorrido observable descrito en la aceptación.

## Alcance

Catálogo de texto gratuito y validación de elegibilidad al enviar. Selector dependiente con filtro/refresco/estados. Aplicar restricciones del proveedor. [Contrato S-116](../specs/S-116-ai-workspace.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Modelo gratuito, retirado, pago, router, precio desconocido y catálogo vencido. No relajar routing, quedarse sin endpoint deja el borrador intacto. Distinguir crédito y 429; permitir elegir otro proveedor.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=OpenRouterAiClientTest,OpenRouterCatalogTest,AiMessageServiceTest -Dit.test=AiMessageApiIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/ai` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t090-desktop bash scripts/e2e.sh --grep 'ai workspace: OpenRouter free' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t090-mobile bash scripts/e2e.sh --grep 'ai workspace: OpenRouter free' --project=mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-089](T-089-ai-gemini-provider.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
