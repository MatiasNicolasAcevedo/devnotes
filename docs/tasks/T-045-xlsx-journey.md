---
id: T-045
status: draft
priority: P1
size: M
executor: junie
role: implementer
milestone: M3
product_cycle: I3
spec: S-107
spec_version: 1
branch: codex/s-107-xlsx-portability
pr: null
depends_on: [T-044]
---
# T-045 · Recorrido real de ida y vuelta y prueba del dueño

## Objetivo

Demostrar XL-06 en un navegador real y cerrar M3 con la prueba del dueño sobre sus propios datos locales. Esto habilita el piloto en Render, cuya siguiente tarea es [T-046](T-046-render-image.md).

Está en `draft` solo porque depende de T-044 cerrada en la rama compartida de [S-107](../specs/S-107-xlsx-portability.md#tareas-y-dependencias). Cierra la rama: gate integrado, control de las seis tareas y paso del PR único a revisión.

## Alcance y decisiones resueltas

- **Spec E2E.** `e2e/tests/portability.spec.ts`, con títulos `portability:`, reutilizando los fixtures OIDC de dos actores, los helpers de daily y los de referencia. La suite no usa `page.route` ni interceptores sobre la API propia. La descarga se hace con el evento `download` de Playwright y el archivo vive en el directorio temporal del test, no en los artefactos exportados.
- **Recorrido.**
  1. A crea una referencia, una nota diaria con texto, un enlace, un separador de 50 % y un átomo de esa referencia, guarda la versión del día y crea una nota de voz escribiendo texto (sin micrófono).
  2. A exporta.
  3. B, vacía, importa y confirma. B ve la misma nota con el enlace, el separador y la referencia resuelta con el título, el historial de esa fecha, la nota de voz y la referencia.
  4. B vuelve a importar el archivo y recibe el mensaje de cuenta no vacía.
  5. A sigue con sus datos intactos.
- **Viewports.** El gate cubre desktop 1280 y mobile 375. Se itera con `--grep "portability:"`.
- **Prueba del dueño, sin agente sobre los datos.** En su stack persistente, el dueño exporta su cuenta, abre el archivo en Excel para leerlo, e importa ese archivo en una segunda cuenta vacía de su instancia local, o en un stack descartable propio. Compara a simple vista. El agente registra solo «OK/observaciones», conteos y SHA, sin abrir ni copiar el archivo.

## Leer antes

1. [S-107](../specs/S-107-xlsx-portability.md).
2. [TESTING · Tiempos de E2E](../TESTING.md#tiempos-de-e2e---advertencia-critica).
3. `e2e/tests/voice.spec.ts` y `e2e/tests/reference-preview.spec.ts` (dos actores y helpers).
4. [E2E-ITERATION](../E2E-ITERATION.md).

## Archivos y pasos

`e2e/tests/portability.spec.ts`, y helpers en `e2e/tests/` solo si se reutilizan. Esta tarea y STATUS registran la evidencia.

1. Escribir el recorrido e iterar con `--grep "portability:" --project desktop`, luego en mobile.
2. Correr el gate FULL una sola vez, con las fuentes sin cambios.
3. Registrar la prueba del dueño. Si encuentra un defecto de pérdida o fuga, corregirlo aquí con una prueba roja previa, o hacer checkpoint a frontera si cae fuera del contrato.

## Aceptación y pruebas

| Criterio | Capa | Comando | Resultado |
|---|---|---|---|
| XL-06 | E2E real | Desde la raíz con Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t045-iter bash scripts/e2e.sh --grep "portability:" --project desktop`, y luego `--project mobile` | Verde en ambos |
| Gate integrado de S-107 | FULL sobre el HEAD final de la rama; añadir `--tooling` si el diff acumulado desde `c5e37cc4b73ad038ac35edf29c66131416bb4a34` es STARTER según `--policy` | Comando único del gate, desde la raíz con Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t045 STARTER_E2E_PROJECT=starter-e2e-t045 STARTER_SERVER_TESTS=container bash scripts/verify.sh` | Exit 0, incluidas todas las suites E2E previas |
| Dueño | Manual | Exportar en su cuenta y luego importar en una cuenta vacía | Veredicto explícito del dueño con SHA |

## Checkpoint vigente

2026-11-10. Implementer en Claude Code de escritorio (Claude Fable 5.2, `claude-fable-5-2`, esfuerzo no expuesto), sesión distinta de las de T-040…T-044, con Git Bash, Docker, Node 24.21.0, Git y `gh`. Impacto: solo pruebas; agrega `e2e/tests/portability.spec.ts`. Sin cambios de comportamiento, API, permisos, esquema, datos ni UI.

**XL-06 verde en desktop y mobile; gate integrado en curso.** El frontmatter sigue en `draft` por la [regla de la rama compartida](../specs/S-107-xlsx-portability.md#tareas-y-dependencias); la portadora es [T-040](T-040-daily-timestamps.md) y el PR es el [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49) (draft).

- Precondición: `gh pr view 49` devolvió `OPEN`, draft, `codex/s-107-xlsx-portability` → `main`, HEAD `c82f5e9`, que contiene `b18bd04`; árbol local limpio y T-044 registrada como cerrada con XL-05 verde.
- SHA del recorrido: `6980805`. Solo agrega `e2e/tests/portability.spec.ts`; no hizo falta tocar helpers ni fuentes de la aplicación.
- XL-06, desde la raíz con Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t045-iter bash scripts/e2e.sh --grep "portability:" --project desktop` **exit 0**, 1/1, y lo mismo con `--project mobile` **exit 0**, 1/1. Ambos pasaron en la primera corrida, sin correcciones. Logs locales `.orchestrator/t045/xl06-desktop.log` y `xl06-mobile.log`. El script retiró su proyecto en cada corrida: cero contenedores, volúmenes y redes con el label `starter-e2e-t045-iter`.
- Clasificación: `bash scripts/verify.sh --policy c5e37cc4b73ad038ac35edf29c66131416bb4a34` sobre `c82f5e9` dio `policy=FULL` y **`profile=STARTER`**, con 72 rutas y 49 técnicas (POM de T-041, script de proxies y configuración de proxies de T-043). El gate lleva tooling.

Recorrido de `portability.spec.ts` (Chromium real, API/DB/OIDC propios reales, dos identidades simultáneas con login interactivo, sin `page.route` ni interceptores):

1. A crea una referencia; escribe la nota diaria con texto, un separador de 50 %, un átomo de esa referencia insertado con `@` y un enlace; espera el autosave real, guarda la versión del día y crea una nota de voz escribiendo texto.
2. A exporta con «Descargar Excel»: evento `download` de Playwright, 200 con `Content-Type`, `Content-Disposition`, `no-store` y `nosniff` del contrato, nombre `devnotes-YYYY-MM-DD.xlsx`, firma ZIP y estado «Descarga lista». El archivo va a un directorio de `os.tmpdir()` que se borra al terminar, fuera de `/artifacts`.
3. B empieza con cero registros en las cuatro colecciones. La vista previa responde `accountEmpty: true` con conteos 1/1/1/1 y no escribe. B confirma en el diálogo, que repite los conteos, y la importación responde 201. Por la API, B tiene los mismos registros con IDs distintos, el átomo reescrito a su referencia, `updatedAt`/`savedAt`/`createdAt` conservados y `revision`/`sourceRevision` en 1. En pantalla, B ve la referencia, la nota con el enlace, el separador y el átomo `@título` resuelto a su copia (la vista previa del átomo muestra la descripción), la versión en Historial y la nota de voz.
4. B vuelve a elegir el archivo: la vista previa responde `accountEmpty: false`, se muestra «Solo se puede importar en una cuenta sin datos.» y no hay botón «Importar» ni diálogo. Como la UI no alcanza el 409, el caso envía el mismo archivo a `imports` con la sesión y el CSRF de B: 409 `IMPORT_ACCOUNT_NOT_EMPTY`, `problem+json`, `no-store` y B sin cambios.
5. A conserva exactamente el mismo estado por la API que antes de exportar, y su nota sigue igual tras recargar.

Medición real de overflow, pendiente desde T-044: `layout()` comprueba que no hay scroll horizontal y que los controles visibles caben en el viewport en la pantalla «Datos» de A tras la descarga y de B con la vista previa, con el éxito y con el aviso de cuenta no vacía; además el botón «Confirmar importación» del diálogo cabe en el viewport. Verde a 1280 y a 375 px.

### Gate integrado en curso

Checkpoint previo a la corrida larga, con las fuentes quietas.

- HEAD de la corrida: el commit de documentación que registra este checkpoint, hijo de `6980805`; el log lo anota en `START` y `END` junto con el árbol y `DIRTY`. Base `main` `fc8fda5b20946e595c153144e99d9a3d3346ac5d`; diff acumulado clasificado desde `c5e37cc4b73ad038ac35edf29c66131416bb4a34`.
- Comando, desde la raíz con Git Bash, una sola vez: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t045 STARTER_E2E_PROJECT=starter-e2e-t045 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter`. Es el comando único de la tabla más tooling: `verify.sh` acepta una sola opción y `--starter` ejecuta docs, backend, cliente, tooling y E2E en una corrida, que [TESTING](../TESTING.md#frecuencia-y-alcance-del-gate) da por equivalente a FULL más `--tooling`.
- Log local: `.orchestrator/t045/starter-gate.log` (ignorado por Git; solo fixtures ficticias).
- Recursos propios: proyectos Compose `starter-verify-t045` y `starter-e2e-t045`, más los que crean los ensayos de tooling con sus nombres propios. Antes de empezar, cero contenedores, volúmenes y redes con esos dos labels. Cleanup: lo hacen los scripts; después se cotejan los labels exactos y se retira solo lo que quede de esos proyectos. No se toca el stack ajeno `starter-dev-devnotes-preview-1027` (puertos 5175 y 8090) ni `.orchestrator`.
- Siguiente paso: con exit 0, registrar tiempos y conteos, hacer el control de avance de T-040…T-045, pasar el PR49 a ready y dejar el prompt del revisor. Con un fallo, diagnosticar con el log; una corrección de fuentes obliga a repetir lo afectado.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

Con XL-06 y el gate integrado en verde, Junie hace el control de avance de T-040…T-045 (contratos, evidencia y hallazgos a BACKLOG) y pasa el PR único de S-107 a revisión independiente. Tras MERGED y el veredicto del dueño, M3 queda cumplida: conciliar `done` en las seis tareas y tomar [T-046](T-046-render-image.md). Si el dueño no acepta, vuelve a frontera con los hallazgos.
