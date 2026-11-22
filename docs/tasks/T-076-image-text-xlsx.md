---
id: T-076
status: mergeable
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-075]
branch: codex/t-076-image-text-xlsx
role: reviewer
executor: frontier
pr: 79
---

# T-076 · Recuperar textos de Imagen en XLSX v3

## Objetivo

Recuperar textos de Imagen en XLSX v3 con el recorrido observable descrito en la aceptación.

## Alcance

Implementar codec v3, importación, exportación, conteos por espacio, lock de cuenta y cliente de respaldo. Ampliar guía de recuperación. [Contrato S-112](../specs/S-112-screenshot-ocr.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Ida y vuelta v1/v2/v3, texto y fechas intactos, fragmentación y Unicode. Duplicado, dueño falsificado y archivo inválido no escriben. Cuenta con solo OCR bloquea importación. Capturas ausentes del respaldo.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=XlsxImageTextsRoundTripTest,XlsxSpacesRoundTripTest,XlsxWorkbookReaderTest -Dit.test=PortabilityImageTextsApiIT,PortabilitySpacesApiIT,PortabilityImportServiceIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/portability` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-21. Frontera reviewer independiente en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, Java 21 y Node 24.21.0. [PR #79](https://github.com/MatiasNicolasAcevedo/devnotes/pull/79). Revisión de `43c2ae9d991a3b4b1425c8f047c964544143cbb9` contra `main@3318c1a05017e7faaea2294099274b8684a860c9` en un worktree aislado.

- `gh pr view 79 --repo MatiasNicolasAcevedo/devnotes`, `git fetch`, `git rev-parse` y `git log -1 --format=%H origin/codex/t-076-image-text-xlsx -- docs/STATUS.md` (0). PR abierto, listo y con `verify-required` exitoso en el [HEAD revisado](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/44964910829). GitHub no registró hilos de revisión. `git diff --exit-code 96c33340fb391444a26eb016cdf1119dfbddfa70 origin/codex/t-076-image-text-xlsx -- server client e2e docs/DEPLOYMENT.md` (0) ligó el gate del autor a esas fuentes.
- Cotejados la lectura v1/v2/v3, el manifiesto y el JSON estricto de v3, Unicode y fragmentación, los conteos por espacio, la propiedad derivada de sesión, el lock compartido y el rechazo de importación en cuenta con solo Imagen. El respaldo recupera texto y fecha con nuevos UUID v7 y excluye capturas y recibos. La UI de Datos muestra los conteos y la compatibilidad de restauración.
- Desde `server/`, `./mvnw -q verify -Dtest=XlsxImageTextsRoundTripTest,XlsxSpacesRoundTripTest,XlsxWorkbookReaderTest -Dit.test=PortabilityImageTextsApiIT,PortabilitySpacesApiIT,PortabilityImportServiceIT -Djacoco.skip=true` (0). Surefire 201/201 y Failsafe 29/29 con PostgreSQL 18.6 Testcontainers, sin fallos ni omitidos. Incluye negativos de formato, propiedad, duplicados y cuenta ocupada, y el ensayo de espera del lock antes del 409.
- Desde `client/`, `npm ci --no-audit --no-fund`, `npm test -- --run src/features/portability` y `npm run typecheck` (0, 90/90). E2E desktop dirigido del autor (4/4) acreditado por igualdad de fuentes.
- `node scripts/docs-check.mjs`, `git diff --check origin/main HEAD` y `bash scripts/verify.sh --policy origin/main` (0, perfil informativo APPLICATION / FULL). El primer intento de Git Bash en el sandbox falló con acceso denegado al objeto MSYS; la invocación con permisos de host pasó.

Pendiente verificar igualdad de fuentes, docs-check y CI del commit de transición antes de publicar el veredicto y ejecutar el squash ligado a su SHA. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit sigue vigente.

### Gate del implementer sobre las fuentes de T-076

2026-11-21. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, Java Corretto 21.0.9, Node 24.21.0 y Docker Desktop. [PR #79](https://github.com/MatiasNicolasAcevedo/devnotes/pull/79) contra `main@3318c1a05017e7faaea2294099274b8684a860c9`. Fuentes probadas en `96c33340fb391444a26eb016cdf1119dfbddfa70`. El HEAD de entrega es el commit documental de este checkpoint y el prompt de revisión en STATUS.

- Entrada (exit 0). `gh pr view 78 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName` confirmó MERGED contra main el 2026-11-21T23:44:54Z y el squash exigido. `gh pr list --repo MatiasNicolasAcevedo/devnotes --state open --json number,headRefName` devolvió cero PR abiertos. `git fetch origin main` y `git merge-base --is-ancestor 3318c1a05017e7faaea2294099274b8684a860c9 origin/main` confirmaron la base. El primer commit `273de02` concilió T-075 y dejó T-076 en `in_progress`.
- Cambia el respaldo, los conteos HTTP y la pantalla Datos. El libro v3 agrega `imagen_textos` después de las hojas v2, con texto y fecha, clave UUID y conteo en el manifiesto. Viajan ambos espacios de la cuenta. La restauración genera UUID v7 y usa la misma transacción y el lock de cuenta que usa el servicio de Imagen. Previsualizar mantiene la cuenta intacta. Solo un texto guardado en Personal basta para que se devuelva 409. Se preserva la lectura v1/v2 con cero textos de Imagen. La prueba de exportación preserva orden, Unicode y fechas, y comprueba propiedad, ausencia de capturas y de recibos restaurados. La UI muestra los conteos y la guía indica la compatibilidad necesaria.
- Backend desde `server/`. `./mvnw -q spotless:apply` (0). `./mvnw -q verify -Dtest=XlsxImageTextsRoundTripTest,XlsxSpacesRoundTripTest,XlsxWorkbookReaderTest -Dit.test=PortabilityImageTextsApiIT,PortabilitySpacesApiIT,PortabilityImportServiceIT -Djacoco.skip=true` (0). Surefire 201/201 y Failsafe 29/29 sobre PostgreSQL 18.6 con Testcontainers, sin fallos, errores ni omitidos. Incluye v2 a restauración real, libros incompatibles y exclusión concurrente confirmada con `pg_blocking_pids`.
- Regresiones de backend. `./mvnw -q verify -Dtest=XlsxWorkbookRoundTripTest,PortabilityExportServiceTest -Dit.test=PortabilityExportApiIT,PortabilityImportApiIT -Djacoco.skip=true` (0). Surefire 16/16; Failsafe 19/19.
- Cliente desde `client/`. `npm test -- --run src/features/portability` (0, 90/90) y `npm run typecheck` (0).
- E2E. `STARTER_E2E_PROJECT=starter-e2e-t076-v3 bash scripts/e2e.sh --grep "portability:|spaces: SP-08" --project desktop` (0, 4/4 sin fallos). Readiness, OIDC y API propia con PostgreSQL reales, con fixtures. Cleanup comprobado por los labels exactos de ambos proyectos E2E propios y por los IDs de contenedores de Testcontainers/Ryuk (consultas 0, sin recursos).
- `node scripts/docs-check.mjs`, `git diff --check origin/main HEAD` y `bash scripts/verify.sh --policy origin/main` (0). Perfil informativo `APPLICATION / FULL`. El reviewer debe cotejar `verify-required` del HEAD final contra la base publicada.

| Causa o evidencia | Ajuste | Comprobación |
|---|---|---|
| Primer E2E (exit 1). Las pruebas compilaban con la firma previa del escritor. | Actualizar las invocaciones y dobles de las pruebas de portabilidad. | Compilación y regresiones dirigidas en el candidato. |
| Primer `verify` backend (exit 1). Dos negativos del manifiesto intentaban mutar una fila inmutable del fixture. | Usar una fila mutable solo en el fixture de pruebas. | 13/13 casos de `XlsxImageTextsRoundTripTest`. |
| Segundo `verify` backend y segundo E2E (exit 1). El DTO HTTP omitía los conteos de Imagen que ya calculaba el servicio. | Mapear `imageTexts` en `ImportCounts`, también por espacio, y actualizar OpenAPI. | Backend, cliente y E2E dirigidos en las fuentes publicadas. |

FULL/STARTER: DIFERIDO POR EL DUEÑO.
