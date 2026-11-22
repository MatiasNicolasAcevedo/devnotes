---
id: T-079
status: changes_requested
priority: P1
size: M
milestone: M7
spec: S-113
depends_on: [T-078]
branch: codex/t-079-free-notes-xlsx
role: implementer
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

2026-11-22. Ronda 1 de frontera reviewer independiente en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), con PowerShell, Git, gh, Git Bash, JDK 21, npm y Docker Desktop. **Cambios requeridos** en [PR #82](https://github.com/MatiasNicolasAcevedo/devnotes/pull/82), HEAD revisado `0b9c4f4b425d244957c4c3f2687152c2cb4d5f9b`, base `main@311e47c1ca6d64f81c3bc1950ec6687a3d418ea7`. La transición de esta ronda es documental.

- Entrada. `gh pr view 82 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` (exit 0 fuera del sandbox) confirmó OPEN, listo y [verify-required SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/44979047330/job/137075292996) para ese HEAD. En worktree aislado, `git rev-parse HEAD^` devolvió `23e3d6b1a1ae5e2fa5c7c14e2347ea137e7649c4`, y `git diff --exit-code 23e3d6b1a1ae5e2fa5c7c14e2347ea137e7649c4 HEAD -- server client e2e` (exit 0) acreditó igualdad con las fuentes probadas por el implementer.
- Impacto revisado. XLSX v4 agrega Libres con UUID v7 nuevos y revisión 1. v1 a Trabajo, v2 conserva espacios, v3 conserva Imagen, y los tres informan cero Libres. El documento usa el validador de almacenamiento. Preview e importación suman Libres en total, Trabajo y Personal. El lock de cuenta cubre el chequeo de cuenta vacía tras una creación concurrente. El documento inválido se rechaza antes de escribir y el fallo inyectado tras el lote de Libres revierte todas las colecciones. La transición de revisión solo cambia documentación.
- Backend dirigido de esta tarea desde `server/`, exit 0. `./mvnw -q verify -Dtest=XlsxFreeNotesRoundTripTest,XlsxImageTextsRoundTripTest,XlsxWorkbookReaderTest -Dit.test=PortabilityFreeNotesApiIT,PortabilityImageTextsApiIT,PortabilityImportServiceIT -Djacoco.skip=true`. Surefire 165 y Failsafe 30 con PostgreSQL 18.6, cero fallos, errores u omitidos.
- Backend adicional desde `server/`, exit 1. `./mvnw -q test -Dtest=XlsxSpacesRoundTripTest,XlsxWorkbookRoundTripTest,PortabilityExportServiceTest -Djacoco.skip=true` ejecutó 66, con dos fallos de aserción y sin errores u omisiones. Ver lista cerrada.
- Integraciones adicionales, exit 0. `./mvnw -q verify -Dtest=XlsxWorkbookRoundTripTest -Dit.test=PortabilityExportApiIT,PortabilityImportApiIT,PortabilitySpacesApiIT -Djacoco.skip=true` ejecutó 23 IT con PostgreSQL 18.6, sin fallos, errores ni omisiones.
- Cliente desde `client/`, exit 0. `npm ci --no-audit --no-fund`, `npm test -- --run src/features/portability` (92 en dos archivos) y `npm run typecheck`.
- E2E desde raíz, exit 0. `STARTER_E2E_PROJECT=starter-e2e-t079-review-codex bash scripts/e2e.sh --grep 'portability:' --project desktop` pasó 1/1 contra API, PostgreSQL y OIDC del stack. Cero contenedores, volúmenes y redes tras consultar la etiqueta exacta.
- Documentación, exit 0. `node scripts/docs-check.mjs`, `git diff --check 311e47c1ca6d64f81c3bc1950ec6687a3d418ea7 HEAD` y `bash scripts/verify.sh --policy origin/main` (APPLICATION / FULL informativo).

| Hallazgo | Corrección suficiente | Cierre observable |
|---|---|---|
| `XlsxSpacesRoundTripTest.java:105`, `writerPreservesTheVersionTwoLayoutOfExistingSheets`: esperaba manifiesto v3, recibió v4. | Exigir v4 y conservar el resto de las aserciones de compatibilidad con el layout v2. | La prueba pasa y sigue comprobando las cabeceras, claves, espacios, datos y conteos existentes. |
| `XlsxSpacesRoundTripTest.java:441`, `unknownVersionIsUnsupported`: v4 en un libro con esquema v2 produjo `IMPORT_INVALID_RECORD`, como corresponde a una versión conocida con esquema inválido. | Usar v5 como versión futura. Conservar las otras variantes y la cobertura de esquemas inválidos. | Las cinco variantes pasan con `IMPORT_UNSUPPORTED_FORMAT` y sin hoja ni fila. |

Pendiente: sesión implementer de corrección en el mismo PR y segunda revisión sobre el HEAD corregido. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.
