---
id: T-077
status: in_review
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-076]
branch: codex/t-077-image-text-library-ui
role: implementer
executor: frontier
pr: 80
---

# T-077 · Guardar, abrir y borrar textos de Imagen

## Objetivo

Guardar, abrir y borrar textos de Imagen con el recorrido observable descrito en la aceptación.

## Alcance

Exponer REST de T-075 y agregar Textos guardados con el patrón de VoiceLibrary. Guardar y abrir operan sobre texto aislado de la captura. Reutilizar guardias, invalidación de caché, confirmación y foco. [Contrato S-112](../specs/S-112-screenshot-ocr.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Guardar dos textos, abrir/copy, borrar uno y recargar. Guardado fallido conserva texto, borrado fallido conserva fila, doble clic no duplica. Espacio, otra cuenta, CSRF y cuerpo inválido comprobados. Solo Extraer envía al OCR externo.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=ImageTextServiceTest -Dit.test=ImageTextApiIT,OcrExtractionApiIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/ocr` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t077-desktop bash scripts/e2e.sh --grep 'image-text-library:|screenshot OCR:' --project desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-21. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, Java Corretto 21.0.9, Node 24.21.0 y Docker Desktop. [PR #80](https://github.com/MatiasNicolasAcevedo/devnotes/pull/80) contra `main@edb27c87a1097e605d0ed9d0a8dd4327911a5187`. Fuentes probadas en `fbf6f37f061fb73986695d87d1c35ce0743da2d8`. El HEAD de entrega agrega este checkpoint y el prompt de revisión en STATUS.

- Entrada (exit 0). `gh pr view 79 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName`, `git fetch origin main`, `git merge-base --is-ancestor edb27c87a1097e605d0ed9d0a8dd4327911a5187 origin/main` y `gh pr list --repo MatiasNicolasAcevedo/devnotes --state open --json number,headRefName`. PR #79 MERGED, su squash presente en la base y cero PR abiertos al empezar. El primer commit `a4fd7d6689905e1990dbe871696d5f5b82e172ea` concilió T-076 a done y habilitó T-077.
- La API lista, crea, abre y borra texto por cuenta y espacio, usando sesión, CSRF y el lock de cuenta de T-075. Expone paginación por fecha UTC e ID e idempotencia por intento UUID v7. La pantalla guarda una copia de la edición actual, muestra fecha y extracto, abre para copiar en un diálogo y confirma el borrado con restitución de foco. La API de OCR se usa solo al pulsar Extraer texto.
- Backend (exit 0). En `server/`, `./mvnw -q spotless:apply` y `./mvnw -q verify -Dtest=ImageTextServiceTest -Dit.test=ImageTextApiIT,OcrExtractionApiIT -Djacoco.skip=true`. Surefire 12/12 y Failsafe 8/8 con PostgreSQL 18.6 Testcontainers. Comprueba cuenta, espacio, CSRF, cuerpo inválido, paginación, texto intacto y reintento tras borrar. Contenedores propios de PostgreSQL y Ryuk ausentes tras el verify.
- Cliente (exit 0). En `client/`, `npm test -- --run src/features/ocr` (33/33), `npm run typecheck` y ESLint sobre los siete archivos tocados. Los negativos cubren fallo de guardado con reintento del mismo UUID, doble clic, fallo de borrado con conservación de fila y respuesta tardía al cambiar de espacio o cuenta.
- E2E (exit 0). `STARTER_E2E_PROJECT=starter-e2e-t077-desktop bash scripts/e2e.sh --grep 'image-text-library:|screenshot OCR:' --project desktop` (4/4). API, PostgreSQL, proxy y sesión reales con identidades ficticias y doble de OCR.space. Incluye doble clic, dos guardados, copia, borrado con foco vecino, recarga, aislamiento por espacio y un solo envío a OCR. Inspección de capturas de 400 y 1280 px. Cleanup comprobado por label exacto `com.docker.compose.project=starter-e2e-t077-desktop` (0 contenedores, 0 redes y 0 volúmenes).
- Documentos y diff (exit 0). `node scripts/docs-check.mjs` en checkout aislado de los archivos versionados, `git diff --check origin/main HEAD` y `bash scripts/verify.sh --policy origin/main` (perfil informativo APPLICATION / FULL). [verify-required en el commit de fuentes](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/44966564497/job/137036812801). El check del HEAD de entrega se vincula en el PR. Pendiente revisión independiente. Render conserva Auto-Deploy On Commit.

| Causa o evidencia | Ajuste | Comprobación |
|---|---|---|
| `docs-check` desde el árbol del dueño (exit 1) encontró `trailer/CLAUDE.md`, ajeno al diff. | Correr el mismo script en un worktree limpio del candidato y preservar `trailer/`. | docs-check (exit 0). |
| Typecheck inicial falló por props de tipografía de MUI y opciones de Testing Library. | Aplicar estilos con `sx` y usar el nombre accesible exacto con una expresión regular. | Typecheck, ESLint y Vitest (exit 0). |
| El primer E2E rechazó `--project=desktop` (exit 2, antes de iniciar recursos). | Usar la sintaxis `--project desktop` del runner y corregir el comando en la tarea. | E2E 4/4 con cleanup. |

FULL/STARTER: DIFERIDO POR EL DUEÑO.
