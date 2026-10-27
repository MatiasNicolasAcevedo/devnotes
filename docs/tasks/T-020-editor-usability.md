---
id: T-020
status: in_review
priority: P1
size: M
milestone: M1
spec: null
depends_on: [T-014]
branch: codex/t-020-editor-usability
role: implementer
executor: frontier
pr: null
---
# T-020 · Editor, navegación por fecha y versiones

## Objetivo y contrato

Solicitud del dueño del 2026-10-25: oscuro global, editor alto y redimensionable verticalmente, líneas compactas/números legibles, botón Agregar/Editar enlace, Ctrl+K y apertura segura por clic. Ampliación expresa del 2026-10-26 en sesión nueva: corregir coherencia entre ruta/selector/coordinador/contenido/revisión/versión; conservar borrador ante fallos de navegación; reparar preparación OIDC de dos actores y recorridos de versiones con guardados comprobados; completar FULL y publicar la misma tarea. No iniciar otra tarea ni voz.

Una fecha seleccionada, directa, recargada o abierta con Hoy corresponde al mismo documento. Dos fechas conservan textos/revisiones/copias independientes. Cambiar fecha o salir espera flush; fallo conserva fecha/texto. Atrás/adelante conserva el borrador sobre las páginas, con retorno/reintento/descarte explícito. Cargar vacío o hidratar no escribe ni borra edición local. Guardar versión copia el último ACK, una sola copia reemplazable por fecha, historial readonly y aislamiento por propietario.

Conservar OIDC/sesión/CSRF, autorización, esquema y formato persistido, dependencias/wrappers/locks, umbrales, assertions, retries y deadlines. Sin producción, Google real, datos reales ni stack persistente del dueño. `scripts/e2e.sh` contiene dos líneas wslpath previas ajenas: preservar, excluir de staging/publicación; Git Bash usa la rama cygpath de main. Kit plantilla/ nunca se versiona/copia/borra. PR documental #6 OPEN impide otro PR; no modificarlo por T-020. Revisión/merge solo en sesión independiente; sin done antes de MERGED.

## Referencias y ejecución

- [Contrato de notas](../specs/S-101-daily-notes.md), [enlaces](../specs/S-102-text-links.md) y [versiones](../specs/S-104-daily-versions.md).
- [AGENTS client](../../client/AGENTS.md), [AGENTS server](../../server/AGENTS.md), [implementer](../agents/implementer.md), [TESTING](../TESTING.md), [AUTONOMY](../AUTONOMY.md).
- [Editor](../../client/src/features/daily/editor/DailyEditor.tsx), [workspace de navegación](../../client/src/features/daily/DailyDraftNavigation.tsx), [controlador de versiones](../../server/src/main/java/com/example/devnotes/daily/web/DailyVersionController.java).

Retoma: implementer Codex desktop, modelo GPT-6 según identidad expuesta, esfuerzo no expuesto; PowerShell/Git Bash, git/gh, Docker, Node 24 y Context7 Tiptap. Sin delegación ni ejecución Junie. AGENTS raíz/client/server y protocolo leídos. La sesión anterior usó también frontend-design. Impacto en UI/navegación y corrección de la serialización al contrato HTTP existente; sin cambios de esquema, seguridad ni dependencias. Rama, HEAD/main/origin/main iniciales `9da4ab4f138bd28753e61d1538003acceb615691`, fetch verificado. PR #19/T-014 MERGED conciliado; PR #6 comprobado OPEN. Cambios locales anteriores conservados.

## Aceptación y pruebas

| Criterio | Evidencia pertinente |
|---|---|
| Oscuro, editor 360+ px/resize, compactación, números y layout 375 | CA-01 y T-020 reales, desktop/móvil en FULL |
| Botón/Ctrl+K, editar/quitar sin cambiar texto, clic seguro; readonly | DailyEditor/LinkDialog y CA-02/T-020 reales |
| Fecha/ruta/editor/revisión coherentes, vacío sin escrituras, hidratación sin autosave | DailyNotesPage/useDailyNote/DailyDraftNavigation y E2E de URL/recarga/Hoy/CA-04 |
| Flush antes de navegar, fallo/atrás retienen texto, descarte explícito | DailyDraftNavigation y cola de useDailyNote |
| Copia creada/reemplazada, trabajo independiente, recuperación y JSON válido | DailyVersionApiIT PostgreSQL, SaveDailyVersion y CA-04/05 reales |
| Sesiones A/B simultáneas, dueños aislados y logout/cambio limpian UI | Helpers interactivos existentes compartidos, CA-06 reales, suites de sesión/HTTP conservadas |
| Cierre | FULL sin opciones; docs-check y huella/base iguales; cleanup por labels; publicación sin segundo PR |

