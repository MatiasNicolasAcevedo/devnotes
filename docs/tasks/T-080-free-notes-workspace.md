---
id: T-080
status: draft
priority: P1
size: M
milestone: M7
spec: S-113
depends_on: [T-079]
branch: codex/t-080-free-notes-workspace
role: implementer
executor: frontier
pr: null
---

# T-080 · Libres desde Notas

## Objetivo

Libres desde Notas con el recorrido observable descrito en la aceptación.

## Alcance

Publicar REST sobre el servicio probado y entrada Libres, lista y editor de título/párrafos en rutas privadas. Reusar HTTP, espacio y guardias. Conservar fecha al volver al diario. [Contrato S-113](../specs/S-113-free-notes.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Crear, renombrar, recargar y borrar a 320/768. POST/PUT inválidos, revisión stale, CSRF y ajeno preservan datos. Navegación limpia el caché privado; guardar o descartar afecta solo al borrador correcto.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=FreeNoteDocumentTest -Dit.test=FreeNoteApiIT,FreeNoteServiceIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/app/AppRoutes.test.tsx src/features/free-notes` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t080-desktop bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t080-mobile bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project=mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-079](T-079-free-notes-xlsx.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
