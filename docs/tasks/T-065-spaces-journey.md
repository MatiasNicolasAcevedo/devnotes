---
id: T-065
status: in_progress
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-064]
branch: codex/t-065-spaces-journey
role: implementer
executor: frontier
pr: null
---

# T-065 · Recorrido dirigido de espacios y respaldo

## Objetivo

Demostrar integración de dos espacios con API/DB/OIDC reales y evidencia desktop/mobile.

Draft **solo por dependencias**: T-064 MERGED y conciliada. Contrato completo en S-109; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

E2E nuevo prefijo `spaces:` y dos actores: diario/versiones/ref/voz texto/navegación/backups. Proveedor/micrófono ficticios si se transcribe; no Groq real. Conservar suites históricas y adaptar helpers space. Guía Android real al dueño sin inventar aceptación.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [client/AGENTS](../../client/AGENTS.md).
4. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
5. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`e2e/tests/spaces.spec.ts`, helpers/fixtures necesarios y `portability.spec.ts` si comparte setup; bitácora. No mocks de API propia ni FULL.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

SP-01…10 integrados en recorridos pequeños: misma fecha dos espacios/reload, no cruces @/historial/voz, guardias/carreras, roundtrip v2/v1 y segundo actor denegado. Capturas ficticias en anchos; teclado Android real pendiente del dueño identificado.

Desde raíz, Git Bash con Docker Linux y Node >=24:

```bash
STARTER_E2E_PROJECT=starter-e2e-t065-desktop bash scripts/e2e.sh --grep 'spaces:' --project desktop
```

Raíz, Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t065-mobile bash scripts/e2e.sh --grep 'spaces:' --project mobile`. Filtro con cero tests seleccionados no es éxito.

Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

2026-11-14 · Frontera implementer en Codex Desktop, GPT-6 (variante/esfuerzo no expuestos), PowerShell, Git, gh, Git Bash, Node 24.21.0 y Docker Desktop Linux. Worktree propio `.orchestrator/t-065` sobre main publicado `dc18096cc25e53f07212143c3b62558c416fffd2`. PR67 MERGED y conciliada en T-064. Sin PR abierto al tomar la tarea. El cambio cubre pruebas y documentación; comportamiento, API, permisos, datos y UI de producto se ejercitan con fixtures.

**FULL/STARTER DIFERIDO POR EL DUEÑO.**

Playwright en curso sobre `184945a4535ba06798bb08c000bf017975ce4b5d`, base `dc18096cc25e53f07212143c3b62558c416fffd2`. Usar los dos comandos de Aceptación con los namespaces exactos. Regresión adicional: `STARTER_E2E_PROJECT=starter-e2e-t065-regression bash scripts/e2e.sh --grep 'private reference CRUD|portability: A exports' --project desktop`. JUnit y capturas de fixtures bajo `e2e/artifacts/<namespace>/sanitized/`. Verificar contenedores (incluidos detenidos), redes y volúmenes con `label=com.docker.compose.project=<namespace>` antes y después. Siguiente acción: confirmar casos, corregir fallos y cerrar checks.

Complemento SP-02 y SP-09. En `server/` con Git Bash y JDK 21, `./mvnw -o -B -q verify -Dtest=PrivateSpaceTest -Dit.test=PrivateSpaceMigrationIT,PortabilityImportServiceIT -Djacoco.skip=true` sobre el backend de la base. Exit 0 con 10 unitarios y 22 IT, cero omitidos. SP-02 comprobó el upgrade de V6 poblada a V7 con las cuatro colecciones y los datos originales intactos. Los IT de importación cubrieron ambos órdenes de la carrera en cada espacio. Cleanup por IDs exactos de los dos PostgreSQL 18.6 y Ryuk, cero restantes.

## Bitácora de correcciones

- Primer desktop sobre el blob `ebd8c8cec44f8b49367aa7fd1beb2be394156e08`: exit 1, 10 casos, 5 fallos y cleanup 0/0/0 por label exacto. Se corrigieron los selectores de búsqueda y de error de importación, la lectura del detalle de voz y el acceso por Tab en ambos layouts. JUnit saneado en `e2e/artifacts/t065-desktop-first-sanitized/`. Se agregó el caso de respuesta de transcripción real retenida con CDP y micrófono/proveedor sintéticos.
- Primer arranque Maven: PowerShell separó `.skip=true` y Maven salió 1 antes de crear recursos. Se pasó el comando completo a Git Bash con `-c` y el dirigido quedó verde con 10/10 unitarios y 22/22 IT (migración 1, importación 21). Cleanup de Testcontainers por IDs exactos de los dos PostgreSQL y Ryuk: cero restantes.

- Desktop, mobile y regresión sobre `184945a` salieron 1 sin ejecutar casos. La imagen propia con `playwright test --list --reporter=list` reprodujo el fallo: Playwright exige declarar `launchOptions` a nivel de archivo porque cambia el worker. Se movió la opción del dispositivo sintético al nivel del spec; los demás casos no solicitan micrófono. Cleanup de los tres namespaces por label exacto: 0/0/0.

## Comprobación del dueño en Android físico

Pendiente de aceptación. Usar un entorno de prueba con este SHA, dos espacios y una cuenta ficticia. Registrar modelo, versión de Android, navegador, teclado, orientación, SHA y resultado por paso. Si se reproduce un problema, anotar la acción y el resultado esperado/observado. Adjuntar solo capturas con datos ficticios y la identidad tapada.

1. En vertical, abrir Notas. Verificar selector con texto e ícono, etiquetas de los cuatro destinos y acceso a Datos desde Cuenta. Cambiar entre Trabajo y Personal y confirmar que la fecha se conserve y que cada espacio muestre su propia nota.
2. Con el teclado real abierto, escribir varias líneas, mover el cursor al final, agregar un enlace y guardar una versión. Comprobar que el cursor, los avisos y las acciones de confirmación queden alcanzables sin que la cabecera, la barra inferior o el teclado los tapen. Repetir en horizontal y con el teclado cerrado.
3. En Voz, escribir un borrador y cambiar de espacio. Probar «Seguir aquí» y luego «Guardar y cambiar». Comprobar que el texto quede guardado solo en el espacio de origen.
4. Con el zoom nativo del navegador al 200 %, repetir el cambio de espacio, la navegación y la edición con el teclado abierto y cerrado. Comprobar etiquetas, foco, acceso a controles y ausencia de desplazamiento horizontal de la página. Registrar el método de zoom y el resultado.

El ensayo de Render requiere una autorización expresa separada sobre SHA y ventana.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-066 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