## Checkpoint vigente

2026-10-27 · selección corregida y recorrido dirigido real desktop/móvil **2/2 OK**, exit 0 (`t020-selection-e2e.log`), cleanup por labels completado. FULL 4 de cierre **verde**, exit 0; publicación de código en preparación, sin commit/push todavía. HEAD/base/main/origin/main `9da4ab4f138bd28753e61d1538003acceb615691`, fetch de retoma confirmado; PR #6 sigue OPEN. No modificarlo ni abrir otro PR.

Fuentes cerradas con huella técnica **`2564340fbca4de56a68cee6e8a19428d6f044673`** (`t020-full4-source-before.log`). Método: rutas únicas ordenadas de `git ls-files --cached --others --exclude-standard -- client/src server/src e2e/tests e2e/fixtures`; blobs con `git hash-object --stdin-paths`; pares ruta/blob con `git hash-object --stdin`. Incluye archivos nuevos. Huella antes/después idéntica, conservada en t020-full4-source-before.log y t020-full4-source-after.log. Desde FULL 3 solo cambió el paso/assertions de selección del caso E2E, comprobado en ambos tamaños. Fuentes congeladas durante el gate.

Comando exacto, Git Bash Windows:
```bash
COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t020-final-1027 STARTER_E2E_PROJECT=starter-e2e-t020-final-1027 STARTER_SERVER_TESTS=container bash scripts/verify.sh > t020-full4-resume.log 2>&1
```

Ambos namespaces nuevos estaban vacíos al inicio. Solo fixtures ficticias. Cleanup completado: trap E2E estricto y después `docker compose --env-file .env.example -p starter-verify-t020-final-1027 --profile verify down --volumes --remove-orphans`; contenedores/redes/volúmenes de ambos proyectos comprobados vacíos por labels exactos. Todos los namespaces previos y el dirigido selection-1027 quedaron vacíos; no operar recursos ajenos.

Siguiente paso: confirmar todas las fases/exit, huella y cleanup; docs-check/diff completo; staging explícito excluyendo scripts/e2e.sh y plantilla, guardas y footer Refs; publicar código y después cerrar documentación. Si vuelve un bloqueo no resuelto dentro de los límites, checkpoint sin publicar. Revisión/merge en sesión independiente y dependencia operativa #6.
## Bitácora de correcciones significativas

