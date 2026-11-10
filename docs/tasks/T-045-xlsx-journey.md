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
| Gate integrado de S-107 | FULL sobre el HEAD final de la rama; añadir `--tooling` si el diff acumulado desde `c5e37cc4b73ad038ac35edf29c66131416bb4a34` es STARTER según `--policy` | `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t045 STARTER_E2E_PROJECT=starter-e2e-t045 STARTER_SERVER_TESTS=container bash scripts/verify.sh` | Exit 0, incluidas todas las suites E2E previas |
| Dueño | Manual | Exportar en su cuenta y luego importar en una cuenta vacía | Veredicto explícito del dueño con SHA |

## Checkpoint vigente

`draft` por dependencia. Contrato completo (frontera, 2026-11-10).

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

Con XL-06 y el gate integrado en verde, Junie hace el control de avance de T-040…T-045 (contratos, evidencia y hallazgos a BACKLOG) y pasa el PR único de S-107 a revisión independiente. Tras MERGED y el veredicto del dueño, M3 queda cumplida: conciliar `done` en las seis tareas y tomar [T-046](T-046-render-image.md). Si el dueño no acepta, vuelve a frontera con los hallazgos.
