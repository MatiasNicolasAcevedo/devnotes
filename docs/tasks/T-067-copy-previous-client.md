---
id: T-067
status: in_review
priority: P1
size: M
milestone: M5
spec: S-110
depends_on: [T-066]
branch: codex/t-067-copy-previous-client
role: implementer
executor: frontier
pr: 70
---

# T-067 · Empezar el día desde una nota anterior

## Objetivo

Ofrecer copia explícita con fecha/espacio visibles y dejar la nota lista para editar con un gesto.

Habilitada con [T-066 MERGED y conciliada](T-066-copy-previous-api.md#conciliación). Contrato completo en S-110. Cada tarea y revisión usa una sesión independiente.

## Alcance y decisiones resueltas

Franja contextual vacía, sugerencia/carga/ausencia/error, POST único y ACK coordinado. Ignorar GET obsoleto por typing/contexto; bloquear durante copia. Undo como operación del editor, sin autosave duplicado. Diferenciar portapapeles.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-110](../specs/S-110-previous-day-copy.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [client/AGENTS](../../client/AGENTS.md).
4. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
5. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevo `client/src/features/daily/CopyPreviousNote.tsx`/test; `daily/api.ts`, `DailyNotesPage.tsx`, coordinador/editor ACK/undo; `e2e/tests/copy-previous.spec.ts` prefijo `copy previous:`.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

CP-01…08: teclado/táctil, fecha, ausencia/error, fuente cambiada, destino remoto no vacío, typing durante GET, red perdida, logout/espacio, undo/reload. Android sin comprimir toolbar; origen/versión intactos.

Desde `client/`, Node >=24/npm del proyecto:

```bash
npm test -- --run src/features/daily/CopyPreviousNote.test.tsx src/features/daily/api.test.ts src/features/daily/useDailyNote.test.tsx
```

Raíz, Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t067-desktop bash scripts/e2e.sh --grep 'copy previous:' --project desktop` y luego `STARTER_E2E_PROJECT=starter-e2e-t067-mobile bash scripts/e2e.sh --grep 'copy previous:' --project mobile`.

Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

El dueño autorizó el 2026-11-14 la corrección acotada de B-2 y una revisión independiente adicional. La corrección técnica `d3ba00d59ecf2c69b0e229e7c01e8f7e604b4814` está publicada en PR70 contra `main`, base `efd02e5e7a4016c9c8fee11ce80fbd7a54aa00fb`. R3 debe comprobar el HEAD/base vigentes, su `verify-required` y la evidencia de la corrección en un checkout independiente. El prompt está en [STATUS](../STATUS.md#prompt-de-la-siguiente-sesión).

**FULL/STARTER DIFERIDO POR EL DUEÑO.** SP-06 en Android físico con teclado real y zoom nativo pendiente del dueño. Render requiere autorización expresa separada sobre SHA y ventana.

## Evidencia dirigida

### Corrida de corrección B-2 tras R2

Frontera implementer en Codex Desktop (GPT-6, variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Node 24.21.0, Git Bash y Docker. Worktree propio `.orchestrator/t-067-fix-b2-codex` desde el HEAD del [veredicto R2](https://github.com/MatiasNicolasAcevedo/devnotes/pull/70#issuecomment-6883295325), `83b6b16f2e9b28c6ecace28ff4a06353c92b0839`. GitHub confirmó PR70 abierto contra `main` y [`verify-required` SUCCESS para el HEAD de entrada](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43634276463/job/132567530494). La recuperación muestra el estado real de guardado y bloquea las escrituras del cliente durante la incertidumbre. Usa la API, los permisos y el esquema de T-066.

- Rojo antes de editar producción, desde `client/`: `npm test -- --run src/features/daily/CopyPreviousNote.test.tsx -t 'al salir y volver a la fecha'`, exit 1, 1 fallo y 13 omitidos por el filtro. Tras perder la respuesta del POST y volver a la fecha, MSW dio GET 500. La barra mostró «Guardado» donde el test esperaba «Sin confirmar». Salida en `e2e/artifacts/t067-b2-vitest/red.log`.
- Verde desde `client/`: la misma selección de diez archivos de la [corrida R1](#corrida-de-corrección-r1), **184/184**, exit 0. Salida en `e2e/artifacts/t067-b2-vitest/green.log`. La regresión comprueba un POST por gesto, editor en solo lectura y guardado manual bloqueado tras el GET 500, y recuperación del contenido con el GET concluyente. También comprueba cambio a Personal y regreso a Trabajo, recuperación automática con GET 200 al volver y descarte al cerrar sesión incluso si vuelve la misma cuenta.
- Los negativos de B-1 pasan: un GET con revisión igual al ACK llega primero, el ACK genera cero PUT y un Ctrl+Z genera un solo PUT con el documento previo y la revisión del ACK. El GET con revisión superior se recupera y conserva el documento remoto con cero PUT.
- `npm ci --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`, exit 0. Lockfile intacto. Vite conserva el aviso de tamaño del chunk.
- Desde raíz y Git Bash, `STARTER_E2E_PROJECT=starter-e2e-t067-b2-desktop bash scripts/e2e.sh --grep 'copy previous:' --project desktop` y `STARTER_E2E_PROJECT=starter-e2e-t067-b2-mobile bash scripts/e2e.sh --grep 'copy previous:' --project mobile`, exit 0 en ambos. **2/2 desktop y 2/2 mobile**, cero fallos u omitidos, con backend real, PostgreSQL 18.6 y OIDC ficticio. Reportes `e2e/artifacts/starter-e2e-t067-b2-{desktop,mobile}/sanitized/junit.xml`. El harness y la comprobación posterior por label exacto confirmaron el cleanup de contenedores, redes y volúmenes de ambos proyectos.
- Fuentes probadas en `d3ba00d59ecf2c69b0e229e7c01e8f7e604b4814` sobre base `efd02e5e7a4016c9c8fee11ce80fbd7a54aa00fb`. Árboles `client` `b73d8f5dc7361864e873a70b58d1951f769078d5`, `e2e` `3c97c9c687369c1773c411aa701d59311e3ca144` y `server` `371d0c67a8e54a29d948e30dee46aff777c37878`. `node scripts/docs-check.mjs`, `git diff --check`, `git diff --check efd02e5...HEAD` y `node scripts/ci/classify-diff.mjs --base efd02e5e7a4016c9c8fee11ce80fbd7a54aa00fb --head HEAD --phase FULL`, exit 0. Clasificación `FULL/APPLICATION`, 18 rutas técnicas de 21. **FULL/STARTER DIFERIDO POR EL DUEÑO.**

### Corrida de corrección R1

Frontera implementer en Codex Desktop (GPT-6, variante y esfuerzo sin exponer), PowerShell, Git/gh, Node 24.21.0, Git Bash y Docker. Worktree propio `.orchestrator/t-067-fix-r1` desde HEAD publicado `5f329e4f4c2c616a3c8d6a85e622066d20b8e70f`, base `efd02e5e7a4016c9c8fee11ce80fbd7a54aa00fb`. Cambio de coordinación y estado de guardado en cliente, con la API, los permisos y el esquema de datos de S-110.

- Rojo antes de tocar producción, desde `client/`: `npm test -- --run src/features/daily/CopyPreviousNote.test.tsx -t 'coordina el GET|reconsulta el destino'`, exit 1. B-1 mismo ACK: cero PUT después de Ctrl+Z. B-2: «Guardado» presente pese a «Recargar nota», tanto tras respuesta perdida como tras los dos conflictos de destino. El control con revisión superior al ACK pasó. Salida local en `e2e/artifacts/t067-r1-vitest/red.log`.
- Verde desde `client/`, exit 0, 181/181 en diez archivos:

  ```bash
  npm test -- --run src/features/daily/CopyPreviousNote.test.tsx src/features/daily/api.test.ts src/features/daily/useDailyNote.test.tsx src/features/daily/editor/DailyEditor.test.tsx src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyDraftNavigation.test.tsx src/features/daily/SaveDailyVersion.test.tsx src/features/daily/DailyNotesToolbar.test.tsx src/features/spaces/SpaceSelector.test.tsx src/services/http.test.ts
  ```

- `npm ci --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`, exit 0. Lockfile intacto. Vite conserva el aviso de tamaño del chunk. Salida Vitest en `e2e/artifacts/t067-r1-vitest/green.log`.
- Desde raíz y Git Bash, `STARTER_E2E_PROJECT=starter-e2e-t067-r1-desktop bash scripts/e2e.sh --grep 'copy previous:' --project desktop` y `STARTER_E2E_PROJECT=starter-e2e-t067-r1-mobile bash scripts/e2e.sh --grep 'copy previous:' --project mobile`. Exit 0, **2/2 desktop y 2/2 mobile** con backend real, PostgreSQL 18.6 y OIDC ficticio. JUnit saneados en `e2e/artifacts/starter-e2e-t067-r1-{desktop,mobile}/sanitized/junit.xml`. Ambos reportan cero fallos y cero omitidos. Cleanup verificado por el harness y por label exacto de contenedores, redes y volúmenes de ambos proyectos.
- Árboles probados de `dc4176c`: `client` `51e93ecab28799ba377f3119574f31e61c93970b`, `e2e` `3c97c9c687369c1773c411aa701d59311e3ca144` y `server` `371d0c67a8e54a29d948e30dee46aff777c37878`. `node scripts/docs-check.mjs`, `git diff --check`, `git diff --check origin/main...HEAD` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`, exit 0. Clasificación `FULL/APPLICATION`, 17 rutas técnicas de 20. **FULL/STARTER DIFERIDO POR EL DUEÑO.**

### Primera entrega

Commit técnico `dd48794e112d2850c1d9a96136974de0e5eb34a9`, worktree `.orchestrator/t-067`. Frontera implementer en Codex Desktop (GPT-6, variante y esfuerzo sin exponer), PowerShell, Git/gh, Node y Git Bash. La entrega habilitó la sugerencia y la copia explícita en la UI diaria con la API, permisos y datos de S-110.

- `npm ci --no-audit --no-fund`, exit 0, lockfile sin cambios. Los tres archivos Vitest del contrato pasaron **75/75**, exit 0. Regresión complementaria, **85/85**, exit 0: `npm test -- --run src/features/daily/editor/DailyEditor.test.tsx src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyDraftNavigation.test.tsx src/features/daily/SaveDailyVersion.test.tsx src/features/spaces/SpaceSelector.test.tsx src/services/http.test.ts`.
- `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`, exit 0. Vite informó el aviso de tamaño del chunk.
- `node scripts/docs-check.mjs`, `git diff --check`, `git diff --check origin/main...HEAD` y clasificación de cierre, exit 0. Perfil `FULL/APPLICATION` por 15 rutas técnicas de 18. Árboles del commit técnico: `client` `9e6bd9dcdb3190556d6ab9b099c58d3608eacf20`, `e2e` `3c97c9c687369c1773c411aa701d59311e3ca144`, `server` `371d0c67a8e54a29d948e30dee46aff777c37878`.
- Los dos comandos `copy previous:` de esta tarea pasaron **2/2 desktop y 2/2 mobile**, exit 0 en cada proyecto, con PostgreSQL 18.6 y OIDC ficticio. El harness confirmó ausencia previa y eliminó sus contenedores, redes y volúmenes. Reportes saneados en `e2e/artifacts/starter-e2e-t067-{desktop,mobile}/sanitized/junit.xml` en el worktree propio. Los builds de ambos recorridos produjeron el mismo bundle de cliente. El ajuste posterior de espera en Vitest solo afecta el test de componente.
- CP-01/02/05/07/08: Playwright comprobó selección del viernes, límites de fecha y espacio, preservación del enlace/separador/referencia, revisión y persistencia, origen y versiones intactos, undo, recarga, teclado desktop y toque mobile a 375 px. CP-04: 409 reales por fuente modificada y destino remoto, además de POST único y texto local en Vitest. CP-03/06/07: Vitest comprobó ausencia, error, cambio de fecha/espacio, logout durante POST y respuesta perdida con relectura antes de repetir.

## Correcciones durante la implementación

| Problema | Arreglo y evidencia |
|---|---|
| jsdom no implementa la geometría de `Range` y el click sintético dentro del editor disparó una excepción de `elementFromPoint`. | Geometría de prueba como en DailyEditor.test y foco DOM para la escritura del test. Playwright valida foco mediante teclado y toque reales del navegador. Selección Vitest final 75/75. |
| Al perder el ACK, un destino aún no confirmado podía quedar editable antes de la relectura. | El coordinador conserva la necesidad de recargar por nota y la UI suspende edición y guardado manual hasta recuperar el destino. Negativos de red/409 en Vitest y recarga tras 409 en ambos proyectos Playwright. |
| R1 B-1. Un GET con la revisión copiada hidrataba el editor antes de que el ACK pudiera registrar el undo. | El coordinador difiere la hidratación durante el POST y coteja el ACK con la revisión en caché. En `dc4176c`, Vitest confirma cero PUT con el ACK, un PUT tras un solo undo con la revisión del ACK y recuperación si el GET trae una revisión superior. |
| R1 B-2. El indicador volvía a «Guardado» con el destino incierto. | En `dc4176c`, la barra muestra «Sin confirmar» mientras se mantiene el bloqueo. Los negativos de respuesta perdida y conflicto verifican el bloqueo, un POST por gesto y recuperación. Un GET fallido conserva el aviso; uno concluyente restablece «Guardado». |
| R2 B-2. El remonte del coordinador borraba la recuperación al volver a la fecha, incluso si el GET fallaba. | En `d3ba00d`, la revisión mínima para recuperar el destino vive en memoria de la sesión de la cuenta, por espacio y fecha. Una lectura nueva concluyente la resuelve al volver o al usar «Recargar nota». El rojo y el verde de Vitest cubren GET 500, bloqueo, recuperación, POST único y aislamiento. |

## Revisión independiente R1

2026-11-14. Frontera reviewer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh y Node 24. Worktree propio `.orchestrator/t-067-review-codex`. GitHub confirmó [PR70](https://github.com/MatiasNicolasAcevedo/devnotes/pull/70) `OPEN` contra `main`, listo para revisión, HEAD de entrada `bbbdcd952c52bb75a95fcc2e8c92349352f2fa76`, base `efd02e5e7a4016c9c8fee11ce80fbd7a54aa00fb` y [`verify-required` SUCCESS sobre ese HEAD](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43630295836/job/132555177301). La revisión afecta la coordinación del documento y lo que comunica la UI. La API, el modelo de datos y los permisos de servidor corresponden al contrato ya publicado en T-066.

- En el worktree de revisión, las dos selecciones Vitest publicadas se ejecutaron juntas con `npm test -- --run` y pasaron 160/160 en 9 archivos, incluidos los negativos de fecha, espacio y sesión, escritura local durante GET, doble click y recuperación tras conflicto. `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build` pasaron. Vite mantuvo el aviso de tamaño del chunk.
- Se cotejaron los árboles `client`, `e2e` y `server` con los registrados por el implementer y los dos reportes JUnit saneados de `copy previous:`. Ambos casos figuran verdes en desktop y en mobile, 2/2 por proyecto, con backend real, PostgreSQL 18.6 y OIDC ficticio según la ejecución del implementer. El reviewer verificó los reportes y las aserciones del recorrido. La simulación de orden de respuestas de B-1 y el fallo de B-2 se comprobaron con Vitest/MSW.
- En raíz, `node scripts/docs-check.mjs` y `git diff --check efd02e5...HEAD` pasaron. La clasificación contra la base publicada dio `FULL/APPLICATION` con 15 rutas técnicas. **FULL/STARTER DIFERIDO POR EL DUEÑO.**
- Dos reproducciones temporales en `CopyPreviousNote.reviewer.test.tsx` dieron 0/2, exit 1 con `npm test -- --run src/features/daily/CopyPreviousNote.reviewer.test.tsx` desde `client/`. La reproducción queda como evidencia local ignorada en `e2e/artifacts/t067-review/` del worktree reviewer. Esta transición publica solo T-067 y STATUS. El veredicto canónico se liga al HEAD de transición y a la misma base en PR70.

### B-1 · La relectura puede quitar el undo de una copia confirmada

CP-07. Con el POST comprometido y su respuesta retenida, un refetch del detalle puede devolver la misma revisión antes del ACK. El efecto de `useDailyNote.ts` hidrata ese contenido mientras la copia sigue en curso. `DailyEditor.tsx` lo aplica fuera del historial y, cuando llega el ACK, sale por igualdad de documentos. En la reproducción se ve «Copiada del 13/11/2026», pero Ctrl+Z deja el documento copiado y se registran cero PUT.

Corrección suficiente: coordinar las lecturas durante el POST y registrar una sola operación reversible desde el estado previo cuando llegue el ACK. Conservar la protección frente a una revisión remota superior. Cierre observable: con GET de la revisión copiada antes del ACK, confirmar sin PUT, deshacer con un solo gesto y persistir el documento previo usando la revisión del ACK. Si GET entrega una revisión superior, conservarla y resolver el destino por el flujo de recuperación.

### B-2 · La barra afirma «Guardado» con el destino de copia incierto

CP-07. Tras una pérdida de respuesta, `useDailyNote.ts` marca `copyTargetNeedsReload`, pero deriva `status = 'saved'` al terminar el POST. La prueba encuentra al mismo tiempo «Recargar nota» y «Guardado» dentro de «Estado de guardado».

Corrección suficiente: hacer que el indicador refleje el estado incierto hasta una relectura concluyente. Cierre observable: ni «Guardado» ni confirmación de copia tras perder la respuesta, con edición y guardado manual bloqueados hasta la relectura. Al recuperar el destino, mostrar el estado que corresponda y conservar el límite de un POST por gesto.

## Revisión independiente R2

2026-11-14. Frontera reviewer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh y Node 24.21.0. Worktree propio `.orchestrator/t-067-review-r2-codex`. GitHub confirmó [PR70](https://github.com/MatiasNicolasAcevedo/devnotes/pull/70) `OPEN` contra `main`, HEAD de entrada `4a26f9069f4a6ae53aefcddd1e43f11d08abcb0a`, base `efd02e5e7a4016c9c8fee11ce80fbd7a54aa00fb` y [`verify-required` SUCCESS sobre ese HEAD](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43633541666/job/132565272987). La corrección cambia la coordinación del ACK y lo que comunica la UI, sobre la API, los permisos y el esquema de T-066.

- Repetida desde `client/` la selección de diez archivos de la [corrida de corrección](#corrida-de-corrección-r1), exit 0, **181/181**. `npm ci --no-audit --no-fund`, `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`, exit 0. Vite conservó el aviso de tamaño del chunk.
- B-1 cerrado. El GET con revisión igual al ACK llega antes que el ACK. La copia confirmada genera cero PUT y un solo Ctrl+Z genera un PUT con el documento previo y la revisión del ACK. Cuando el GET trae una revisión superior, la recuperación conserva el contenido remoto y se registran cero PUT.
- B-2 pasa mientras se permanece en la fecha. El caso de respuesta perdida y GET fallido conserva «Sin confirmar» y bloquea edición y guardado manual, hasta el GET concluyente. El POST se cuenta una vez. La regresión de abajo verifica el mismo bloqueo al salir y volver a la fecha.
- Cotejados los dos JUnit saneados del implementer y las aserciones de `copy previous:`, **2/2 desktop y 2/2 mobile**, sin fallos ni omitidos, con backend real, PostgreSQL 18.6 y OIDC ficticio según la corrida de corrección. Los árboles `client`, `e2e` y `server` coinciden con `dc4176c` y la base publicada coincide. R2 verifica esa evidencia de Playwright y ejecuta Vitest en su propio worktree.
- En raíz, `node scripts/docs-check.mjs`, `git diff --check efd02e5...HEAD` y `node scripts/ci/classify-diff.mjs --base efd02e5e7a4016c9c8fee11ce80fbd7a54aa00fb --head HEAD --phase FULL`, exit 0. Perfil `FULL/APPLICATION`, 17 rutas técnicas de 20. El veredicto en PR70 se liga al HEAD de esta transición y a la misma base tras comprobar la CI del nuevo HEAD.

### B-2 · Volver a la fecha descarta el estado sin confirmar

CP-07. Con el POST sin respuesta, la vista muestra «Sin confirmar» y bloquea el editor. Al elegir otra fecha y volver, `DailyDraftProvider.tsx` remonta el coordinador por owner/espacio/fecha. `useDailyNote.ts` inicializa `copyTargetNeedsReload` en `false` y deriva `saved` al terminar el GET aunque haya devuelto HTTP 500. Desaparece «Recargar nota», el editor vuelve a `contenteditable=true` y «Guardar versión» queda habilitado antes de una relectura concluyente. El contador sigue en un POST.

Reproducción independiente de Vitest/MSW con los selectores reales de fecha, un POST con error de red y un GET 500 verificado en la caché al regresar. Desde `client/`, `npm test -- --run src/features/daily/CopyPreviousNote.r2-review.test.tsx -t 'al salir y volver'`, exit 1, 1 caso fallido y 13 omitidos por el filtro. Prueba temporal y salida de Vitest conservadas en el directorio ignorado `e2e/artifacts/t067-review-r2/` del worktree reviewer.

Condición de cierre: al volver a una fecha con copia incierta, conservar la recuperación por cuenta, espacio y fecha hasta obtener una lectura concluyente. La regresión debe verificar «Sin confirmar», recuperación disponible, edición y guardado manual bloqueados tras el GET 500, desbloqueo tras una lectura concluyente y un solo POST por gesto. Conservar los negativos de B-1 y el aislamiento de fecha, espacio y sesión. Con autorización del dueño, Frontera implementer corrige en PR70 y Frontera reviewer verifica en otra sesión con el HEAD/base publicados y CI vigente.

## Cierre y siguiente tarea

El control de avance de I5 corresponde tras confirmar T-067 MERGED. Revisar las últimas cinco tareas (T-063 a T-067), sus dependencias y evidencia dirigida, el integrado diferido y SP-06 en Android físico con teclado real y zoom nativo, pendiente del dueño. Conciliar T-067 como `done` tras confirmación en GitHub y volver a Frontera/dueño para decidir el siguiente alcance. Render requiere autorización expresa separada sobre SHA y ventana.
