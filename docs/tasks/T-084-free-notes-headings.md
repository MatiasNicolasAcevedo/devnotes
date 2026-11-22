---
id: T-084
status: mergeable
priority: P1
size: S
milestone: M7
spec: S-114
depends_on: [T-083]
branch: codex/t-084-free-notes-headings
role: implementer
executor: frontier
pr: 87
---

# T-084 · Tres niveles de título y negrita en Libres

## Objetivo

Tres niveles de título y negrita en Libres con el recorrido observable descrito en la aceptación.

## Alcance

Agregar menú Formato y nodos/marcas acordadas; ampliar validadores/fixtures de v4. Preservar selección y foco. [Contrato S-114](../specs/S-114-writing-editor.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Los tres niveles tienen semántica y jerarquía. Negrita desde menú o teclado. Quitar formato conserva texto y rango. Rechazar niveles y marcas desconocidos. Reabrir y restaurar sin pérdida.

- Desde `server/` con Git Bash y JDK 21. `./mvnw -q test -Dtest=FreeNoteDocumentTest,XlsxFreeNotesRoundTripTest`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/free-notes` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t084-desktop bash scripts/e2e.sh --grep 'free-notes: headings' --project desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Frontera reviewer independiente en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24.21.0, JDK 21 y Docker Desktop. [PR #87](https://github.com/MatiasNicolasAcevedo/devnotes/pull/87). Checkout aislado de `fc101e728c31c47960fb583147ccdb42223282ee` contra `main@3c7dc999419a2930a881be68fe0cb44d398a2090`. Veredicto técnico: conforme a S-114, sin cambios requeridos. Pendiente: comprobar `verify-required` en el HEAD de transición, publicar el veredicto y confirmar el squash en GitHub.

- Identidad del diff. `gh pr view 87 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup`, `git fetch origin main codex/t-084-free-notes-headings` y `git rev-parse HEAD^` (exit 0). PR abierto y listo, HEAD/base esperados. El padre `874c071cca41988fcd7c43f687b72bb351afe9ae` difiere del HEAD solo en este checkpoint y STATUS (`git diff --name-only HEAD^ HEAD`, exit 0). `gh run view 45063611855 --repo MatiasNicolasAcevedo/devnotes --json event,headSha,conclusion,status` (exit 0) confirmó la corrida exitosa de pull request ligada a `fc101e7`, posterior a la cancelada. La consulta GraphQL devolvió cero conversaciones de revisión.
- Comportamiento revisado. Formato expone tres niveles semánticos y conserva el título de la nota como metadato. Negrita por menú y Ctrl+B, foco devuelto al editor y selección hacia atrás conservada al convertir y quitar formato. Quitar formato elimina negrita solo del rango y devuelve títulos a párrafos. La prosa de listas admite negrita y mantiene su estructura. El código conserva lenguaje y texto sin marcas. El diario conserva su esquema restringido.
- API y datos. Zod y Java rechazan niveles, marcas y atributos fuera del contrato. Escritura y lectura XLSX v4 reutilizan el validador de Libres. La restauración conserva títulos, marcas, listas y código, y el texto legible incluye los títulos. El diff conserva rutas, permisos y esquema de base de datos.
- Backend. `./mvnw -q test -Dtest=FreeNoteDocumentTest,XlsxFreeNotesRoundTripTest` (exit 0), compilación y Surefire. Documento 46/46 y XLSX 20/20, incluidos negativos de diario, de código y de formato ajeno.
- Cliente. `npm test -- --run src/features/free-notes` (34/34, exit 0) y `npm run typecheck` (exit 0).
- E2E. `STARTER_E2E_PROJECT=starter-e2e-t084-review-87 bash scripts/e2e.sh --grep 'free-notes: headings' --project desktop` (2/2, exit 0). API, PostgreSQL y sesión reales con OIDC ficticio. Confirmados guardado, recarga, rechazo de formatos ajenos y restauración v4 en otra identidad ficticia. Cleanup por label exacto: cero contenedores, redes y volúmenes.
- Control documental. `node scripts/docs-check.mjs` y `git diff --check origin/main...HEAD` (exit 0). `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL informativo). **FULL/STARTER: DIFERIDO POR EL DUEÑO**. Render Auto-Deploy On Commit.

| Causa | Arreglo | Prueba |
|---|---|---|
| La consulta a GitHub bajo sandbox no conectó (exit 1). | Repetir la consulta exacta con autorización fuera del sandbox. | PR y CI vinculados al SHA esperado (exit 0). |
| Git Bash bajo sandbox falló con `NtCreateDirectoryObject 0xC0000022`. | Usar Git Bash explícito fuera del sandbox con Node 24 en PATH. | Sonda de herramientas, perfil y E2E (exit 0). |
