---
id: T-065
status: draft
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-064]
branch: codex/t-065-spaces-journey
role: implementer
executor: junie
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

Plan preparado en T-052 el 2026-11-12; sin implementación ni tests ejecutados. Al tomar la tarea, registrar SHA/base, comandos, resultados y pendientes. Antes de operación larga: checkpoint con recursos propios y cleanup; comprobar que los nombres E2E de los comandos estén ausentes y limpiar solo por labels del harness. Nunca usar el stack persistente del dueño ni instalar herramientas globales.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-066 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
