---
id: T-079
status: in_review
priority: P1
size: M
milestone: M7
spec: S-113
depends_on: [T-078]
branch: codex/t-079-free-notes-xlsx
role: reviewer
executor: frontier
pr: 82
---

# T-079 · Recuperar notas libres en XLSX v4

## Objetivo

Recuperar notas libres en XLSX v4 con el recorrido observable descrito en la aceptación.

## Alcance

Ampliar codec, servicios y vista previa para v4 y hoja notas_libres. Usar el validador común. Incluir contador de Libres en ambos espacios. [Contrato S-113](../specs/S-113-free-notes.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Restaurar v1/v2/v3 sin inventar Libres. Ida y vuelta v4 conserva título, saltos, ambos espacios y OCR. Cuenta con solo Libres deja de estar vacía. Un documento inválido revierte toda la importación.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=XlsxFreeNotesRoundTripTest,XlsxImageTextsRoundTripTest,XlsxWorkbookReaderTest -Dit.test=PortabilityFreeNotesApiIT,PortabilityImageTextsApiIT,PortabilityImportServiceIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/portability` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t079-desktop bash scripts/e2e.sh --grep 'portability:' --project desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, Java Corretto 21.0.9, Node 24.21.0 y Docker Desktop. [PR #82](https://github.com/MatiasNicolasAcevedo/devnotes/pull/82) contra `main@311e47c1ca6d64f81c3bc1950ec6687a3d418ea7`. Las fuentes probadas están en `23e3d6b1a1ae5e2fa5c7c14e2347ea137e7649c4`. El HEAD de entrega agrega este checkpoint y el prompt en STATUS. GitHub registra `verify-required` por HEAD publicado.

- Entrada y conciliación (exit 0). `gh pr view 81 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName`, `git fetch origin main`, `git merge-base --is-ancestor 311e47c1ca6d64f81c3bc1950ec6687a3d418ea7 origin/main` y consulta de PR abiertos. GitHub confirmó T-078 MERGED y no había otro PR abierto. El primer commit `d101f9fe448bf6befc0573b3e5c73a41773e7aa2` concilió T-078 a `done` y habilitó T-079.
- Impacto. XLSX v4 agrega `notas_libres`, usa el validador de almacenamiento de Libres y conserva título, documento, fechas y espacio. Al restaurar regenera UUID v7 y fija revisión 1. La API informa `freeNotes` en vista previa e importación, total y por espacio. La presencia de Libres bloquea la importación a una cuenta ocupada bajo el lock de cuenta. v1/v2/v3 siguen admitidos y la colección de Imagen se conserva.
- Backend desde `server/` (exit 0). `./mvnw -q spotless:apply` y `./mvnw -q verify -Dtest=XlsxFreeNotesRoundTripTest,XlsxImageTextsRoundTripTest,XlsxWorkbookReaderTest -Dit.test=PortabilityFreeNotesApiIT,PortabilityImageTextsApiIT,PortabilityImportServiceIT -Djacoco.skip=true`. Surefire: 14 + 13 + 138 = 165. Failsafe con PostgreSQL 18.6: 3 + 3 + 24 = 30. Cero fallos, errores u omitidos. El documento inválido deja todas las colecciones vacías. Un fallo forzado en el último lote confirma rollback tras insertar Libres, Imagen y las colecciones previas.
- Cliente desde `client/` (exit 0). `npm test -- --run src/features/portability`: 92 pruebas en 2 archivos. `npm run typecheck`: correcto.
- E2E desde raíz (exit 0). `STARTER_E2E_PROJECT=starter-e2e-t079-desktop bash scripts/e2e.sh --grep 'portability:' --project desktop`: 1/1. API, OIDC y PostgreSQL del stack de ensayo. La fixture XLSX v4 aporta Libres de ambos espacios e Imagen a A antes de exportar. B valida, importa y rechaza reimportar. Se comprobó por etiqueta exacta que quedaron cero contenedores, volúmenes y redes. El build E2E precedió el ajuste de una aserción unitaria Java sobre la versión futura. `git diff --exit-code e32b47a8d322b465745122058fccd7ca9e15f816 23e3d6b1a1ae5e2fa5c7c14e2347ea137e7649c4 -- server/src/main client e2e` vinculó las mismas fuentes de aplicación y E2E (exit 0).
- Documentación y diff (exit 0). `node scripts/docs-check.mjs` en worktree aislado, `git diff --check origin/main HEAD`, y `bash scripts/verify.sh --policy origin/main` con perfil informativo APPLICATION / FULL.

| Causa o evidencia | Ajuste | Comprobación |
|---|---|---|
| `gh pr view` en sandbox no conectó con la API (exit 1). | Ejecutar gh en la superficie autorizada. | PR #81 MERGED y ascendencia en `origin/main` (exit 0). |
| La firma de escritura cambió y las pruebas de versión futura todavía usaban v4. | Actualizar los dobles del escritor y usar v5 en los negativos de versión no admitida. | Compilación y gate backend (exit 0). |
| Cliente conservaba el mensaje anterior en dos expectativas. | Actualizar las expectativas de versión compatible. | Vitest y typecheck (exit 0). |
| El comando de la tarea usaba `--project=desktop`; el parser devolvió exit 2. | Corregir el contrato a `--project desktop`. | E2E 1/1 y limpieza por etiqueta exacta (exit 0). |
| El `trailer/CLAUDE.md` no versionado del dueño falla la regla de docs-check (exit 1 en el checkout principal). | Ejecutar docs-check sobre el árbol versionado en worktree aislado. | docs-check (exit 0). |

Pendiente: revisión independiente. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.
