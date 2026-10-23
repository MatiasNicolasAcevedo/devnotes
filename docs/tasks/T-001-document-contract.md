---
id: T-001
status: changes_requested
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-101
spec_version: 2
branch: codex/t-001-document-contract
pr: 4
depends_on: [T-000, T-015, T-018]
---
# T-001 · Contrato de contenido estructurado

## Objetivo

Contrato de contenido estructurado, capacidad S-101 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-002](T-002-daily-persistence.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Crear validador inmutable de JsonNode (Jackson efectivo del POM), sin dependencia nueva. Aceptar únicamente árbol S-101, retornar copia defensiva del JSON válido y excepción de validación segura sin eco de valores. Añadir tabla parametrizada de árboles válidos/inválidos y fronteras; no API, JPA ni UI.

Impacto previsto de implementación: contrato de contenido, sin rutas/permisos nuevos. **Draft solo por T-018 no mergeada/conciliada**: T-000/T-015 y adopción histórica22/22 ya conciliadas, E-01 conservado. La revisión previa descubrió seis regresiones del tooling al cerrar adopción; [T-018](T-018-docs-fixture-independence.md) contiene causa, contrato y salida. Contratos preparados en su primer avance, sin DailyContent implementado ni PR de planificación separado. Capacidad indispensable ausente o evidencia invalidada deja un pendiente concreto, sin pedir otra aceptación E-01 por rutina.

## Leer antes

1. [AGENTS server](../../server/AGENTS.md).
2. [S-101 v2](../specs/S-101-daily-notes.md).
3. [S-101: contenido/API](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-015](T-015-adoption-checks.md), solo cierre/MERGED ya conciliado; [T-000](T-000-adoption.md) conserva evidencia propia de adopción. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: server/src/main/java/com/example/devnotes/daily/domain/DailyContent.java; DailyContentTest.java bajo server/src/test/java/com/example/devnotes/daily/domain/.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar T-018 MERGED con revisión/gate/CI propios y conciliar done al crear codex/t-001-document-contract desde main actualizado. Comprobar capacidades mínimas y preservar cambios ajenos. T-000/T-015/G-03 y adopción histórica ya conciliados; no reabrirlos ni repetir E-01.
2. Implementar solo este resultado siguiendo spec v2; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

Árbol vacío/texto/marca/separador roundtrip; texto HTML literal válido; límites exactos y +1 (bloques, texto UTF-16, nodos text, href individual/agregado), CR/LF dentro de text, root/keys/nodos/marks extras, widths y href peligroso/relativo se rechazan; entrada no se muta. Comprobar independencia de copia. No confundir normalización equivalente de fragmentos con pérdida de contenido. Los límites de revisión/page son de T-003/T-004, no responsabilidad de DailyContent.

Capa elegida y motivo: Unitario puro del árbol/URL y bordes: no necesita DB ni navegador.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t001-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t001-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
docker compose --env-file .env.example --profile verify run --rm server-tests ./mvnw -B -ntp -Dtest=DailyContentTest test
```

Los dirigidos no acreditan FULL. Cierre previsto **APPLICATION**, por código/tests de aplicación; si diff completo exige STARTER, usar --starter sin rebajar clasificación. Registrar también diff sin commit; --policy solo mira commits.

```bash
bash scripts/verify.sh
docker compose --env-file .env.example -p "$COMPOSE_PROJECT_NAME" --profile verify down --volumes --remove-orphans
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  docker container ls -aq --filter "label=com.docker.compose.project=$project"
  docker network ls -q --filter "label=com.docker.compose.project=$project"
  docker volume ls -q --filter "label=com.docker.compose.project=$project"
done
node scripts/docs-check.mjs
bash scripts/verify.sh --policy origin/main
```

Conservar exit original del gate si se ejecuta cleanup después; si falla cleanup no anunciar verde. Labels deben quedar vacíos; namespaces internos de tooling los limpia su runner y se comprueban en sus logs. Checkpoint antes de gate con SHA/base, comando/log saneado, recursos propios y cleanup; huella técnica antes/después. Bugfix nuevo: primero rojo reproducible y después verde. No necesita rojo previo una nueva capacidad, sí negativos útiles.

## Checkpoint vigente

2026-10-22 (Buenos Aires), Junie implementer, superficie IDE IntelliJ IDEA/AIR. Modelo Qwen3.6-27B-FP8 expuesto. Herramientas usadas: PowerShell, Git/gh, Maven wrapper (JDK 21), Node 24.21.0. Sin instalación, autenticación ni delegación.

Base main/origin/main `7b53ad2ce973787c0e53c9f32f361ef07dafeb11`. T-018 MERGED en PR3 (SHA 7b53ad2, 2026-10-22T19:00:48Z), conciliada done al crear rama.

DailyContent.java y DailyContentTest.java implementados y publicados. HEAD `5a25475` en [PR4](https://github.com/MatiasNicolasAcevedo/devnotes/pull/4) contra main.

Gate APPLICATION: docs ✓ (65 Markdown, 19 tareas, HANDOFF 22/22), server ✓ (75 tests + Spotless + JaCoCo), client ✓ (133 tests + build). E2E no afectado (infraestructura host Node PATH en bash). 60 tests DailyContentTest exit0.

Estado: changes_requested. Revisión independiente completada 2026-10-22: textTotal en DailyContent.java:65 usa codePointCount() en lugar de String.length() para unidades UTF-16 según S-101 v2. Veredicto publicado en [PR4#issuecomment-6354815953](https://github.com/MatiasNicolasAcevedo/devnotes/pull/4#issuecomment-6354815953). Siguiente: sesión nueva Junie implementer corrige la línea 65 a text.length(), añade test con caracteres suplementarios, ejecuta dirigidos y reenvía a revisión.

Árbol inicial limpio, main/origin/main `b52b1fde51194c62c0911f9f0462431508c22f77`. gh confirma PR2 MERGED2026-10-22T00:36:24Z (21/10 21:36:24 Buenos Aires), squashb52b1fd. [APROBADO independiente R1](https://github.com/MatiasNicolasAcevedo/devnotes/pull/2#issuecomment-6329769856), HEAD `8d8f6e5783d2aaf3ea60d2a654ac0636e353ab32` / base `cbbe1c9075a41edf2ceffd35eedf1e05dedd6870`, verify-required SUCCESS [run39700505420](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/39700505420/job/119568294133), [cierre MERGED](https://github.com/MatiasNicolasAcevedo/devnotes/pull/2#issuecomment-6329785413). Sin PR abiertos al consultar. La preparación comenzó en rama propia T-001 vacía; al comprobar el nuevo bloqueo se trasladó sin commits a la rama T-018 y se retiró solo la rama propia T-001 vacía. No hay PR de planificación ni implementación DailyContent.

Impacto de esta preparación: solo Markdown; S-101/S-104 v2, tarea T-016 divide la cola de T-006, tareas existentes precisadas, reconciliación de adopción y nueva intención I2/S-105 con T-017 de frontera futura. No cambia código/API efectiva/permisos/datos/UI/dependencias, ni acredita runtime CA/VO. I1 conserva sus cuatro capacidades y quince tareas; I2 no es dependencia. Evidencia E-01 e inventario Junie aceptados conservados. La retoma y resultados de la preparación se registran ahora en T-018, incluido rojo35 tests/6 fallos de fixtures; esta sesión no cambia scripts ni acredita gate de mantenimiento. T-001 espera T-018 MERGED; después una sesión nueva Junie implementer registra sus capacidades y ejecuta DailyContent v2/gate APPLICATION.

## Correcciones significativas

2026-10-22: revisión independiente solicita corrección en PR4 — textTotal usa codePointCount() en lugar de String.length() para unidades UTF-16 (S-101 v2). Se requiere cambiar DailyContent.java:65 a text.length() y añadir test con caracteres suplementarios. Veredicto en [PR4#issuecomment-6354815953](https://github.com/MatiasNicolasAcevedo/devnotes/pull/4#issuecomment-6354815953). Primera ronda de revisión.

2026-10-21: el dueño inserta T-015 para corregir checks de adopción antes de producto; se añade dependencia y conciliación, sin cambiar aceptación/implementación de DailyContent ni acreditar resultados de T-001.

| Hallazgo de revisión previa del 2026-10-21 | Resolución contractual | Responsable / evidencia prevista |
|---|---|---|
| Estado todavía mergeable pese a PR2 MERGED confirmado | Conciliar T-015 done/G-03/HANDOFF histórico22/22; T-001 espera el nuevo bloqueo T-018 | gh/veredicto/CI y cierre enlazados arriba; docs-check |
| «Script/HTML rechazado» confundía texto literal con nodos ejecutables; roundtrip admitía representaciones equivalentes sin aclararlo | S-101 v2 distingue texto literal/nodos y normalización; paste CRLF/CR definido | T-001 validador y T-005 editor, pruebas de frontera y runtime todavía pendientes |
| Contenido corto podía tener demasiados nodos/marcas; BIGINT de Java no coincide con entero seguro JS | Límites agregados text/href, revisiones seguras y page acotada, sin coerción | T-001/003/004/005/006; límites y +1/overflow |
| T-006 concentraba HTTP/Query/cobertura, cola, generaciones y borrador | T-006 transporte/Query → T-016 cola/provider → T-007 pantalla; cinco/diez/quince tareas tras T-005/009/014 | Contratos/dependencias/tests reasignados, sin quitar negativos |
| Descartar con PUT pendiente o respuesta perdida podía confundirse con rollback; versión desconocida podía omitir confirmación | Esperar escritura, retener borrador/estado incierto; consultar versión antes de POST | T-016/007/013; componentes/MSW y E2E real de conflictos en T-014 |
| Suite documental dependía de adopción21/22 aunque el contrato real22/22 pasa | Nueva T-018 previa: fixtures dueñas de HANDOFF/conteo, sin cambiar reglas/checker | Rojo/corrección/gate y retoma canónicos en T-018; T-001 espera MERGED |
| Voz solicitada todavía no tenía iteración ni separación de las notas diarias | PROJECT_CONTEXT/S-105 draft + T-017 posterior a I1; investigación Groq oficial | Sin audio enviado ni proveedor/configuración acreditados; VO futuros separados de CA |

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-002](T-002-daily-persistence.md).
