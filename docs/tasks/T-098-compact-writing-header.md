---
id: T-098
status: in_progress
priority: P1
size: S
milestone: post-M9
spec: S-117
depends_on: [T-097]
branch: codex/t-098-compact-writing-header
role: implementer
executor: frontier
pr: null
---

# T-098 · Recuperar alto de escritura en ventana chica

## Objetivo

En Diario y Libres, leer y escribir más líneas al usar DevNotes con mouse o trackpad en una ventana angosta. [Contrato S-117](../specs/S-117-compact-writing-header.md).

## Alcance

1. Registrar las medidas base de barra y área útil en Diario y Libres a 640×480 CSS px. Agregar el caso E2E con la expectativa de altura y comprobar que falla en la base.
2. Resolver la densidad en `client/src/app/AppShell.tsx` y aplicarla al selector, Demo, Cuenta e IA con tamaños locales del shell. Usar una única fuente para la altura de cabecera y el cálculo que consume Libres. Mantener el editor montado al cambiar el ancho.
3. Verificar geometría, teclado y foco en los anchos de S-117, incluido el caso IA disponible con los fixtures existentes. Cambiar las expectativas de altura del selector en `system.spec.ts` y `spaces.spec.ts` solo para el caso nuevo y conservar intactos los mínimos de las demás condiciones. Conservar las comprobaciones existentes de navegación, contraste, guardado y reflujo.

### Leer antes

- [S-117](../specs/S-117-compact-writing-header.md) y [AppShell](../../client/src/app/AppShell.tsx), en particular la altura del encabezado y las variables de alto del área de escritura.
- [T-081](T-081-compact-daily-notes.md#evidencia-de-corrección-de-altura) para el cálculo del espacio real en el Diario.
- [T-064 en system.spec.ts](../../e2e/tests/system.spec.ts) y [SP-06 en spaces.spec.ts](../../e2e/tests/spaces.spec.ts) para las regresiones de layout y selector.

## Aceptación y pruebas

- AC-01 y AC-02. Agregar en `e2e/tests/editor-ergonomics.spec.ts` un caso con prefijo `compact writing header:`. Registrar las dos alturas antes y después a igual estado y viewport y adjuntar capturas saneadas del stack propio a 640×480. Conservar aserciones de fondo de editor y pie, foco y posición del cursor. Usar sesión ficticia, API y PostgreSQL reales.
- AC-03. Ejecutar los casos existentes de navegación con el proyecto táctil y conservar sus mínimos. Cubrir el híbrido con una prueba de cliente que simule las capacidades de entrada si Chromium no permite reproducir ambas en un mismo contexto. Comprobar también que las rutas fuera de Diario y Libres conservan su densidad.
- En `client/`: `npm test -- --run src/app/AppShell.test.tsx src/features/spaces/SpaceSelector.test.tsx` y `npm run typecheck`. Añadir la cobertura de activación y exclusión de la densidad al test existente del shell.
- En raíz, Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t098-desktop bash scripts/e2e.sh --grep 'compact writing header:|T-064:|SP-06/SP-07|CA-01:|ai workspace: navbar' --project desktop`.
- En raíz, Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t098-mobile bash scripts/e2e.sh --grep 'T-064:|SP-06/SP-07|CA-01:' --project mobile`. Este filtro comprueba específicamente los objetivos táctiles y el editor dentro del espacio disponible.
- Completar [gate diario](../TESTING.md): `node scripts/docs-check.mjs`, `git diff --check origin/main...HEAD` y `verify-required` del HEAD publicado. Acreditar limpieza por label exacto de cada namespace. FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

2026-11-23. Frontera implementer en Codex Desktop con GPT-6, variante y esfuerzo sin dato expuesto. PowerShell, Git Bash, gh, Node 24.21.0 y Docker Desktop. Base `origin/main@80ca79c770590f2557a755a2971d08db5ffd5ac8`. Impacto en UI de Diario y Libres autenticados. La ruta, los permisos, la API y los datos conservan su contrato. Implementación y gate dirigidos en curso. FULL/STARTER: DIFERIDO POR EL DUEÑO.

| Comando | Exit y resultado |
|---|---|
| `gh pr view codex/t-098-compact-window-plan --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` | 0 con red autorizada. PR #96 MERGED el 2026-11-23T18:49:03Z, squash `80ca79c770590f2557a755a2971d08db5ffd5ac8`. El primer intento dentro del sandbox dio 1 por conexión a GitHub. |
| `git fetch origin main` y `git merge-base --is-ancestor 80ca79c770590f2557a755a2971d08db5ffd5ac8 origin/main` | 0 y 0. |
| `STARTER_E2E_PROJECT=starter-e2e-t098-base-measure bash scripts/e2e.sh --grep 'compact writing header:' --project desktop` | 1 esperado sobre el cliente de base. La prueba esperaba 32 px y midió 48 y 56 px. |

| Área, 640×480 CSS px | Cabecera base | Editor útil base |
|---|---:|---:|
| Diario, viewport de escritura vacío y enfocado | 48 | 296,23 |
| Libres, parte visible del contenido de un borrador largo, desde el inicio del formulario | 56 | 183,08 |

## Prompts de salida

Al publicar la implementación:

```text
Frontera reviewer independiente de T-098 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, S-117 y T-098. PRECONDICIÓN: gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <SHA> y verify-required verde en ese HEAD. Si no se cumple, devolvé el estado vigente. ACCIÓN: revisá el diff y las medidas de barra y editor a 640×480 contra AC-01…AC-03. Confirmá foco y densidad táctil, cotejá el gate diario de T-098 y corré el E2E dirigido de escritorio con namespace propio. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Tras el merge de T-098:

```text
Frontera planner de seguimiento de T-098 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/planner.md y docs/tasks/T-098-compact-writing-header.md. PRECONDICIÓN: gh pr view codex/t-098-compact-writing-header --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED con fecha y oid válidos y git merge-base --is-ancestor con ese oid y origin/main sale con exit 0. ACCIÓN: conciliá T-098 como done y retomá el pendiente de PostgreSQL en STATUS con el dueño. Pedí solo datos no secretos de la base nueva y confirmación de login. Sin otra tarea predefinida, presentá el paso vigente para decisión del dueño. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: registro de cierre y prompt vigente.
```
