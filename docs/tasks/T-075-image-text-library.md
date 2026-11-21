---
id: T-075
status: in_progress
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-074]
branch: codex/t-075-image-text-library
role: implementer
executor: frontier
pr: null
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

2026-11-21. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell y Git/gh. Base `da04b23f2c3bba0c45f29dfd8c51f2b6b0c1da92`. El squash de T-074 se confirmó en GitHub y es ancestro de origin/main. `gh pr list --repo MatiasNicolasAcevedo/devnotes --state open --json number,headRefName` (0) devolvió cero PR abiertos. Pendientes: persistencia y gate diario. [T-076](T-076-image-text-xlsx.md) agrega respaldo y [T-077](T-077-image-text-library-ui.md) habilita el recorrido visible con API.
