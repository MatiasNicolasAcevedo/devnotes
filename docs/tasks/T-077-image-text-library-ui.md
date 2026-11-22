---
id: T-077
status: mergeable
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-076]
branch: codex/t-077-image-text-library-ui
role: reviewer
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

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=ImageTextServiceTest,SecurityConfigTest -Dit.test=ImageTextApiIT,OcrExtractionApiIT,OpenApiContractIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/ocr` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t077-desktop bash scripts/e2e.sh --grep 'image-text-library:|screenshot OCR:' --project desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-21. Frontera reviewer independiente, ronda 2 de 2, en Claude Code Desktop, Claude Opus 5.5 (`claude-opus-5-5`, esfuerzo sin dato expuesto), Git Bash, Git/gh, Java 21 y Docker. No implementó ni corrigió esta tarea. [PR #80](https://github.com/MatiasNicolasAcevedo/devnotes/pull/80): revisión de `e957aeef3b27fd3ee5857109463ccaea36583ded` contra `main@edb27c87a1097e605d0ed9d0a8dd4327911a5187` en el worktree aislado `.orchestrator/review-t077-r2`. Veredicto: APROBADO, sujeto a `verify-required` verde del commit de transición.

- Entrada (exit 0). `gh pr view 80 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup`: OPEN, listo, base `edb27c8`, head `e957aee`, `verify-required` SUCCESS. Tras `git fetch origin main codex/t-077-image-text-library-ui`, el head coincide con el último commit de STATUS; `git diff --name-only f7ebbd9 origin/codex/t-077-image-text-library-ui` lista solo la tarea y STATUS.
- Igualdad de fuentes (exit 0). `git diff --exit-code e1a57e34f10c9bf5757e4c7d0daa337314e3ca02 origin/codex/t-077-image-text-library-ui -- server/src/main client e2e`: cliente y E2E siguen acreditados por la ronda 1.
- H1 cerrado: `SecurityConfigTest` registra `@MockitoBean ImageTextService` y el slice levanta. H2 cerrado: `imageTextsExactMethodsAllowedAndOthersDenied` deniega PUT, PATCH, HEAD y OPTIONS en colección e ítem con sesión y CSRF reales, y GET a `/child` y a la colección con barra final, con `verifyNoInteractions`; coincide con las tres reglas exactas de `SecurityConfig`. Los métodos permitidos quedan cubiertos por `ImageTextApiIT`.
- Backend desde `server/` (exit 0). `./mvnw -q verify -Dtest=ImageTextServiceTest,SecurityConfigTest -Dit.test=ImageTextApiIT,OcrExtractionApiIT,OpenApiContractIT -Djacoco.skip=true`. Surefire: `ImageTextServiceTest` 12/12 y `SecurityConfigTest` 14/14. Failsafe con PostgreSQL Testcontainers: `ImageTextApiIT` 4/4, `OcrExtractionApiIT` 4/4 y `OpenApiContractIT` 6/6. Sin fallos ni omitidos.
- Documentos y diff (exit 0). `node scripts/docs-check.mjs` en el worktree limpio y `git diff --check origin/main HEAD`.

Pendiente: `verify-required` del commit de transición, comentario APROBADO, squash ligado a ese SHA y MERGED confirmado. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit sigue vigente.

### Corrección de la ronda 1

2026-11-21. Frontera implementer de corrección, ronda 1 de 2, en Claude Code Desktop, Claude Opus 5.5 (`claude-opus-5-5`, esfuerzo sin dato expuesto), Git Bash, Git/gh, Java Corretto 21.0.9 y Docker. [PR #80](https://github.com/MatiasNicolasAcevedo/devnotes/pull/80) contra `main@edb27c87a1097e605d0ed9d0a8dd4327911a5187`. Fuentes corregidas en `f7ebbd9f625008947cbe60f6e0f9769c24d06b8b`; el HEAD de entrega agrega este checkpoint y el prompt de revisión en STATUS. Impacto: solo pruebas; sin cambios de comportamiento, API, permisos, datos ni UI.

- Entrada (exit 0). `gh pr view 80 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid`: OPEN, listo, base `edb27c8`, head `1c9576b`. Tras `git fetch origin main codex/t-077-image-text-library-ui`, el head coincide con el último commit de STATUS. `git pull --ff-only` desde `e1a57e3`; `trailer/` sin versionar preservado.
- H1 y H2 resueltos en `SecurityConfigTest`: `@MockitoBean` de `ImageTextService` y `imageTextsExactMethodsAllowedAndOthersDenied` (PUT, PATCH, HEAD y OPTIONS sobre colección e ítem con sesión y CSRF reales, GET a `/child` y a la colección con barra final, todos 403, y `verifyNoInteractions`).
- Backend desde `server/` (exit 0). `./mvnw -q spotless:apply` sin cambios adicionales y `./mvnw -q verify -Dtest=ImageTextServiceTest,SecurityConfigTest -Dit.test=ImageTextApiIT,OcrExtractionApiIT,OpenApiContractIT -Djacoco.skip=true`. Surefire: `ImageTextServiceTest` 12/12 y `SecurityConfigTest` 14/14. Failsafe con PostgreSQL Testcontainers: `ImageTextApiIT` 4/4, `OcrExtractionApiIT` 4/4 y `OpenApiContractIT` 6/6. Al terminar solo quedaba el Ryuk de Testcontainers, que se retira solo.
- Cliente y E2E acreditados del gate previo: `git diff --exit-code e1a57e34f10c9bf5757e4c7d0daa337314e3ca02 HEAD -- server/src/main client e2e` (exit 0).
- Documentos y diff (exit 0). `node scripts/docs-check.mjs` en un worktree limpio del candidato (el árbol del dueño conserva `trailer/`, ajeno al diff) y `git diff --check`. `verify-required` del HEAD nuevo se vincula en el PR. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render conserva Auto-Deploy On Commit.

### Hallazgos · lista cerrada de la ronda 1

Revisión de `e1a57e3` en Claude Code Desktop (frontera reviewer independiente): CAMBIOS REQUERIDOS. Cliente, E2E, propiedad, CSRF, idempotencia y foco quedaron cotejados sin hallazgos.

| ID | Evidencia | Corrección | Cierre |
|---|---|---|---|
| H1 · bloqueante | El slice `@WebMvcTest` de `SecurityConfigTest` no tenía `ImageTextService`; los 13 casos fallaban con `UnsatisfiedDependencyException`. | `@MockitoBean` de `ImageTextService`; `SecurityConfigTest` y `OpenApiContractIT` sumados al comando backend. | `f7ebbd9`: comando backend con exit 0. |
| H2 | Faltaba el negativo de métodos y rutas vecinas de las reglas nuevas de `SecurityConfig`. | `imageTextsExactMethodsAllowedAndOthersDenied` con el patrón de voz. | `f7ebbd9`: `SecurityConfigTest` 14/14. |

### Gate del implementer sobre las fuentes de T-077

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
