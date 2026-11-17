---
id: T-088
status: draft
priority: P2
size: S
milestone: M8
spec: S-116
depends_on: [T-087]
branch: codex/t-088-ai-workers-provider
role: implementer
executor: frontier
pr: null
---

# T-088 · Cloudflare Workers AI en el selector

## Objetivo

Cloudflare Workers AI en el selector con el recorrido observable descrito en la aceptación.

## Alcance

Agregar adaptador Workers REST, configuración Free y enlace de consumo. Usar selector global. [Contrato S-116](../specs/S-116-ai-workspace.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

El contrato fija proveedor/modelo, conserva borrador al cambiar y no hace fallback ante 429. Token y cuenta quedan en servidor. Verificar Free antes del eventual ensayo real.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=WorkersAiClientTest,AiMessageServiceTest -Dit.test=AiMessageApiIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/ai` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t088-desktop bash scripts/e2e.sh --grep 'ai workspace: switch Cloudflare' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-087](T-087-ai-global-workspace.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
