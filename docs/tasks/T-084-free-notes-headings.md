---
id: T-084
status: in_review
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

2026-11-22. Frontera implementer en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24.21.0, JDK 21 y Docker Desktop. [PR #87](https://github.com/MatiasNicolasAcevedo/devnotes/pull/87) contra `main@3c7dc999419a2930a881be68fe0cb44d398a2090`. Conciliación de T-083 en `127b72572c56e4a021142de5e080d92dc8585bb5`. Fuentes de aplicación probadas en `099a9aa179ec69c2c8f11fcc701c2beb7df460bb` y E2E de cierre en `874c071cca41988fcd7c43f687b72bb351afe9ae`, que solo cambia el spec de navegador. El commit hijo solo cambia este checkpoint y STATUS. El HEAD publicado y su CI se documentan en la descripción del PR. Pendiente: revisión independiente del HEAD publicado.

- Comportamiento. Formato incorpora Párrafo, Título 1–3, Negrita por menú y Ctrl+B y Quitar formato en Libres. La conversión conserva texto y selección, incluidos rangos hacia atrás. Párrafo mantiene la negrita. Quitar formato retira la negrita solo en el rango y convierte títulos en párrafos. Dar formato conserva la estructura de las listas y los bloques de código. Las acciones de Lista pueden convertir un título en un item con párrafo. El diario conserva su esquema.
- API y datos. Zod y Java aceptan los tres niveles y la marca bold en texto de prosa y listas. Java valida el mismo documento para la API y el codec XLSX v4. La columna de texto legible incluye también títulos. Sin cambios de rutas, permisos, migraciones ni versión del respaldo.
- Backend. En `server/`, `./mvnw -q test -Dtest=FreeNoteDocumentTest,XlsxFreeNotesRoundTripTest` (exit 0), compilación y Surefire. Documento 46/46 y XLSX 20/20. Incluye rechazo de marcas o niveles ajenos, código sin marcas, diario restringido y restauración exacta. No acredita Failsafe ni cobertura agregada.
- Cliente. En `client/`, `npm test -- --run src/features/free-notes` (34/34, exit 0), `npm run typecheck` (exit 0). Prettier y ESLint dirigidos también exit 0.
- E2E. `STARTER_E2E_PROJECT=starter-e2e-t084-desktop-final bash scripts/e2e.sh --grep 'free-notes: headings' --project desktop` (2/2, exit 0). API, PostgreSQL y sesión reales con OIDC ficticio. Verifica foco, dirección de selección, negrita por teclado, compatibilidad con listas/código, guardado, recarga, rechazo API y restauración v4 en otra identidad ficticia. Cleanup verificado para ambos namespaces propios por etiqueta exacta, cero contenedores, redes y volúmenes.
- Control documental. `node scripts/docs-check.mjs` (exit 0 en checkout aislado), `git diff --check origin/main...HEAD` (exit 0) y `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL informativo). **FULL/STARTER: DIFERIDO POR EL DUEÑO**. Render Auto-Deploy On Commit.

| Causa | Arreglo | Prueba |
|---|---|---|
| La primera consulta de GitHub en el sandbox no conectó (exit 1). | Usar gh fuera del sandbox para la consulta exacta del PR #86. | MERGED con fecha y OID válidos. Fetch y ancestry exit 0. |
| docs-check en el checkout del dueño alcanzó `trailer/CLAUDE.md` sin seguimiento (exit 1). | Validar el commit en un checkout aislado. | docs-check exit 0. |
| Spotless recibió globs en un argumento de expresiones regulares (exit 1). | Pasar las cuatro rutas concretas. | Spotless dirigido exit 0. |
| La fixture de XLSX de párrafo vacío no contenía texto para inyectar la marca (Surefire exit 1). | Construir el párrafo con texto marcado y comprobar que el codec devuelve un error. | XLSX 20/20, incluido el rechazo de la marca. |
| La primera aserción E2E exigía que ambos extremos vivieran en el mismo nodo DOM (exit 1). | Comprobar los desplazamientos del ancla y foco en el texto completo del párrafo. | E2E con selección hacia atrás. |
| En la corrida con un solo caso, la segunda comprobación de disponibilidad consumió 12 s y se agotaron los 30 s del test tras restaurar (exit 1). | Separar edición y restauración en dos casos bajo el mismo filtro. Cada caso mantiene las aserciones, readiness y el plazo existente. | E2E 2/2 sobre `874c071`. |
