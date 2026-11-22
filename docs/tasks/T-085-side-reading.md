---
id: T-085
status: mergeable
priority: P1
size: M
milestone: M7
spec: S-115
depends_on: [T-084]
branch: codex/t-085-side-reading
role: implementer
executor: frontier
pr: 88
---

# T-085 · Leer una nota al lado mientras se escribe

## Objetivo

Leer una nota al lado mientras se escribe con el recorrido observable descrito en la aceptación.

## Alcance

Reusar consultas y lectura de Diario guardado y Libres. Añadir selector, layout 60/40 y flujo angosto. Verificar el ancho interno y foco de retorno. [Contrato S-115](../specs/S-115-side-reading.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Editor, scroll y borrador se conservan al cerrar/estrechar. Selector y panel no cruzan cuentas/espacios. Fuente borrada propone cambiarla. E2E cambia ancho y recupera la consulta con teclado.

- Desde `client/`. `npm test -- --run src/features/daily/DailyNotesPage.test.tsx src/features/free-notes src/features/side-reading` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t085-desktop bash scripts/e2e.sh --grep 'side reading:' --project desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t085-mobile bash scripts/e2e.sh --grep 'side reading:' --project mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Frontera reviewer independiente en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24.21.0 y Docker Desktop 28.5.1. [PR #88](https://github.com/MatiasNicolasAcevedo/devnotes/pull/88). Checkout aislado de `f129af592e5a5d7c6a743fc3b90c263db850dd94` contra `main@b1db344cca716bdde10bd61cbb6855cd34c76737`. Veredicto técnico conforme a S-115, sin cambios requeridos. Pendiente al publicar esta transición: comprobar la CI sobre su SHA, registrar el veredicto y confirmar el squash en GitHub.

- Identidad del diff. `gh pr view 88 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` y `git fetch origin main codex/t-085-side-reading` (exit 0). HEAD y base coinciden con las refs de origin; `git rev-parse HEAD^` dio `b14145fc884b9827613d49397c5345e09fe4084e`. `git diff --name-only HEAD^ HEAD` dio solo STATUS y T-085. `gh run view 45068909408 --repo MatiasNicolasAcevedo/devnotes --json headSha,event,status,conclusion` (exit 0) confirmó `verify-required` verde ligado al HEAD inicial en un evento `pull_request`. La consulta GraphQL devolvió cero hilos de revisión.
- Comportamiento y UI. El ancho interno gobierna el umbral de 1.100 px y las columnas 60/40 con mínimos de 440 y 320 px. El selector separa versiones manuales y notas libres. Los lectores reutilizan los formatos de origen en solo lectura y permiten copiar. Foco, selección, scroll y borrador se conservan en los recorridos probados. Al estrechar, Ver consulta usa la navegación existente con guardia de cambios. Al ampliar, el lector reaparece y ofrece cambiar la fuente ante un 404.
- API, permisos y datos. Las lecturas reutilizan rutas privadas, señales de aborto y claves por cuenta y espacio. El cambio de identidad o espacio descarta la selección. Los negativos con dos cuentas y dos espacios pasaron contra la API y PostgreSQL reales. La revisión solo cambia documentación.
- Cliente. `npm test -- --run src/features/daily/DailyNotesPage.test.tsx src/features/free-notes src/features/side-reading` (51/51, exit 0); repetición con `src/features/daily/DailyNotesToolbar.test.tsx` agregado (70/70, exit 0); `npm test -- --run src/features/daily/DailyHistoryPage.test.tsx src/features/daily/ReferencePreview.test.tsx` (20/20, exit 0); `npm run typecheck` (exit 0).
- E2E. `STARTER_E2E_PROJECT=starter-e2e-t085-review-f129af5-desktop bash scripts/e2e.sh --grep 'side reading:' --project desktop` y `STARTER_E2E_PROJECT=starter-e2e-t085-review-f129af5-mobile bash scripts/e2e.sh --grep 'side reading:' --project mobile` (3/3 por proyecto, exit 0). Antes y después, `docker ps -aq`, `docker network ls -q` y `docker volume ls -q` por label exacto `com.docker.compose.project` dieron cero en ambos proyectos.
- Documentos y perfil. `node scripts/docs-check.mjs`, `git diff --check origin/main...HEAD` y `bash scripts/verify.sh --policy origin/main` (exit 0; APPLICATION / FULL informativo). **FULL/STARTER: DIFERIDO POR EL DUEÑO**. Render conserva Auto-Deploy On Commit.

| Causa | Arreglo | Prueba |
|---|---|---|
| El sandbox restringía la red de GitHub, MSYS y el pipe Docker Desktop. | Se usaron gh y Git Bash explícito en la superficie autorizada, con Node 24 en el PATH de los procesos E2E. | Consulta exacta del PR, perfil informativo y E2E filtrado de ambos proyectos (exit 0). |
