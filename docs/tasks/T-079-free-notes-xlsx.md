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

2026-11-22. Frontera implementer de corrección en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), con PowerShell, Git, gh, Git Bash y JDK 21. La corrección cambia dos literales de `XlsxSpacesRoundTripTest` y tiene impacto exclusivamente en pruebas. Base `main@311e47c1ca6d64f81c3bc1950ec6687a3d418ea7`, commit probado `63b4f5d032b4b07608cfb19aec9cb493ce3c1a9b`. El commit documental que contiene este checkpoint identifica el candidato completo con `git log -1 --format=%H -- docs/STATUS.md` en el checkout del PR.

- Entrada. `gh pr view 82 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,comments,statusCheckRollup` (exit 0 fuera del sandbox) confirmó OPEN, listo, base indicada y HEAD local/remoto `d512a75657f583e22b98c4682bac11f0988fef56`, que registra los [hallazgos de ronda 1](https://github.com/MatiasNicolasAcevedo/devnotes/pull/82#issuecomment-7073445543). `git merge-base --is-ancestor 0b9c4f4b425d244957c4c3f2687152c2cb4d5f9b d512a75657f583e22b98c4682bac11f0988fef56` dio exit 0. Se preservó `trailer/`, preexistente y sin seguimiento.
- Backend repetido desde `server/`. `./mvnw -q test -Dtest=XlsxSpacesRoundTripTest,XlsxWorkbookRoundTripTest,PortabilityExportServiceTest -Djacoco.skip=true` reprodujo 66 pruebas y dos fallos en el HEAD de entrada (exit 1). Con la corrección dio exit 0 y 66 verdes: 50 de espacios, 12 de libro y 4 de exportación, sin fallos, errores ni omisiones. Git Bash requirió ejecución fuera del sandbox tras `NtCreateDirectoryObject` (`0xC0000022`).
- Evidencia conservada de la ronda 1 sobre `0b9c4f4b425d244957c4c3f2687152c2cb4d5f9b` y la misma base. `git diff --exit-code 0b9c4f4b425d244957c4c3f2687152c2cb4d5f9b HEAD -- . ':(exclude)docs/**' ':(exclude)server/src/test/java/com/example/devnotes/portability/xlsx/XlsxSpacesRoundTripTest.java'` dio exit 0. Las fuentes de producción, la configuración y los insumos de los demás ensayos quedan cubiertos por ese cotejo. La única prueba modificada pasó en la corrida nueva.
  - Backend original (exit 0). `./mvnw -q verify -Dtest=XlsxFreeNotesRoundTripTest,XlsxImageTextsRoundTripTest,XlsxWorkbookReaderTest -Dit.test=PortabilityFreeNotesApiIT,PortabilityImageTextsApiIT,PortabilityImportServiceIT -Djacoco.skip=true` pasó 165 Surefire y 30 Failsafe con PostgreSQL 18.6. `./mvnw -q verify -Dtest=XlsxWorkbookRoundTripTest -Dit.test=PortabilityExportApiIT,PortabilityImportApiIT,PortabilitySpacesApiIT -Djacoco.skip=true` pasó las 23 IT adicionales. `XlsxWorkbookRoundTripTest` también corrió en la corrección.
  - Cliente (exit 0). `npm test -- --run src/features/portability` pasó 92 pruebas y `npm run typecheck` completó el typecheck.
  - E2E (exit 0). `STARTER_E2E_PROJECT=starter-e2e-t079-review-codex bash scripts/e2e.sh --grep 'portability:' --project desktop` pasó 1/1 con API, PostgreSQL y OIDC del stack. La consulta por etiqueta exacta encontró cero contenedores, volúmenes y redes al finalizar.
- Gate de cierre. `node scripts/docs-check.mjs` dio exit 0 en un worktree aislado del candidato. En el checkout local dio exit 1 por `trailer/CLAUDE.md`, ajeno al PR. `git diff --check` y `git diff --check 311e47c1ca6d64f81c3bc1950ec6687a3d418ea7 HEAD` dieron exit 0. `bash scripts/verify.sh --policy origin/main` dio exit 0 y perfil APPLICATION / FULL informativo. La CI `verify-required` del candidato se comprueba con `gh pr view 82 --repo MatiasNicolasAcevedo/devnotes --json headRefOid,baseRefOid,statusCheckRollup`.

| Hallazgo | Corrección en `63b4f5d` | Cierre verificado |
|---|---|---|
| `writerPreservesTheVersionTwoLayoutOfExistingSheets` esperaba manifiesto v3. | Exige v4. | Pasa con las aserciones de cabeceras, claves, espacios, datos y conteos del layout v2 intactas. |
| `unknownVersionIsUnsupported` usaba v4, versión conocida, sobre un libro v2. | Usa v5 y conserva `0`, `2.0`, `02` y `v2`. | Las cinco variantes devuelven `IMPORT_UNSUPPORTED_FORMAT` sin hoja ni fila. Los negativos de esquema inválido siguen cubiertos, incluidos los de v4 en `XlsxFreeNotesRoundTripTest`. |

Pendiente: ronda 2 en una sesión reviewer independiente. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.
