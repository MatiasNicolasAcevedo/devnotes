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

**T-045 cerrada en la rama** `codex/s-107-xlsx-portability`, con XL-06 y el gate integrado en verde y el control de avance hecho. Falta la prueba del dueño. El frontmatter sigue en `draft` por la [regla de la rama compartida](../specs/S-107-xlsx-portability.md#tareas-y-dependencias); la portadora es [T-040](T-040-daily-timestamps.md) y el PR es el [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49), listo para revisión independiente.

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

### Gate integrado: verde, en tres corridas sobre las mismas fuentes

Perfil STARTER: docs, backend, cliente, los diez ensayos de tooling y el E2E completo pasaron sobre las mismas fuentes técnicas y la misma base `main` `fc8fda5b20946e595c153144e99d9a3d3346ac5d`. No fue una sola invocación: la primera corrida se cortó en tooling por un puerto ocupado del host y lo que faltaba se ejecutó después, sin repetir lo ya acreditado. Cada log anota HEAD, árbol y cero cambios sin commit al empezar y al terminar.

- **Corrida 1, `--starter`, HEAD `37664e7`** (árbol `88a9606157b91713f724862bced896c261e13c5b`). Comando, desde la raíz con Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t045 STARTER_E2E_PROJECT=starter-e2e-t045 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter`. Es el comando único de la tabla más tooling: `verify.sh` acepta una sola opción y `--starter` ejecuta docs, backend, cliente, tooling y E2E, que [TESTING](../TESTING.md#frecuencia-y-alcance-del-gate) da por equivalente a FULL más `--tooling`. De 2026-11-10T23:43:52Z a 2026-11-11T00:30:34Z, **exit 1** por tooling. Log local `.orchestrator/t045/starter-gate.log`, SHA-256 `8597d92ecfe23885962d3df63e8ee3c7c2070c27daeb8f644f2fdc9f959b0c1b`.
  - docs 7 s, OK. Backend 592 s, OK: Surefire 425/425, Failsafe 234/234 con PostgreSQL, JaCoCo, Spotless y BUILD SUCCESS. Cliente 142 s, OK: typecheck, lint, formato, 42 archivos y 593/593 con 88,33 % de statements, 83,01 % de branches y 91,21 % de líneas, y build.
  - Tooling 2061 s. En exit 0: `probe-dev-stack.test.mjs`, `test-init-project.mjs`, `test-init-copy.sh` (648 s), `test-local-guards.sh`, `test-dev-stack.sh nginx` (300 s), `test-dev-stack.sh vite` (319 s), `test-dev-stack-failures.sh` (600 s) y `test-local-copy.sh` (139 s). `test-auth-proxies-signals.sh` terminó en exit 1 y `test-auth-proxies.sh` no llegó a ejecutarse. E2E no ejecutada por el fallo previo.
- **Corrida 2, E2E del gate, HEAD `37664e7`.** El mismo entorno con `bash scripts/verify.sh --e2e`, de 2026-11-11T00:31:59Z a 00:53:41Z, **exit 0**, 1302 s: 47 aprobados y ninguno fallado, 24 en desktop y 23 en mobile, incluidos los dos `portability:` y las suites previas de auth, system, daily, versiones, ergonomía, referencia, vista previa, voz y Swagger. Log local `.orchestrator/t045/e2e-gate.log`, SHA-256 `634c097237412cf76ffaaf39821878560e147e31c9a24cd5646f7d08df7c760a`.
- **Corrida 3, los dos ensayos de proxies, HEAD `628e787`** (árbol `a3a58f1a0636c924326e1d21264fadc2675e02e3`). `git diff --name-only 37664e7 628e787` lista solo `docs/STATUS.md` y esta tarea, así que las fuentes técnicas son las de las corridas 1 y 2. Con el puerto libre, desde la raíz: `bash scripts/test-auth-proxies-signals.sh` **exit 0** en 28 s (`Proxy SIGTERM: exit=143`, recursos 0/0/0) y `bash scripts/test-auth-proxies.sh` **exit 0** en 164 s (`Proxy contract passed`). De 2026-11-11T01:01:37Z a 01:04:49Z. Log local `.orchestrator/t045/tooling-proxies.log`, SHA-256 `969ae4d5564a21d2f48d67b5bca1a0802dd50c9b8e2bcc1699df5f7ee0986efc`.
- **Cleanup.** Los scripts retiraron sus stacks. Quedaban `starter-verify-t045_default` y `starter-verify-t045_m2-cache`, retirados tras cotejar el label `com.docker.compose.project=starter-verify-t045`. Los proyectos `starter-verify-t045`, `starter-e2e-t045` y `starter-e2e-t045-iter` y los `starter-auth-proxy-*` y `starter-portability-proxy-*` de los ensayos quedaron con cero contenedores, volúmenes y redes. El stack `starter-dev-devnotes-preview-1027` lo detuvo el dueño; esta sesión no lo detuvo, inició ni modificó. No se tocaron ramas, worktrees ni archivos existentes de `.orchestrator`; solo se agregó `.orchestrator/t045/`.
- **Límite de la evidencia.** El cierre documental posterior cambia solo Markdown: conserva el gate según [TESTING](../TESTING.md#cuándo-ejecutar-full) mientras `git diff --name-only 37664e7 HEAD` no liste fuentes técnicas.

### Control de avance de T-040…T-045

Hecho por esta sesión antes de pedir la revisión, sobre los contratos, los checkpoints y el log del gate. Las cifras por criterio salen de la corrida 1 (backend y cliente) y de la corrida 2 (E2E).

| Tarea | Criterio | Evidencia en el gate integrado | Contrato |
|---|---|---|---|
| [T-040](T-040-daily-timestamps.md) | XL-01 | `DailyNoteServiceTest` 2/2 y `DailyVersionServiceTest` 2/2; rojo previo registrado en su tarea | Cumplido, dentro de los archivos previstos |
| [T-041](T-041-xlsx-codec.md) | XL-02 | `XlsxTextTest` 9, `XlsxWorkbookRoundTripTest` 12, `XlsxWorkbookReaderTest` 137 y `XlsxZipInspectionTest` 29: 187/187 | Cumplido; dependencias y licencias en DEPENDENCIES |
| [T-042](T-042-xlsx-export-api.md) | XL-03 | `PortabilityExportApiIT` 5/5 y `PortabilityExportServiceTest` 1/1 | Cumplido |
| [T-043](T-043-xlsx-import-api.md) | XL-04 y proxies | `PortabilityImportApiIT` 7/7 y `PortabilityImportServiceIT` 12/12. Ensayo de proxies repetido sobre las fuentes finales: `node scripts/test-portability-proxies.mjs` exit 0 con el puerto por defecto (`.orchestrator/t045/portability-proxies.log`) | Cumplido |
| [T-044](T-044-xlsx-client.md) | XL-05 | `api.test.ts` 41, `DataPage.test.tsx` 31, `AppRoutes.test.tsx` 9 y `http.test.ts` 27 | Cumplido; toca además `services/http.ts`, justificado en su checkpoint por la regla del cliente HTTP único |
| T-045 | XL-06 | `portability:` aprobado en desktop y en mobile, en la iteración y dentro del E2E completo | Cumplido salvo la prueba del dueño |

- Cobertura: JaCoCo `check` en verde con los umbrales del POM y cobertura del cliente por encima de sus umbrales; ningún umbral, retry ni deadline cambió en la rama.
- Alcance: el diff acumulado desde `c5e37cc` no tiene migraciones ni cambios de esquema, y las dependencias nuevas son solo las tres de T-041. `git ls-files -- plantilla` vacío.
- Estados: T-041…T-045 conservan `draft` y `pr: null` por la regla de la rama compartida; T-040 pasa a `in_review` con el PR49. Las seis se concilian `done` juntas tras el MERGED.
- Desvíos aceptados dentro del contrato: el gate en tres corridas (arriba) y `--starter` en lugar de dos invocaciones.
- Hallazgos fuera de alcance, sin bloquear la revisión, registrados en [BACKLOG](../BACKLOG.md#hallazgos-del-control-de-s-107): puertos fijos de los ensayos de proxies, ensayo de proxies de portabilidad fuera de `verify-tooling.sh`, rutas de portabilidad sin caso en `OpenApiContractIT` y comandos dirigidos con `-Dtest=none` que terminan en exit 1 por JaCoCo.

### Prueba del dueño

**Pendiente.** La hace el dueño en su entorno, sobre el SHA del PR49: exportar su cuenta, abrir el archivo en Excel para leerlo e importarlo en una segunda cuenta vacía de su instancia local o en un stack descartable propio. Aquí se registra solo «OK/observaciones», conteos y SHA; ningún agente abre ni copia el archivo.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-11 · `37664e7` | El gate `--starter` se cortó en `test-auth-proxies-signals.sh`: los ensayos de proxies publican `127.0.0.1:5175` y ese puerto lo ocupaba el stack del dueño `starter-dev-devnotes-preview-1027`. Reproducido aislado con `Bind for 127.0.0.1:5175 failed: port is already allocated`. No es un defecto de las fuentes. | Sin cambio de fuentes. El dueño detuvo su stack y se corrieron solo el E2E y los dos ensayos pendientes sobre las mismas fuentes. | Corridas 2 y 3 del gate, exit 0 |

## Cierre y siguiente tarea

Con XL-06 y el gate integrado en verde, Junie hace el control de avance de T-040…T-045 (contratos, evidencia y hallazgos a BACKLOG) y pasa el PR único de S-107 a revisión independiente. Tras MERGED y el veredicto del dueño, M3 queda cumplida: conciliar `done` en las seis tareas y tomar [T-046](T-046-render-image.md). Si el dueño no acepta, vuelve a frontera con los hallazgos.
