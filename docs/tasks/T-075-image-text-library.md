---
id: T-075
status: in_review
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-074]
branch: codex/t-075-image-text-library
role: implementer
executor: frontier
pr: 78
---

# T-075 · Persistencia privada para los textos de Imagen

## Objetivo

Guardar, consultar y eliminar texto editado en un servicio privado de Imagen. El flujo visible llega en T-077, después de agregar respaldo en T-076.

## Alcance

El patrón de Voz guía listado y borrado. Implementar migración, repositorio y servicio en PostgreSQL 18.6 con los límites, recibos de creación y criterios de S-112. La imagen y nombre de archivo quedan fuera de la entidad. Compartir el lock de cuenta con importación. Mantener el servicio interno hasta que exista recuperación por XLSX. [S-112](../specs/S-112-screenshot-ocr.md#biblioteca-de-imagen) · [Voz](../specs/S-105-voice-notes.md).

## Aceptación y pruebas

- Migración sobre base poblada conserva datos previos. Crear copia de texto editado, consultar en orden descendente, borrar uno de dos y repetir operación tras respuesta perdida. Otro espacio y otro propietario reciben respuesta equivalente a ausente. Cuerpo vacío/excesivo y UUID inválidos no mutan datos. El servicio no se conecta a OCR.space.
- Desde `server/` con Git Bash y JDK 21, `./mvnw -q verify -Dtest=ImageTextServiceTest -Dit.test=ImageTextServiceIT,ImageTextMigrationIT -Djacoco.skip=true` con PostgreSQL Testcontainers. Registrar exit, cantidades y limpieza. La selección de casos no acredita cobertura global.
- [Gate dirigido](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16).

## Checkpoint vigente

2026-11-21. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, Corretto 21.0.9, Node 24.21.0 y Docker Desktop 28.5.1. Los commits usan la identidad Git configurada `Junie`. [PR #78](https://github.com/MatiasNicolasAcevedo/devnotes/pull/78) contra `main@da04b23f2c3bba0c45f29dfd8c51f2b6b0c1da92`. Fuentes probadas en `94651c83eef81c886ec6e7f811ab45d1761e797c`.

- Entrada (exit 0). `gh pr view 77 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName` confirmó el squash de T-074 contra `main`. `git fetch origin main`, `git merge-base --is-ancestor da04b23f2c3bba0c45f29dfd8c51f2b6b0c1da92 origin/main` y `gh pr list --repo MatiasNicolasAcevedo/devnotes --state open --json number,headRefName` confirmaron la base y cero PR abiertos. El primer commit `680443c5ec73952e95708e770769a0144d5b37f1` concilió T-074 y pasó T-075 a `in_progress`.
- V8 agrega el texto editado y recibos de creación con hash SHA-256, ID y fecha del resultado, y vencimiento a 24 h. El intento y el listado se acotan por cuenta y espacio. Los recibos vencidos de la cuenta se retiran al crear. Crear y borrar usan el mismo lock transaccional de cuenta que la importación. El servicio interno preserva Unicode y saltos, devuelve páginas de 20 en orden creado/ID descendente y conserva el resultado de un intento tras borrar la copia. API HTTP, UI y formato XLSX permanecen vigentes. [T-076](T-076-image-text-xlsx.md) agrega respaldo y [T-077](T-077-image-text-library-ui.md) habilita el recorrido visible.
- Desde `server/`: `./mvnw -q spotless:apply` (0) y `./mvnw -q verify -Dtest=ImageTextServiceTest -Dit.test=ImageTextServiceIT,ImageTextMigrationIT -Djacoco.skip=true` (0). Surefire 12/12. Failsafe 7/7 sobre `postgres:18.6` de Testcontainers, seis casos de servicio y un upgrade de V7 poblada a V8. La exclusión con XLSX se observó con `pg_blocking_pids`; dos llamadas con el mismo intento obtuvieron una sola copia. Los casos comprueban además rollback, vencimiento, negativos de propietario/espacio y cursor tras borrar su fila.
- Cleanup por label `org.testcontainers.sessionId=7a681803-8052-4f79-ac93-484c5cc7d9fc` y por ID del Ryuk de esa corrida. Las consultas Docker (0) devolvieron cero contenedores, redes y volúmenes de la sesión y ausencia de Ryuk.
- `node scripts/docs-check.mjs`, `git diff --check origin/main HEAD` y `bash scripts/verify.sh --policy origin/main` (0). Clasificación informativa `APPLICATION / FULL`. El HEAD de entrega es el commit documental que contiene este checkpoint y el prompt de revisión en STATUS. La revisión debe cotejar su CI con el HEAD y la base del PR.

| Causa o evidencia | Ajuste | Comprobación |
|---|---|---|
| Primer `verify` (exit 1). El caso de migración intentaba ordenar la tabla de recibos por una columna `id` inexistente. | Comprobar que la tabla nueva está vacía con `count(*)`. | `verify` dirigido (0), upgrade poblado y negativos de constraints en `94651c83`. |
| GitHub y MSYS fallaron en el sandbox heredado. | Consultar GitHub y usar la ruta explícita de Git Bash desde la superficie escalada. | Precondiciones y sonda de Java/Node/Docker (0). |

Pendiente revisión independiente del PR #78. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit sigue vigente.
