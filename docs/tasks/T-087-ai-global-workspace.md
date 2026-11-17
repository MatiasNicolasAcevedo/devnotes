---
id: T-087
status: draft
priority: P2
size: S
milestone: M8
spec: S-116
depends_on: [T-086]
branch: codex/t-087-ai-global-workspace
role: implementer
executor: frontier
pr: null
---

# T-087 · Destino global IA en el shell

## Objetivo

Destino global IA en el shell con el recorrido observable descrito en la aceptación.

## Alcance

Añadir enlace IA y ruta piloto, opciones, selector, compositor y consulta reciente de cuota Groq. Preservar navegación y guardias. Conectar el actor ficticio al piloto y el doble externo por el perfil cerrado de docker-compose.e2e.yml. Ejecutar también el filtro E2E de Voz/OCR en desktop si se modifica el doble compartido. [Contrato S-116](../specs/S-116-ai-workspace.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

IA focalizable y visible en desktop/móvil, envío y copia. Fallo/429 conserva borrador; cambio de espacio/salida invalida tardías. Sin habilitación la navegación no activa IA y el endpoint deniega.

- Desde `client/`. `npm test -- --run src/app/AppRoutes.test.tsx src/app/AppShell.test.tsx src/features/ai` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t087-desktop bash scripts/e2e.sh --grep 'ai workspace: send' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t087-mobile bash scripts/e2e.sh --grep 'ai workspace: send' --project=mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

- Regresión del doble compartido desde raíz, `STARTER_E2E_PROJECT=starter-e2e-t087-shared-provider bash scripts/e2e.sh --grep 'screenshot OCR:|voice' --project=desktop`. Registrar qué casos ejecutó el filtro.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-086](T-086-ai-groq-api.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
