---
id: T-022
status: done
priority: P1
size: S
milestone: M1
spec: S-106
depends_on: [T-021]
branch: codex/t-022-reference-search
role: implementer
executor: junie
pr: 23
---
# T-022 · Búsqueda privada de referencias

## Objetivo

Preparar la búsqueda paginada por título para el selector de `@`, sin agregar UI ni vinculación. Contrato exacto de consulta, coincidencia, límites, privacidad y errores en S-106; mantener el listado existente al omitir `q`. No modificar datos, autenticación, dependencias ni métodos/rutas autorizados. La secuencia continúa con T-023 al verificar MERGED.

## Alcance

El alcance se limita a la búsqueda indicada arriba y al contrato S-106.

## Leer antes

[S-106](../specs/S-106-reference-links.md), [S-003](../specs/S-003-reference-security.md), [server/AGENTS](../../server/AGENTS.md), [TESTING](../TESTING.md) y [implementer](../agents/implementer.md). AGENTS raíz y STATUS son entrada obligatoria.

## Archivos y pasos

Extender controlador/OpenAPI, servicio y repositorio de referencia; añadir pruebas junto a las existentes. Mantener consultas y conteo por dueño, escape literal y paginación en DB. Validar la entrada sin registrar ni reflejar su contenido. No introducir migración ni índice sin evidencia de necesidad.

## Aceptación y pruebas

- PostgreSQL/HTTP con dos identidades ficticias: coincidencias por título y caso, duplicados, paginación/conteo y orden, `q` vacío/ausente, caracteres `%`, `_` y escape literales, máximo y exceso; B no ve resultados ni conteos de A. Mantener 401 y no-store. `cd server && ./mvnw clean verify` con JDK 21 y Docker ejecuta IT Failsafe además de unitarios; no sustituir por `test`.
- Gate final desde raíz, Git Bash y namespaces propios: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t022 STARTER_E2E_PROJECT=starter-e2e-t022 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. Antes comprobar que esos nombres no pertenecen a recursos existentes; registrar SHA/base, huella, log saneado y cleanup en checkpoint. Limpieza solo de esos proyectos; no tocar stack persistente del dueño. Ejecutar docs-check y policy según TESTING antes de publicar.

## Checkpoint vigente

Implementación publicada: búsqueda privada por título con `q` opcional en GET /api/v1/reference-items. Escape literal de `%`, `_`, `!`; límite 120 unidades UTF-16; 400 si excede. Filtrado por `owner_id` en consulta y conteo. HEAD 79fb0bc, base main 8e09525. Backend `clean verify` 154/154 tests OK (Spotless, Surefire, Failsafe PostgreSQL, JaCoCo). PR23 abierto. Revisión independiente sin bloqueantes; corrección documental B-1 (BACKLOG.md + STATUS.md + task status). Pendiente: CI verde sobre HEAD final y merge.

## Correcciones significativas

Registrar aquí causa, corrección y prueba cuando corresponda.

## Cierre y siguiente tarea

Publicar el primer avance en esta rama y un solo PR; revisión independiente y merge según AUTONOMY. Tras comprobar MERGED, continuar con T-023 predefinida. No iniciar voz.
