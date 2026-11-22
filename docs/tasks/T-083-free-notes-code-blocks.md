---
id: T-083
status: mergeable
priority: P1
size: S
milestone: M7
spec: S-114
depends_on: [T-082]
branch: codex/t-083-free-notes-code-blocks
role: implementer
executor: frontier
pr: 86
---

# T-083 · Bloques de código discretos para Libres

## Objetivo

Bloques de código discretos para Libres con el recorrido observable descrito en la aceptación.

## Alcance

Agregar Bloque de código bajo Herramientas, tres lenguajes, resaltado JSON/SQL y copia. Ampliar validación y fixtures. Mantener las versiones del repo cuando se pueda reutilizar. [Contrato S-114](../specs/S-114-writing-editor.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Cambiar lenguaje y copiar conserva sangría/saltos. Salir y deshacer vuelve al punto esperado. Texto inválido se muestra sin transformación. Rechazo de lenguaje ajeno. Scroll horizontal se limita al bloque. Recarga y restauración preservan lenguaje y texto.

- Desde `server/` con Git Bash y JDK 21. `./mvnw -q test -Dtest=FreeNoteDocumentTest,XlsxFreeNotesRoundTripTest`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/free-notes` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t083-desktop bash scripts/e2e.sh --grep 'free-notes: code blocks' --project desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t083-mobile bash scripts/e2e.sh --grep 'free-notes: code blocks' --project mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Frontera reviewer independiente en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24.21.0, JDK 21 y Docker Desktop. [PR #86](https://github.com/MatiasNicolasAcevedo/devnotes/pull/86), base `main@1b6ee91b2c5276e170da00aa0204d222892096c0`, fuentes probadas `31b2d2ff3261858416f172c4ae724c8ac9bf19b9` y entrega revisada `8db53604ddab54380957bc38a2d4c3b9ab47c7a2`. Alcance conforme a S-114. Pendiente: comprobar la CI del commit documental de transición, publicar el veredicto sobre ese SHA y confirmar el squash en GitHub.

- Identidad del diff. `gh pr view 86 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup`, `git fetch origin main codex/t-083-free-notes-code-blocks` y `git ls-remote origin refs/heads/main refs/heads/codex/t-083-free-notes-code-blocks` (exit 0). PR abierto, listo para revisión y HEAD/base coincidentes. `gh run view 45045872070 --repo MatiasNicolasAcevedo/devnotes --json headSha,conclusion` (exit 0) confirmó el check exitoso ligado a `8db5360`, posterior al cancelado. Cero conversaciones en la consulta de revisión. `git rev-parse HEAD^` y `git diff --name-status 31b2d2f..8db5360` (exit 0) confirmaron que la entrega es hija directa y que cambia solo esta tarea y STATUS.
- Comportamiento revisado. Herramientas cambia JSON, SQL y TXT sin alterar el texto. Las decoraciones léxicas quedan fuera del documento guardado. Copia exacta, salida con deshacer y scroll dentro de la tarjeta. El validador de Libres acepta solo lenguajes permitidos y texto sin marcas, conserva los límites existentes y se reutiliza en XLSX v4. Las listas mantienen sus acciones e historial. El diario mantiene su esquema. Persistencia JSONB y autorización por propietario conservadas.
- Backend independiente, sobre checkout aislado. `./mvnw -q test -Dtest=FreeNoteDocumentTest,XlsxFreeNotesRoundTripTest` (exit 0), 34/34 en documento y 17/17 en XLSX. Rechazo de nodos/atributos ajenos y diario, texto intacto y restauración exacta v4. Compilación y Surefire.
- Cliente independiente. `npm test -- --run src/features/free-notes src/features/daily/editor/DailyEditor.test.tsx` (44/44, exit 0) y `npm run typecheck` (exit 0).
- E2E independiente. `STARTER_E2E_PROJECT=starter-e2e-t083-review-8db5360 bash scripts/e2e.sh --grep 'free-notes: (code blocks|lists)' --project desktop` (2/2, exit 0). API y PostgreSQL reales, OIDC ficticio. La prueba de código comprueba clipboard real, deshacer con posición exacta, scroll a 768 px, guardado/recarga, rechazo API y restauración en una segunda identidad ficticia. La prueba de listas cubre edición, clipboard y restauración. Cleanup verificado por label exacto, cero contenedores, redes y volúmenes. Se conserva también el E2E móvil del implementer (1/1 a 320 px sobre `31b2d2f`, exit 0).
- Documentación. `node scripts/docs-check.mjs`, `git diff --check 1b6ee91..HEAD` y `bash scripts/verify.sh --policy origin/main` (exit 0 en el checkout aislado, perfil APPLICATION / FULL informativo). Git Bash requirió acceso fuera del sandbox tras error de sesión MSYS `0xC0000022` en el primer intento de clasificación. **FULL/STARTER: DIFERIDO POR EL DUEÑO**. Render Auto-Deploy On Commit.

### Evidencia de implementación conservada

El implementer registró como verdes sobre `31b2d2f` las mismas suites de backend y cliente, typecheck, Prettier/ESLint dirigidos y los E2E de código desktop y mobile (1/1 por proyecto), con cero recursos al cerrar por label exacto. El commit técnico tuvo [verify-required exitoso](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/45045452143). La conciliación previa de T-082 quedó registrada en `1635c89`.

| Causa | Arreglo | Prueba |
|---|---|---|
| El runner rechaza `--project=desktop` (exit 2). | Usar `--project desktop` y `--project mobile`, como indica la ayuda del script. | Los dos E2E finales usan esa sintaxis. |
| La primera corrida desktop (exit 1) usaba Ctrl+Inicio para colocar el cursor dentro del código. Chromium colocó el ancla en el contenedor exterior. | Colocar el cursor con un clic en una palabra del bloque y medir su desplazamiento antes y después de deshacer. | Los E2E finales prueban el desplazamiento exacto tanto al crear un párrafo como al reutilizarlo. |
| ESLint detectó la vista React en el módulo que exportaba la extensión (exit 1). | Separar la vista y la extensión, y reutilizar el límite de historial de las listas. | Prettier, ESLint, Vitest, typecheck y E2E sobre `31b2d2f`. |
