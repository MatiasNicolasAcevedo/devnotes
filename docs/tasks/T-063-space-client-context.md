---
id: T-063
status: mergeable
priority: P1
size: L
milestone: M5
spec: S-109
depends_on: [T-062]
branch: codex/t-063-space-client-context
role: implementer
executor: junie
pr: 66
---

# T-063 · Contexto privado en rutas, transporte y borradores

## Objetivo

Atar cada lectura, mutación y borrador a cuenta/espacio fijos incluso en navegación/respuestas tardías.

Habilitada al cumplirse su única dependencia: T-062 MERGED y [conciliada](T-062-xlsx-spaces-api.md#conciliación). Contrato completo en S-109; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

Enum/URL/preferencia mínima, coordinador común de transición. Propagar space APIs/keys de diario/versiones/ref/voz; contexto de request capturado y cambio tras flush/guardias. URL inválida nunca escribe; no persistir notas/cache. Transversal por una sola invariante de aislamiento, sin selector visual aún.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevo `features/spaces/space.ts`, `SpaceProvider.tsx`, `SpaceNavigation.tsx`; APIs/hooks de cuatro features, `DailyDraft*`, `VoiceDraft*`, `AppShell` y limpieza sesión; `SpaceNavigation.test.tsx`, `SpaceApiContext.test.ts` y suites afectadas.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Dos contextos misma fecha/ID, guardados/versiones en vuelo, error/409 diario, guardar/descartar/cancel voz, audio/transcripción tardía. Atrás/Adelante/URL con misma guardia; logout/expiración/storage denegado/preferencia inválida/otra pestaña. Cada request persistente incluye space.

Desde `client/`, Node >=24/npm del proyecto:

```bash
npm test -- --run src/features/spaces src/features/daily/api.test.ts src/features/daily/useDailyNote.test.tsx src/features/voice/VoiceDraftNavigation.test.tsx src/features/reference
```

Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

2026-11-13 · Rol Junie implementer ejecutado por Claude Opus 5.5 en Claude Code de escritorio (esfuerzo de razonamiento expuesto en la sesión: 15), con Git Bash, PowerShell, Git, `gh` y Node 24.21.0/npm del proyecto. Sesión nueva. Worktree propio `.orchestrator/t-063` desde `main` `40361d8`; checkout principal y `trailer/` sin tocar. Precondición: `gh pr view 65` → MERGED contra `main`, squash `40361d8`, mergedAt 2026-11-14T02:07:09Z, HEAD `22cb1c3`. T-062 conciliada como `done` en el primer avance `4b35c81`.

Impacto:

- **Comportamiento:** cada pantalla de contenido lee y escribe solo en el espacio confirmado. La URL sin `space` se completa con replace (preferencia del dispositivo o Trabajo); una URL inválida muestra «Espacio no válido» y no carga ni escribe. El cambio de espacio pasa por un único coordinador con las guardias de S-109.
- **API:** el cliente envía `space` en todas las operaciones de notas, versiones, referencias y voz (CRUD incluido). Capacidad y transcripción de voz siguen globales. Sin cambios en el servidor.
- **Datos:** keys privadas por `owner+space`. En `localStorage` solo `devnotes:last-space:<id>` con `work|personal`, guardada al completar la transición y borrada al cerrar sesión o expirar.
- **Permisos:** sin cambios; el propietario sigue saliendo de la sesión.
- **UI:** sin selector visual (T-064). Enlaces internos con `?space=`. Pantallas nuevas: «Espacio no válido», avisos de espera/guardado/fallo del coordinador y diálogo de voz «Guardar y cambiar / Descartar y cambiar / Seguir aquí». Un visitante en Voz ve la invitación a ingresar en lugar del compositor vacío.

Hecho: implementación `a66fc49`, [PR66](https://github.com/MatiasNicolasAcevedo/devnotes/pull/66).

- `features/spaces/space.ts`: enum estricto, lectura del parámetro (ausente/válido/inválido, incluidos vacío, mayúsculas y repetido), enlaces canónicos, ruta de API que rechaza valores fuera del enum y rutas de contenido.
- `spacePreference.ts`: preferencia por cuenta, solo enum, tolerante a almacenamiento denegado.
- `SpaceProvider.tsx` y `spaceContext.ts`: espacio confirmado por identidad (se reinicia en el mismo render al cambiar de cuenta, sin remontar la barra), canonicalización, preferencia tras la transición, origen para «Volver», bloqueos registrables.
- `SpaceNavigation.tsx`: coordinador único. Orden: bloqueo (importación) → versión guardándose → flush del diario hasta ACK (error/409 conserva origen y borrador, con reintento) → captura de voz detenida sin transcribir → diálogo de voz → confirmación en `useLayoutEffect`. Con importación en vuelo, un enlace a otro espacio se retiene con explicación.
- APIs/hooks de diario, versiones, referencias y voz con `space` explícito y keys `owner+space`; `DailyDraftProvider`, `DailyDraftWorkspace` y `VoiceDraftProvider` se remontan por `owner+space`, y el borrador diario solo se crea con una URL cuyo `space` coincide con el confirmado. `@`, vista previa y búsqueda de referencias usan el espacio de la nota. `AuthSessionProvider` borra la preferencia de la identidad al terminar la sesión. `DataPage` registra el bloqueo durante la importación.

Pruebas, desde `client/` en Git Bash con Node 24.21.0:

- **Contrato:** `npm test -- --run src/features/spaces src/features/daily/api.test.ts src/features/daily/useDailyNote.test.tsx src/features/voice/VoiceDraftNavigation.test.tsx src/features/reference` → exit 0, 10 archivos, 125/125.
- **Suites afectadas:** `npx vitest run` → 54 archivos, 757/757 (iteración local, no FULL ni `test:ci`).
- **Estáticos:** `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build` → exit 0. El build mantiene el aviso previo de tamaño de chunk.
- **Negativos por mutación** (fuentes restauradas y verificadas con `git diff`): sin la guardia de flush, `SpaceNavigation.test.tsx` 3 fallos; con el borrador diario ignorando el `space` de la URL, `DailyDraftNavigation.test.tsx` 1 fallo; con el transporte sin `space`, 22 fallos en spaces/daily api/reference.
- Casos nuevos: canonicalización con preferencia/Trabajo; `space` desconocido, vacío, mayúsculas y repetido sin lecturas ni escrituras; visitante sin leer preferencias; preferencia inválida y almacenamiento denegado; evento `storage` de otra pestaña ignorado; logout borra solo la clave de esa identidad; misma fecha en dos espacios; flush hasta ACK antes del destino; 409/503 conserva origen sin escribir en el destino; versión en vuelo bloquea con explicación; voz seguir aquí/409/descartar y guardar y cambiar; transcripción en vuelo cancelada y respuesta tardía descartada; referencias sin mezcla y respuesta tardía del origen descartada; importación retiene enlaces a otro espacio; ACK diario tardío tras remontar en el destino; las 18 operaciones persistentes con `space` en ambos espacios y rechazo previo a la red de valores inválidos.

Cierre desde la raíz: `node scripts/docs-check.mjs` OK, `git diff --check` OK y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=APPLICATION`, 57 rutas técnicas. **FULL/STARTER DIFERIDO POR EL DUEÑO**: no se ejecutaron FULL, STARTER, tooling completo ni E2E. Sin stacks ni contenedores.

Limitaciones: Atrás/Adelante y URL escrita cambian la dirección antes de la guardia; el coordinador muestra la espera o el fallo en lugar del destino y «Volver a …» restaura el origen con replace. Con una importación en vuelo, salir de Datos hacia otra ruta del mismo espacio sigue desmontando la pantalla como antes; solo se retienen los enlaces a otro espacio. Paso intermedio: sin selector visual ni Datos v2 hasta T-064, no desplegar.

Pendiente: revisión independiente de PR66 en otra sesión, con `verify-required` del HEAD vigente.

### Correcciones significativas

| Problema / causa | Arreglo | Prueba / SHA |
|---|---|---|
| Remontar `SpaceProvider` por identidad recreaba la barra superior y dejaba referencias a nodos desprendidos (falla de `AuthSession.test.tsx`) | Reiniciar el estado por identidad en el mismo render, sin `key` | `AuthSession.test.tsx` 19/19, `a66fc49` |

## Revisión independiente R1

2026-11-13 · Frontera en rol reviewer, Claude Code de escritorio (Claude Opus 5.5, esfuerzo expuesto en la sesión: 15), Git Bash, PowerShell, Git, `gh` y Node 24.21.0/npm del proyecto. Sesión distinta de la implementación. Checkout aislado con `git worktree add --detach` fuera del repositorio, HEAD `146b202c2c9b1a2ecf4b8731e36bb1489a1a3c5d`, base publicada `40361d85c6a31b51b8eafb610370c3c5b1975e6e`. Checkout principal y `trailer/` sin tocar.

- PR66 OPEN, no draft, contra `main`, `MERGEABLE`. `gh pr view` y `git fetch` coincidieron en HEAD y base; `git merge-base` de la rama con `main` es la base publicada. [CI de entrada](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43548280358/job/132304589090) con `verify-required` SUCCESS para `146b202`; la otra ejecución del mismo SHA quedó cancelada por concurrencia y no cuenta como verde. Fuentes técnicas de `a66fc49`; `146b202` solo cambia Markdown.
- URL y preferencia. `readSpaceParam` distingue ausente/válido/inválido con `getAll`, así que repetido, vacío y mayúsculas son inválidos. Sin `space`, `SpaceProvider` canonicaliza con replace usando el espacio confirmado de la pestaña, la preferencia o Trabajo. La preferencia guarda solo el enum bajo `devnotes:last-space:<id>`, se escribe recién cuando URL y espacio confirmado coinciden, tolera almacenamiento denegado (el estado confirmado hace de memoria) y `endSession` la borra en logout y expiración. No hay escucha del evento `storage`.
- Coordinador único. `SpaceNavigation` decide para enlaces, Atrás/Adelante y URL escrita con el orden de la tabla de S-109: bloqueo de importación → versión guardándose → flush diario hasta ACK (error/409 conserva origen y borrador, con reintento) → captura de voz detenida sin transcribir → diálogo de voz → `commit` en `useLayoutEffect`. Mientras tanto el destino no se monta y el contexto sigue en el origen. La guardia previa de voz entre rutas del mismo espacio no compite: el coordinador solo actúa cuando cambia el espacio y reemplaza su salida.
- Transporte y keys. Las 18 operaciones persistentes de notas, versiones, referencias y voz pasan por `spaceApiPath`, que rechaza valores fuera del enum antes de la red; capacidad y transcripción siguen globales. Keys `['daily'|'reference'|'voice', owner, space, …]`; invalidaciones y `forgetMissingNote` usan el scope capturado. `rg` sobre `client/src` no encontró rutas de esas APIs ni keys privadas fuera de los módulos con espacio.
- Respuestas tardías y URL inválida. Los coordinadores diario y de voz y la pantalla de referencias se remontan por `owner+space`; guardados y mutaciones usan el espacio de su instancia. `DailyDraftWorkspace` solo crea borrador con una URL cuyo `space` coincide con el confirmado, y con URL inválida el coordinador muestra «Espacio no válido» sin montar contenido. Sin selector visual: solo enlaces internos con `?space=`.
- Pruebas desde `client/`, Node 24.21.0: `npm ci` exit 0; `npm test -- --run src/features/spaces src/features/daily/api.test.ts src/features/daily/useDailyNote.test.tsx src/features/voice/VoiceDraftNavigation.test.tsx src/features/reference` → exit 0, 10 archivos, 125/125; `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build` → exit 0 (el build mantiene el aviso previo de tamaño de chunk).
- Negativos propios por mutación, fuentes restauradas y `git status` limpio: con `readSpaceParam` tratando lo inválido como Trabajo, 5 fallos (`SpaceApiContext` 1, `SpaceNavigation` 4: `all`, vacío, `Work` y repetido); sin `clearSpacePreference` en `endSession`, falla «cerrar sesión borra solo la preferencia de esa identidad».
- Checks de cierre desde la raíz: `node scripts/docs-check.mjs` OK, `git diff --check origin/main..HEAD` OK y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=APPLICATION`, 60 rutas, 57 técnicas.

Observaciones no bloqueantes, para que T-064/T-065 las tengan a la vista sin cambiar la cola:

1. Atrás/Adelante y URL escrita cambian la dirección antes de la guardia (la aplicación usa `BrowserRouter`, sin bloqueo de historial). El invariante de datos se cumple: el destino no lee ni escribe hasta el ACK y «Volver a …» restaura el origen. La experiencia queda para la aceptación visual de SP-06/SP-07.
2. Si otra identidad se autentica desde otra pestaña, `discardPrivateData` limpia el contenido pero la preferencia de la identidad anterior queda; S-109 §5 solo exige el borrado en logout y expiración, y el valor es solo el enum.
3. Con una importación en vuelo solo se retienen los enlaces a otro espacio; salir de Datos hacia otra ruta del mismo espacio desmonta la pantalla como antes de esta tarea.

**Resultado favorable, sin bloqueantes. FULL/STARTER DIFERIDO POR EL DUEÑO.** El veredicto canónico se publica en PR66 con el HEAD documental y la base vigentes, después de comprobar la CI de ese par. No se mergea sin autorización expresa del dueño según [AUTONOMY](../AUTONOMY.md#revisión-y-merge). Sin selector visual ni Datos v2 hasta T-064: no desplegar; el ensayo de Render requiere autorización expresa sobre SHA y ventana.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-064 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