| Problema / causa | Corrección | Rojo/verde y evidencia |
|---|---|---|
| Tema claro y números recortados, márgenes entre párrafos | Oscuro global, padding/gutter visible, líneas compactas y resize | Rojo UI 3 fallos (`t020-red.log`); 45 dirigidos previos y geometría real OK |
| Botón ausente, cursor en link no reconocido y URL anterior al reabrir | Selección conservada, extendMarkRange, reset del diálogo y clic seguro | Componentes y T-020 real OK; `t020-final-directed.log` |
| Contenido remoto tardío no aparecía; hidratar emitía cambios | Hidratar contenido validado con emitUpdate=false | Rojo previo (`t020-hydration-red.log`) y recuperación real OK |
| Cambiar readonly emitía ediciones; ACK enlazado colapsaba selección por orden de claves JSON | setEditable sin update, igualdad estructural ProseMirror; foco tras transición modal | Rojos 2 callbacks y selección vacía (`t020-lock-red.log`, `t020-ack-focused-red.log`); 29 editor/diálogo OK (`t020-ack-focus-green.log`) |
| Selector cambiaba provider sin ruta; contenido/revisión pasaban a otra fecha | Workspace por identidad sobre shell, coordinador reiniciado por fecha, ruta ISO local y flush previo | Rojo 2/26 (`t020-resume-red.log`); dirigidos y E2E vacío/URL/recarga/Hoy OK en ensayo parcial |
| Guardar versión capturaba revisión anterior a flush | Getter síncrono del último ACK; vacío solo por acción manual | Rojo revisión 4 frente a 5 (`t020-version-revision-red.log`); integración verde; 17 cola/hidratación/vacío OK (`t020-hydration-force-green.log`) |
| Historial 404 aparecía como error genérico | Sin versión guardada, volver y reintento conservado | Rojo (`t020-history-empty-red.log`); DailyHistoryPage verde |
| JsonNode Jackson2 de versión serializado como bean por Jackson3 | Misma conversión de JSON nativo que DailyNoteController; contrato HTTP preservado | POST/GET: 2 fallos/21 OK (`t020-version-api-red.log`); 23/23 PostgreSQL OK (`t020-version-api-green.log`) |
| CA-06 reiniciaba backend entre actores; versiones ignoraban errores y usaban fecha notes | Login interactivo existente compartido + readiness; sesiones simultáneas; UI y status/body explícitos, sin fallback/errores ignorados | Ensayo real rojo preservado; CA-04/05/06 desktop y móvil OK en FULL final |
| Wrapper de autenticación remontaba también banner del shell | Wrapper estable; solo estado privado reiniciado por owner | FULL 1: 11 fallos; 33/33 dirigidos sesión/navegación/página (`t020-session-shell-green.log`), assertions de AuthSession intactas |
| CA-05 escribía tras cancelar con selección/foco del diálogo | Esperar cierre/foco, clic real en párrafo y comprobar cursor colapsado/dos párrafos; comprobar ACK antes de recarga | Rojo real preservado; dirigido 2/2 y FULL final 35/35; rechazo/literalidad/recuperación y texto previo comprobados |
| Fixtures de backend anteriores: WebMvcTest sin servicios diarios y migración aún V3 | MockitoBean de servicios del slice y expectativa exacta V1…V4, checksum conservado | Rojos previos FULL 1/2; backend final 297 OK en ambos FULL de retoma |
| Formato previo y tres any de separadores | Prettier/Spotless del proyecto y tipos Transaction/nodos | Lint/formato/separadores conservados; sin cambios lógicos de backend de formato |

## Validación y operaciones

