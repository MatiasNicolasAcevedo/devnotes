---
id: T-079
status: mergeable
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

2026-11-22. Frontera reviewer independiente, ronda 2 del PR #82, en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), con PowerShell, Git/gh, Git Bash y JDK 21. Candidato técnico `c8b039f07d9c9d1fe63dffa62aa9ac6f12f97ba9`, padre `63b4f5d032b4b07608cfb19aec9cb493ce3c1a9b`, base `main@311e47c1ca6d64f81c3bc1950ec6687a3d418ea7`. El candidato coincide con el último commit de `docs/STATUS.md` antes de esta transición. El producto incorpora respaldo de Libres y conteos totales y por espacio en la API y la UI. Conserva autorización por propietario y transacción con lock de cuenta. La corrección de ronda 2 afecta dos literales de prueba y esta transición afecta solo documentación.
- Entrada. `gh pr view 82 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` (exit 0 fuera del sandbox) confirmó OPEN, listo, HEAD/base esperados y `verify-required` SUCCESS. GraphQL devolvió cero conversaciones de revisión. Se revisó en worktree aislado para preservar `trailer/` del checkout del dueño.
- Repetición desde `server/`. `./mvnw -q test -Dtest=XlsxSpacesRoundTripTest,XlsxWorkbookRoundTripTest,PortabilityExportServiceTest -Djacoco.skip=true` (exit 0) pasó las 66 pruebas (50 + 12 + 4). `./mvnw -q test -Dtest=XlsxFreeNotesRoundTripTest,XlsxImageTextsRoundTripTest,XlsxWorkbookReaderTest -Djacoco.skip=true` (exit 0) pasó 165 (14 + 13 + 138). Los reportes Surefire no registran fallos, errores ni omisiones.
- Igualdad de insumos. `git diff --exit-code 0b9c4f4b425d244957c4c3f2687152c2cb4d5f9b HEAD -- . ':(exclude)docs/**' ':(exclude)server/src/test/java/com/example/devnotes/portability/xlsx/XlsxSpacesRoundTripTest.java'` (exit 0 sobre el candidato técnico) acredita las mismas fuentes y configuración para el resto del gate con la misma base. Evidencia dirigida de [ronda 1](https://github.com/MatiasNicolasAcevedo/devnotes/pull/82#issuecomment-7073445543) y del checkpoint previo: 30 Failsafe con PostgreSQL 18.6, 23 IT adicionales de exportación, importación y espacios, 92 de cliente más typecheck y Playwright de portabilidad desktop 1/1 con API/DB/OIDC propios y limpieza por etiqueta exacta.
- Cierre técnico. `node scripts/docs-check.mjs` y `git diff --check 311e47c1ca6d64f81c3bc1950ec6687a3d418ea7 HEAD` (exit 0) en el checkout limpio. `bash scripts/verify.sh --policy origin/main` (exit 0) informó APPLICATION / FULL. FULL/STARTER: DIFERIDO POR EL DUEÑO.

| Hallazgo de ronda 1 | Corrección en `63b4f5d` | Verificación independiente |
|---|---|---|
| El writer esperaba manifiesto v3. | Exige v4. | Pasó con todas las aserciones previas de cabeceras, conteos, claves, datos y espacios del layout v2. |
| El negativo de versión futura usaba v4, que ya se reconoce. | Usa v5 y conserva `0`, `2.0`, `02` y `v2`. | Las cinco variantes pasaron con `IMPORT_UNSUPPORTED_FORMAT`, sin hoja ni fila. Los negativos de versiones conocidas con esquema inválido pasaron, incluidos los de v4. |

Pendiente al publicar esta transición: verificar `verify-required` del nuevo HEAD documental, publicar el veredicto ligado a HEAD/base, hacer squash condicionado al SHA y confirmar `MERGED` con fecha y SHA. Render Auto-Deploy On Commit.
