---
id: T-098
status: done
priority: P1
size: S
milestone: post-M9
spec: S-117
depends_on: [T-097]
branch: codex/t-098-compact-writing-header
role: reviewer
executor: frontier
pr: 97
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

## Conciliación

2026-11-24. `gh pr view 97 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` devolvió MERGED, `2026-11-23T19:26:04Z` y `89c375869b8183089fdd9cd57a9616f0f2383e19`. `git fetch origin main` y `git merge-base --is-ancestor 89c375869b8183089fdd9cd57a9616f0f2383e19 origin/main` salieron 0. El mismo SHA estaba activo en Render. La siguiente prioridad solicitada queda en [T-099](T-099-persistent-google-session.md).

## Checkpoint de revisión

2026-11-23. Frontera reviewer independiente en Codex Desktop con GPT-6, variante y esfuerzo sin dato expuesto. Git, gh, PowerShell, Git Bash, Node 24.21.0 y Docker Desktop. [PR #97](https://github.com/MatiasNicolasAcevedo/devnotes/pull/97), HEAD revisado `983f6a0dce26226749dba2df158cf651709b5b69`, base `80ca79c770590f2557a755a2971d08db5ffd5ac8`. Impacto en la cabecera y el área útil de Diario y Libres. El diff conserva el contrato de API, autorización y datos.

| Verificación | Resultado |
|---|---|
| `gh pr view 97 --repo MatiasNicolasAcevedo/devnotes`, `git ls-remote origin` y consulta de hilos | Exit 0. PR abierto, listo, main y rama remota coinciden con base y HEAD. El último `verify-required` del HEAD es SUCCESS. Una corrida previa quedó cancelada. Cero hilos pendientes. |
| `git diff --quiet 13b1f11086b0538bcc302c76c071a1dfba87fce5 HEAD -- client e2e` | Exit 0. El gate de implementación corresponde a esas fuentes. Se cotejaron 18 pruebas de cliente y typecheck en el registro, y el JUnit móvil de 3/3. |
| `STARTER_E2E_PROJECT=starter-e2e-t098-review97-e624 bash scripts/e2e.sh --grep 'compact writing header:\|T-064:\|SP-06/SP-07\|CA-01:\|ai workspace: navbar' --project desktop` | Exit 0, 5/5. Consultas Docker de contenedores, redes y volúmenes por label exacto, exit 0 y cero recursos. |
| `node scripts/docs-check.mjs`, `git diff --check 80ca79c770590f2557a755a2971d08db5ffd5ac8...HEAD` y `bash scripts/verify.sh --policy 80ca79c770590f2557a755a2971d08db5ffd5ac8` | Exit 0 en el HEAD revisado. Perfil APPLICATION. FULL/STARTER: DIFERIDO POR EL DUEÑO. |

- **AC-01.** La corrida independiente y sus capturas a 640×480 confirman las medidas base y finales de abajo. Los bordes de escritura terminan en 392,98 px (Diario) y 428 px (Libres), con navegación desde 431 px.
- **AC-02.** El E2E verificó geometría a 320, 375 y 767 px con IA, etiquetas, controles de al menos 28 px, orden y contorno de foco, retorno con Escape y conservación de texto, cursor y foco al cruzar 767↔768 en ambos editores.
- **AC-03.** La consulta de medios excluye punteros táctiles e híbridos. El test de componente simula primario fino con puntero táctil adicional. El diff conserva los objetivos táctiles de 44 px, y las regresiones móvil y escritorio cubren la navegación inferior de 48 px y el menú del selector de 48 px. El E2E comprueba el retorno a densidad habitual a 768 px y CA-01 pasa a 1280×800 con las aserciones originales. El cálculo del Diario ancho descuenta los 8 px de padding del main y los 8 px de separación de la tarjeta.

Evidencia local de escritorio en `.orchestrator/t098-review97-evidence/`. La transición documental queda en `mergeable`. Falta acreditar el CI del HEAD de transición, publicar el veredicto ligado a ese SHA y confirmar el squash en GitHub.

### Evidencia de implementación

2026-11-23. Frontera implementer en Codex Desktop con GPT-6, variante y esfuerzo sin dato expuesto. PowerShell, Git Bash, gh, Node 24.21.0 y Docker Desktop. Base `origin/main@80ca79c770590f2557a755a2971d08db5ffd5ac8`. [PR #97](https://github.com/MatiasNicolasAcevedo/devnotes/pull/97). SHA técnico `13b1f11086b0538bcc302c76c071a1dfba87fce5`. Impacto en UI de Diario y Libres autenticados. La ruta, los permisos, la API y los datos conservan su contrato. FULL/STARTER: DIFERIDO POR EL DUEÑO.

| Comando | Exit y resultado |
|---|---|
| `gh pr view codex/t-098-compact-window-plan --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` | 0 con red autorizada. PR #96 MERGED el 2026-11-23T18:49:03Z, squash `80ca79c770590f2557a755a2971d08db5ffd5ac8`. El primer intento dentro del sandbox dio 1 por conexión a GitHub. |
| `git fetch origin main` y `git merge-base --is-ancestor 80ca79c770590f2557a755a2971d08db5ffd5ac8 origin/main` | 0 y 0. |
| `STARTER_E2E_PROJECT=starter-e2e-t098-base-measure bash scripts/e2e.sh --grep 'compact writing header:' --project desktop` | 1 esperado sobre el cliente de base. La prueba esperaba 32 px y midió 48 y 56 px. |
| `STARTER_E2E_PROJECT=starter-e2e-t098-desktop bash scripts/e2e.sh --grep 'compact writing header:\|T-064:\|SP-06/SP-07\|CA-01:\|ai workspace: navbar' --project desktop` | 1 en el primer candidato, 4/5. Solo CA-01 falló, con el borde a 803 px en un viewport de 800 px. |
| `STARTER_E2E_PROJECT=starter-e2e-t098-mobile bash scripts/e2e.sh --grep 'T-064:\|SP-06/SP-07\|CA-01:' --project mobile` | 0 en el primer candidato, 3/3. |
| `STARTER_E2E_PROJECT=starter-e2e-t098-ca01-base bash scripts/e2e.sh --grep 'CA-01:' --project desktop` | 1 sobre `80ca79c`. Reprodujo el borde a 803 px con viewport de 800 px. |
| Mismos filtros de escritorio y móvil con `STARTER_E2E_PROJECT=starter-e2e-t098-desktop-final` y `starter-e2e-t098-mobile-final` | 0 y 0 en `f9fff20` (5/5 y 3/3). La captura de Libres empezaba desplazada y esa medición se descartó. |
| Mismos filtros con `STARTER_E2E_PROJECT=starter-e2e-t098-desktop-stable` y `starter-e2e-t098-mobile-stable` | 1 y 0 en `13b1f11` (4/5 y 3/3). Las medidas coincidieron con la captura de Libres desde arriba. CA-01 pasó sus aserciones de geometría y falló más adelante al abrir el menú de cuenta durante el segundo login. |
| `STARTER_E2E_PROJECT=starter-e2e-t098-desktop-confirm bash scripts/e2e.sh --grep 'compact writing header:\|T-064:\|SP-06/SP-07\|CA-01:\|ai workspace: navbar' --project desktop` | 0 en `13b1f11`, 5/5 con el filtro ejecutado en solitario. Repitió las mismas cuatro alturas a 640×480. |
| `npm test -- --run src/app/AppShell.test.tsx src/features/spaces/SpaceSelector.test.tsx` y `npm run typecheck` | 0 (18/18) y 0. |
| `node scripts/docs-check.mjs` y `git diff --check origin/main...HEAD` | 0 y 0. |
| `bash scripts/verify.sh --policy origin/main` | 0, clasificación APPLICATION / FULL. FULL/STARTER: DIFERIDO POR EL DUEÑO. |
| `docker container ls -aq`, `docker network ls -q` y `docker volume ls -q` con `--filter label=com.docker.compose.project=<namespace>` | 0 y sin recursos en los 11 namespaces propios de T-098. |

| Área, 640×480 CSS px | Cabecera antes → después | Editor útil antes → después | Ganancia | Borde inferior del editor / inicio de navegación |
|---|---:|---:|---:|---:|
| Diario, viewport de escritura vacío y enfocado | 48 → 32 | 296,23 → 312,23 | 16 | 392,98 / 431 |
| Libres, parte visible del contenido de un borrador largo, desde el inicio del formulario | 56 → 32 | 183,08 → 207,08 | 24 | 428 / 431 |

Capturas revisadas a 640×480 con la cuenta piloto ficticia, sin diálogos de identidad ni metadatos de texto. Copias locales en `.orchestrator/t098-evidence/`. La prueba genera los PNG y `t098-medidas.json` en `e2e/artifacts/<proyecto>/test-results/`.

| Causa | Arreglo | Prueba |
|---|---|---|
| La cuenta ficticia estándar carecía de IA. La primera entrada piloto empezó antes de que terminara el reinicio del proveedor. | Reutilizar la sesión piloto interactiva y esperar readiness con el helper del harness antes de entrar. | Los dos primeros intentos de base devolvieron 1 antes de medir. Con el fixture listo, el rojo midió las dos cabeceras y el mismo caso pasó con IA visible. |
| La altura del Diario ancho descontaba el padding del main, pero omitía los 8 px de separación antes de la tarjeta. | Descontar ambos espacios en el cálculo de escritorio. | CA-01 falló con 803/800 tanto en la base como en el primer candidato. Pasó con `f9fff20` y en la confirmación de `13b1f11` con las mismas aserciones. |
| El movimiento del cursor en Libres podía desplazar el formulario después de pedir su posición inicial. | Esperar que el formulario y el main queden arriba y verificar que el contenido empiece debajo del encabezado del formulario antes de medir. | Dos mediciones iguales en `13b1f11`. Se descartó la medición intermedia, cuya captura mostraba la línea 8 al comienzo del formulario. |

## Prompts de salida

Al publicar la implementación:

```text
Frontera reviewer independiente de T-098 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, S-117 y T-098. PRECONDICIÓN: gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <SHA> y verify-required verde en ese HEAD. Si no se cumple, devolvé el estado vigente. ACCIÓN: revisá el diff y las medidas de barra y editor a 640×480 contra AC-01…AC-03. Confirmá foco y densidad táctil, cotejá el gate diario de T-098 y corré el E2E dirigido de escritorio con namespace propio. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Tras el merge de T-098:

```text
Frontera planner de seguimiento de T-098 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/planner.md y docs/tasks/T-098-compact-writing-header.md. PRECONDICIÓN: gh pr view codex/t-098-compact-writing-header --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED con fecha y oid válidos y git merge-base --is-ancestor con ese oid y origin/main sale con exit 0. ACCIÓN: conciliá T-098 como done y retomá el pendiente de PostgreSQL en STATUS con el dueño. Pedí solo datos no secretos de la base nueva y confirmación de login. Sin otra tarea predefinida, presentá el paso vigente para decisión del dueño. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: registro de cierre y prompt vigente.
```