| Operación | Resultado real / log local ignorado |
|---|---|
| Sesión anterior a ampliación | Backend 297 y client 320 verdes; 9 desktop OK, FULL incompleto/fallido (`t020-full-complete.log`), sin publicación |
| Dirigidos iniciales de retoma | 71/71 en 6 archivos, typecheck/lint OK (`t020-directed-resume-3.log`) |
| Editor/diálogo después de foco y ACK | `cd client && npm test -- --run src/features/daily/editor/DailyEditor.test.tsx src/features/daily/editor/LinkDialog.test.tsx`: 29/29 OK |
| Cola/hidratación/vacío explícito | `cd client && npm test -- --run src/features/daily/useDailyNote.test.tsx`: 17/17 OK |
| PostgreSQL dirigido | `docker compose --env-file .env.example -p starter-verify-t020-r2-1026 --profile verify run --rm server-tests ./mvnw -B -ntp spotless:apply -Dtest=DailyVersionApiIT test`: 23/23 OK; selección explícita de IT en Surefire, no sustituye clean verify/FULL |
| Sesión y navegación tras regresión de shell | `cd client && npm test -- --run src/features/auth/AuthSession.test.tsx src/features/daily/DailyDraftNavigation.test.tsx src/features/daily/DailyNotesPage.test.tsx`: 33/33 OK |
| Ensayo E2E parcial de retoma | verify --e2e, namespaces r1; 9 desktop OK/6 fallidos antes de detener solo runner propio `c2a6740bf381`; exit 143, controlador/trap limpiaron todo (`t020-e2e-resume.log`). No gate verde |
| FULL 1 de retoma | Namespaces full; docs/backend 153+144/Spotless/JaCoCo OK; client 320 OK/11 AuthSession fallidos; E2E no ejecutada (`t020-full-resume.log`) |
| FULL 2 de retoma | Namespaces full2; docs/backend 153+144/Spotless/JaCoCo OK; client 328 OK/3 timeouts 5000 ms en referencia; E2E no ejecutada (`t020-full2-resume.log`) |
| Diagnóstico de timeouts | Referencia host aislada 16/16 OK (`t020-reference-diagnostic.log`). Docker: 12 CPU, loadavg 2.65/4.05/3.76, 11.77 GB libres; no prueba de saturación ni causa resuelta. Ningún cambio de referencia/limits/retries |
| Cliente completo discriminante | `docker run --rm --network none --name starter-verify-t020-clientdiag-1026 --label com.docker.compose.project=starter-verify-t020-clientdiag-1026 starter-verify-t020-full2-1026-client-tests npm run verify`: exit 0, 331/331, statements 89.82%, branches 84.56%, typecheck/lint/formato/build (`t020-client-diagnostic.log`). Misma imagen/huella; evidencia nueva para último FULL |
| FULL 4 integral | **Exit 0**: docs 6 s; backend 438 s, 153 unitarias/slices + 144 IT PostgreSQL, Spotless/JaCoCo OK; client 80 s, 331/331, typecheck/lint/formato/cobertura/build; E2E 1000 s, **35/35** (18 desktop + 17 móvil), sin retries/casos omitidos, saneador OK; cleanup E2E y verify comprobado (`t020-full4-resume.log`). Huella/base válidas |
| FULL 3 integral | Docs/backend 297/client 331 OK; E2E 34/35 (todo móvil y fechas/identidades/versiones OK), un fallo de selección del caso HTML en escritorio; exit 1, saneador y cleanup E2E completados (`t020-full3-resume.log`) |

Los comandos, logs, SHA/base y cleanup se conservan en esta tarea. FULL 4 conserva fuentes/base; el cierre Markdown posterior no requiere repetir FULL si estas coinciden. Cobertura client final: statements 89.82%, branches 84.56%, líneas 91.75%, umbrales conservados. Los intentos previos no sustituyen la validación final.


### Retoma 2026-10-27 · selección del caso HTML

Único fallo FULL 3: al volver del diálogo se conservó la selección de No ejecutar; el End/Enter rápido no estableció un cursor antes de escribir y el ACK mostró solo el HTML literal. Corrección acotada de la interacción: clic real en el párrafo, comprobar selección colapsada, Enter y comprobar dos párrafos y el texto previo antes de añadir HTML. Se conservan rechazo de javascript, ausencia de script DOM, status/body del ACK y recuperación tras recarga. Sin cambio de aplicación, timeouts/retries ni assertions rebajadas.

Operación dirigida sobre HEAD/base 9da4ab4: `bash e2e/artifacts/t020-selection-run.sh > t020-selection-e2e.log 2>&1`, Git Bash Windows. Harness ignorado que usa scripts/lib/isolated-auth.sh, las mismas imágenes/fixtures, readiness, saneador y cleanup; copia ignorada del controlador run-e2e.mjs cambiando solo los argumentos Playwright a `daily-notes.spec.ts --grep 'CA-05: javascript:'` (desktop y móvil), sin alterar tooling versionado ni scripts/e2e.sh ajeno. Namespace nuevo starter-e2e-t020-selection-1027 comprobado vacío, datos ficticios, trap down --volumes --remove-orphans y labels vacíos. Antes de arrancar: retirar verify full3 propio. Siguiente paso: si pasan los dos recorridos, cerrar fuentes y ejecutar FULL sin opciones con nueva huella/namespaces; si este bloqueo no se resuelve en esta corrección, checkpoint al dueño según límite de intentos.

## Entrega y siguiente responsable

Sin publicación ni veredicto propio todavía. Completar gate y cleanup; publicar rama por push normal si pasa. PR #6 es dependencia operativa: no cerrar/modificar ni abrir otro PR. El dueño/responsable de esa dependencia y una sesión independiente preparan el PR/revisión de T-020 cuando WIP lo permita. No marcar done ni iniciar voz u otra tarea en esta sesión.
