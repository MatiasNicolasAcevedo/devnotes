---
id: T-047
status: in_progress
priority: P1
size: S
executor: frontier
role: implementer
milestone: M4
product_cycle: I4
spec: S-108
spec_version: 1
branch: codex/t-047-render-first-deploy
pr: 53
depends_on: [T-046]
---
# T-047 · Primer deploy en Render, migración de datos y aceptación del dueño

## Objetivo

DevNotes funciona en la URL HTTPS de Render con Google real y los datos locales del dueño importados, cumpliendo RP-03 y RP-04 de [S-108](../specs/S-108-render-pilot.md). Es el cierre del plan del 2026-11-10. Después, frontera recibe los hallazgos.

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
2. El dueño ejecuta RP-03, incluido Chrome instalado como app, y RP-04. Si usa la misma cuenta para ambos, verifica el login y completa la importación en la cuenta vacía antes de guardar la nota ficticia de RP-03. Con una cuenta de prueba distinta para RP-03, puede conservar el orden original.
3. Registrar el SHA desplegado, el tiempo de arranque en frío, la RAM según las métricas de Render, los resultados y el veredicto del dueño. Publicar un PR documental.

## Aceptación y pruebas

| Criterio | Capa | Acción | Resultado |
|---|---|---|---|
| RP-03 | Manual del dueño | Login con Google, guardar una nota, reiniciar el servicio y reabrirla | OK con SHA |
| RP-04 | Manual del dueño | Importar el `.xlsx` local en Render y luego reimportar | Datos visibles; 409 al reimportar |
| Documentación | DOCS_ONLY | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | OK |

## Checkpoint vigente

**2026-11-11 · Frontera con el dueño.** Codex de escritorio, familia GPT-6, variante y esfuerzo no expuestos. Git, `gh`, PowerShell, Git Bash, Node y documentación oficial de Render. El avance es documental y operativo, sin cambios de código, API, permisos de la aplicación, esquema ni UI.

[T-046](T-046-render-image.md#checkpoint-vigente) está conciliada como `done`. `main` y `origin/main` apuntaban a `222ae003f5db5fc887929ca98f9405ae67bd4d09` al crear la rama; ese es el SHA objetivo del deploy. El dueño autorizó la creación de PostgreSQL 18 Free en su workspace personal y luego la creación y configuración del Web Service. Los dos recursos y el primer intento están registrados en [DEPLOYMENT](../DEPLOYMENT.md#avance-del-piloto).

Por pedido del dueño se agregó el MCP oficial de Render con `codex mcp add render --url https://mcp.render.com/mcp --oauth-client-id codex`. El dueño completó OAuth y reinició Codex. `codex mcp list --json` confirmó `render` habilitado y `auth_status=o_auth`. `list_workspaces` respondió desde esta sesión y el dueño confirmó el workspace personal como destino de los recursos del piloto. El health check se guardó desde el panel web y se confirmó con `get_service`.

El dueño confirmó login con Google real en Brave, omitió RP-04 en Render para empezar con notas propias y confirmó que una nota diaria mostró «Guardado». Autorizó el reinicio de `devnotes-pilot`. [DEPLOYMENT](../DEPLOYMENT.md#avance-del-piloto) conserva SHA, RAM antes del reinicio, evento `server_restarted`, nueva instancia y readiness público `200` con `UP`. El dueño volvió a iniciar sesión, abrió la nota anterior y aprobó esta etapa del piloto. Queda pendiente medir el despertar por inactividad cuando el dueño pueda cerrar las ventanas de DevNotes. La siguiente tarea agrupada es [T-051](T-051-render-follow-up.md), tras MERGED de T-047.

Comprobación del avance `3503f0d28550a4f70458822cdb31406d45c0748e` contra la base `222ae003f5db5fc887929ca98f9405ae67bd4d09`: `node scripts/docs-check.mjs` y `git diff --check` pasaron. Git Bash de Windows ejecutó `bash scripts/verify.sh --policy origin/main` fuera del sandbox porque MSYS devolvió `0xC0000022` dentro. Resultado `DOCS_ONLY` / `DOCUMENTATION`, cinco Markdown. Repetir sobre el HEAD del PR cuando quede registrada la evidencia del piloto.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-11 · `222ae003` | Spring informó que faltaba la URL del datasource. En Environment estaban las dos claves `GOOGLE_CLIENT_*` y faltaban las tres `SPRING_DATASOURCE_*`. | El dueño cargó JDBC interno, usuario y contraseña en `devnotes-pilot`. | [Reensayo por SHA, `live` y readiness `200` con `UP`](../DEPLOYMENT.md#avance-del-piloto). |

## Cierre y siguiente tarea

[PR53 documental](https://github.com/MatiasNicolasAcevedo/devnotes/pull/53) en borrador mientras se mide el despertar por inactividad. Luego pasa a revisión independiente. Tras MERGED, continúa [T-051](T-051-render-follow-up.md) con los ajustes que pidió el dueño.
