---
id: T-047
status: draft
priority: P1
size: S
executor: frontier
role: implementer
milestone: M4
product_cycle: I4
spec: S-108
spec_version: 1
branch: codex/t-047-render-first-deploy
pr: null
depends_on: [T-046]
---
# T-047 · Primer deploy en Render, migración de datos y aceptación del dueño

## Objetivo

DevNotes funciona en la URL HTTPS de Render con Google real y los datos locales del dueño importados, cumpliendo RP-03 y RP-04 de [S-108](../specs/S-108-render-pilot.md). Es el cierre del plan del 2026-11-10. Después, frontera recibe los hallazgos.

Está en `draft` solo porque depende de T-046.

## Alcance y decisiones resueltas

- **Tarea del dueño, guiada por un agente.** Toda acción en Render, Google o GitHub la hace el dueño o requiere su confirmación explícita, una por una. El agente no lee ni imprime secretos, URLs internas con credenciales, cookies ni datos reales.
- **Pasos.** Los de [DEPLOYMENT · Primer deploy](../DEPLOYMENT.md#primer-deploy-y-aceptación-del-dueño), con el SHA de main que contiene T-046. Variables: `SPRING_DATASOURCE_URL` (JDBC interno), `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `APP_PUBLIC_URL` (la URL HTTPS pública), `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`. La voz es opcional (`DEVNOTES_VOICE_ENABLED`, `GROQ_API_KEY`). Perfil `google`, sin `e2e`, sin Swagger y con `DEVNOTES_VOICE_TEST_PROVIDER` ausente o en `false`.
- **Migración.** El dueño exporta su cuenta local (S-107) e importa el archivo en su cuenta recién creada y vacía en Render.
- **Respaldo.** El dueño anota la fecha de creación de la base Free (vence a los 30 días) y planifica exportar antes de esa fecha.

## Leer antes

1. [DEPLOYMENT · Piloto](../DEPLOYMENT.md#piloto-de-devnotes-en-render-free).
2. [S-108](../specs/S-108-render-pilot.md).
3. [AUTONOMY · Reservado al dueño](../AUTONOMY.md#reservado-al-dueño).
4. [T-046 · Checkpoint](T-046-render-image.md#checkpoint-vigente) (métricas locales).

## Archivos y pasos

Solo Markdown: DEPLOYMENT (evidencia del piloto y diagnóstico encontrado), esta tarea, STATUS y BACKLOG si hay hallazgos.

1. El dueño crea la base y el Web Service, y carga las variables. El agente verifica readiness por la URL pública.
2. El dueño ejecuta el recorrido RP-03, incluido Chrome instalado como app, y luego la migración RP-04.
3. Registrar el SHA desplegado, el tiempo de arranque en frío, la RAM según las métricas de Render, los resultados y el veredicto del dueño. Publicar un PR documental.

## Aceptación y pruebas

| Criterio | Capa | Acción | Resultado |
|---|---|---|---|
| RP-03 | Manual del dueño | Login con Google, guardar una nota, reiniciar el servicio y reabrirla | OK con SHA |
| RP-04 | Manual del dueño | Importar el `.xlsx` local en Render y luego reimportar | Datos visibles; 409 al reimportar |
| Documentación | DOCS_ONLY | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | OK |

## Checkpoint vigente

`draft` por dependencia. Contrato completo (frontera, 2026-11-10).

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

PR documental con revisión independiente. Tras MERGED, el plan del 2026-11-10 queda completo y frontera define la siguiente iteración con los hallazgos del dueño.
