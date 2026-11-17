---
id: T-089
status: draft
priority: P2
size: S
milestone: M8
spec: S-116
depends_on: [T-088]
branch: codex/t-089-ai-gemini-provider
role: implementer
executor: frontier
pr: null
---

# T-089 · Gemini Flash en el selector

## Objetivo

Gemini Flash en el selector con el recorrido observable descrito en la aceptación.

## Alcance

Agregar adaptador generateContent y Flash fijo. Mostrar aviso ficticio y enlace de cuota. Mapear bloqueo de proveedor. [Contrato S-116](../specs/S-116-ai-workspace.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Bloqueo y vacío tienen estados propios. El servidor rechaza referencias a notas en Gemini Free. Cambiar a otra opción requiere gesto. Cuenta y cuota se confirman en proyecto de ensayo.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=GeminiAiClientTest,AiMessageServiceTest -Dit.test=AiMessageApiIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/ai` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t089-desktop bash scripts/e2e.sh --grep 'ai workspace: switch Gemini' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-088](T-088-ai-workers-provider.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
