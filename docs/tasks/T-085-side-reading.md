---
id: T-085
status: in_review
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

2026-11-22. Frontera implementer en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24.21.0 y Docker Desktop. [PR #88](https://github.com/MatiasNicolasAcevedo/devnotes/pull/88), rama `codex/t-085-side-reading`. Base `main@b1db344cca716bdde10bd61cbb6855cd34c76737`. HEAD técnico `b14145fc884b9827613d49397c5345e09fe4084e`. El HEAD entregado a revisión añade únicamente este checkpoint y STATUS sobre ese padre. La revisión independiente queda pendiente.

- Conciliación. `gh pr view 87 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` (exit 0) confirmó MERGED a las 20:06:14Z del 2026-11-22. `git fetch origin main` y `git merge-base --is-ancestor b1db344cca716bdde10bd61cbb6855cd34c76737 origin/main` (exit 0). T-084 quedó `done` en el primer commit `48bd400`.
- Comportamiento y UI. Diario y Libres abren versiones manuales y notas libres de solo lectura desde Herramientas. El ancho útil de 1.100 px habilita el 60/40 con scroll independiente. El editor conserva su borrador, posición de lectura y selección. `Ver consulta` usa los destinos existentes con sus guardias de navegación. El foco va al encabezado al elegir y regresa al editor o a Herramientas mediante los controles del panel.
- API, permisos y datos. Las consultas reutilizan listas y detalles privados con claves por cuenta y espacio y señal de aborto. El cambio de alcance descarta la selección. Un 404 ofrece elegir otra fuente y el selector actualiza la lista. Se conservan los contratos de API, autorización y almacenamiento.
- Cliente. `npm test -- --run src/features/daily/DailyNotesPage.test.tsx src/features/free-notes src/features/side-reading` (51/51, exit 0), `npm test -- --run src/features/daily/DailyNotesToolbar.test.tsx` (19/19, exit 0), `npm run typecheck` y `npm run lint` (exit 0).
- E2E. `STARTER_E2E_PROJECT=starter-e2e-t085-desktop bash scripts/e2e.sh --grep 'side reading:' --project desktop` y `STARTER_E2E_PROJECT=starter-e2e-t085-mobile bash scripts/e2e.sh --grep 'side reading:' --project mobile` (3/3 cada uno, exit 0). API y PostgreSQL reales, dos sesiones reales con OIDC ficticio. Los casos cubren foco y selección de teclado, 60/40 por ancho interno, anclaje del scroll, borrador y confirmación de salida, reemplazo tras 404 y aislamiento por espacio y cuenta.
- Limpieza. Se verificaron `docker ps -aq`, `docker network ls -q` y `docker volume ls -q` con `--filter label=com.docker.compose.project=<namespace>` para cada proyecto E2E. Los tres tipos dieron cero tras cada corrida. Los JUnit saneados quedaron en `e2e/artifacts/<namespace>/sanitized/junit.xml`.
- Control documental. `node scripts/docs-check.mjs` desde un archivo del árbol versionado y `git diff --check origin/main...HEAD` (exit 0). `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL informativo). **FULL/STARTER: DIFERIDO POR EL DUEÑO**.
- CI. Ligada al HEAD de entrega y a la base indicada mediante `gh pr view 88 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup`. [Check verify-required del PR #88](https://github.com/MatiasNicolasAcevedo/devnotes/pull/88/checks). Render conserva Auto-Deploy On Commit para `main`.

| Causa | Arreglo | Prueba |
|---|---|---|
| Escape podía devolver el foco antes de que terminara el cierre de Herramientas. El selector podía seguir mostrando la lista cacheada tras un 404. | Se devuelve el foco tras el cierre y se revalida la lista al abrir el selector. | Suite de barra de Diario y E2E de fuente borrada (exit 0). |
| El reflujo móvil cambia el alto de la barra y el mismo renglón visible queda en otro desplazamiento absoluto. | El E2E del reflujo comprueba el mismo renglón visible y el cierre a ancho amplio conserva el desplazamiento. | E2E mobile (exit 0). |
| Espacio y segunda cuenta en un mismo caso excedieron el deadline. El fixture de cambio de identidad reiniciaba OIDC y servidor en medio del segundo login. | Se prueban ambos límites en casos separados y se usa el flujo interactivo existente con proveedor estable para las dos cuentas. | E2E desktop y mobile (exit 0), con los deadlines originales. |
| El checkout tenía `trailer/` sin versionar. La CI del commit técnico aún leía STATUS apuntando a T-084. | Se conservó el directorio local, se comprobó el árbol versionado aislado y se publicó la transición de STATUS a T-085. | docs-check del árbol de entrega y CI ligada a ese HEAD. |
