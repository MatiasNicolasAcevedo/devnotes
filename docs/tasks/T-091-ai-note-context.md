---
id: T-091
status: draft
priority: P2
size: M
milestone: M8
spec: S-116
depends_on: [T-090]
branch: codex/t-091-ai-note-context
role: implementer
executor: frontier
pr: null
---

# T-091 · Previsualizar un fragmento de notas en IA

## Objetivo

Previsualizar un fragmento de notas en IA con el recorrido observable descrito en la aceptación.

## Alcance

Conectar selección de origen, recorte, vista exacta y consentimiento contextual. Probar con notas ficticias y el doble externo. [Contrato S-116](../specs/S-116-ai-workspace.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Solo pregunta y texto confirmado salen. Cuenta, espacio, revisión, rango y proveedor/origen inválidos rechazan antes del proveedor. Cambio de modelo invalida consentimiento. Copiar respuesta no edita la nota.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=AiNoteContextTest,AiMessageServiceTest -Dit.test=AiMessageApiIT,FreeNoteApiIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/ai` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t091-desktop bash scripts/e2e.sh --grep 'ai workspace: note excerpt' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t091-mobile bash scripts/e2e.sh --grep 'ai workspace: note excerpt' --project=mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-090](T-090-ai-openrouter-catalog.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
