---
id: T-099
status: in_review
priority: P1
size: M
milestone: post-M9
spec: null
depends_on: [T-100]
branch: codex/t-099-persistent-google-session
role: implementer
executor: frontier
pr: 101
---

# T-099 · Conservar la sesión de Google en cada dispositivo

## Objetivo

Una persona que vuelve a DevNotes desde el mismo perfil de navegador, incluso después de cerrar el navegador o de que Render reinicie Spring, puede volver a sus notas con la sesión que ya inició. Aplica también a Android. El dueño pidió el 2026-11-24 evitar entradas repetidas cada 30–60 minutos y priorizó que DevNotes estuviera disponible al abrirlo. La configuración operativa del despertador está en [DEPLOYMENT](../DEPLOYMENT.md#despertador-externo-de-devnotes).

Quedó en `draft` solo por orden: el 2026-11-24 el dueño pidió hacer antes los ajustes de [T-100](T-100-flexible-links-nav-order.md). T-100 quedó MERGED (`70729d3`) y [conciliada](T-100-flexible-links-nav-order.md#conciliación); esta tarea pasa a `ready`.

## Alcance y decisiones resueltas

- Guardar la sesión HTTP en PostgreSQL 18 con `spring-boot-starter-session-jdbc`, versión administrada por el BOM de Spring Boot 4.1.1. Usar Flyway para el esquema aditivo y Spring Session para la limpieza automática de expiradas. Una sesión en memoria de la versión anterior podrá requerir un nuevo login en el primer despliegue. La identidad y las notas permanecen en sus tablas existentes. [Configuración de Spring Boot](https://docs.spring.io/spring-boot/reference/web/spring-session.html) y [esquema PostgreSQL de Spring Session](https://docs.spring.io/spring-session/reference/4.1/configuration/jdbc.html).
- Expirar la sesión tras siete días sin actividad autenticada o 30 días desde el último login de ese dispositivo, lo que ocurra primero, y aplicar ambos límites en el servidor. Configurar la cookie persistente por 30 días y renovarla al rotar el identificador en un login válido. Una sonda anónima o descarga estática no prolonga la sesión. Cada dispositivo inicia su propia sesión y puede cerrarla con el POST actual protegido por CSRF. El cierre invalida la fila y la cookie aun cuando se repita el identificador anterior.
- Mantener `JSESSIONID` host-only, `Path=/`, `HttpOnly`, `SameSite=Lax` y `Secure` derivado de `APP_PUBLIC_URL`. Conservar rotación, OIDC de Google, error de callback, CSRF, API, separación por propietario y limpieza de datos privados ante 401/logout.
- Conservar la correlación OIDC hasta el callback, con vida breve y consumo de una sola vez. Persistir para la sesión autenticada solamente el principal local mínimo que requiere la aplicación y su fecha de login. El principal OIDC validado y los tokens Google se usan durante el callback. El repositorio de clientes autorizados no los conserva después, ya que DevNotes no llama APIs de Google. No guardar tokens, claims del proveedor ni credenciales de sesión en el navegador fuera de la cookie de sesión opaca. Excluir sesiones de la portabilidad XLSX y de los logs.
- Mantener el perfil de prueba OIDC ficticio y PostgreSQL real. La verificación en Render y el recorrido con Google real se hacen después de la entrega revisada, con el dueño.

## Leer antes

- [AGENTS de server](../../server/AGENTS.md) y [S-001](../specs/S-001-auth-google.md), en particular las reglas 2, 4–8.
- [ADR 0002](../adr/0002-google-oidc-session-csrf-and-proxy.md) y [configuración de seguridad](../../server/src/main/java/com/example/devnotes/security/SecurityConfig.java).
- [E2E de autenticación](../../e2e/tests/auth.spec.ts), en particular el caso de reinicio y el negativo con una cookie revocada.

## Archivos y pasos

1. Adaptar el E2E de reinicio para esperar la misma sesión después de readiness, conservando la comprobación de identidad y el cambio de cuenta. Mover las aserciones de pérdida de sesión, limpieza de datos y ausencia de redirect en bucle a una sesión expirada o revocada de forma controlada. Demostrar el fallo sobre la base antes de implementar.
2. Agregar la dependencia gestionada, `V10` de Flyway y la configuración de Spring Session JDBC y cookie. Separar el principal transitorio de OIDC del principal local durable al guardar el contexto en sesión. Reusar la identidad local actual en `/auth/me` y en controladores por propietario.
3. Validar expiración con datos ficticios y tiempo controlado en HTTP/PostgreSQL real. Revisar que la persistencia excluya tokens y que CSRF, callback fallido y logout mantengan sus negativos. Ajustar S-001, ADR 0002 y el escenario de reinicio en DEPLOYMENT al comportamiento probado.

## Aceptación y pruebas

| Criterio | Comando desde la raíz (Git Bash, Java 21, Docker) | Resultado esperado |
|---|---|---|
| AC-01. Login ficticio válido, recarga y reinicio del backend conservan identidad y una nota privada. Cerrar/reabrir con la cookie persistente continúa la misma sesión. | `STARTER_E2E_PROJECT=starter-e2e-t099-session bash scripts/e2e.sh --grep 'visitor, real OIDC callback\|backend restart\|logout requires CSRF\|provider cancellation' --project desktop` | El caso de reinicio falla en la base al perder la sesión y los cuatro casos pasan con el cambio. Sin redirección a Google ni mezcla de cuentas. |
| AC-02. Vencimiento por ambos límites, rotación y revocación del ID anterior, atributos de cookie y rechazo anónimo. El estado guardado no incluye tokens de Google. | `(cd server && ./mvnw -q verify -Dtest=SecurityConfigTest -Dit.test=PersistentGoogleSessionIT,OidcLoginIT,OidcFailureIT,PublicOriginIT -Djacoco.skip=true)` | Surefire y Failsafe pasan contra PostgreSQL 18 y OIDC local. Prueba de ambos límites sin esperas largas. |
| AC-03. Un navegador de tamaño móvil vuelve a sus notas con la misma sesión y puede salir. | `STARTER_E2E_PROJECT=starter-e2e-t099-mobile bash scripts/e2e.sh --grep 'backend restart\|logout requires CSRF' --project mobile` | Ambos casos pasan en el proyecto móvil. |

Completar el gate diario con `node scripts/docs-check.mjs`, `git diff --check origin/main...HEAD` y `verify-required` sobre el HEAD publicado. Consultar cleanup Docker por label exacto del namespace de cada corrida. `bash scripts/verify.sh --policy origin/main` informa el perfil. FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

2026-11-24. Frontera implementer en Claude Code Desktop con Claude Opus 5.5 (`claude-opus-5-5`), sesión nueva. Herramientas: Git Bash, PowerShell, Git, gh, JDK 21 con Maven Wrapper, Docker Desktop y Node del host. Base `origin/main` = `70729d3b5ec038b6ba0c600b8bcb963d842a1be9`. [PR #101](https://github.com/MatiasNicolasAcevedo/devnotes/pull/101): conciliación en `1cdc24c`, E2E en `592473f`, código en `6d5f740` y este cierre documental en el HEAD publicado. Impacto en comportamiento, seguridad y datos de sesión: tablas nuevas `spring_session*` (Flyway `V10`, aditiva), cookie persistente tras el login y vencimientos de 7 y 30 días. API, permisos por propietario y UI sin cambios de contrato.

Hecho:

- Spring Session JDBC con el esquema oficial PostgreSQL en `V10`. `initialize-schema: never`; Spring Session borra las expiradas cada minuto.
- `PersistentSessionSecurityContextRepository` guarda solo `LocalSessionAuthentication(LocalOidcUser(identidad local, loginAt))` y sube la inactividad a 7 días. Al cargar, invalida la sesión si pasaron 30 días desde el login. `ValidatedOidcUser` existe solo durante el callback. `OAuth2AuthorizedClientRepository` sin almacenamiento. `server.servlet.session.timeout: 10m` rige solo la correlación previa al login.
- `PersistentSessionConfiguration`: cookie `JSESSIONID` sin Base64, host-only, `Path=/`, HttpOnly, Lax y Secure desde `APP_PUBLIC_URL`. Solo la respuesta de un login válido escribe `Max-Age` de 30 días. Sin `SessionFlashMapManager` y con `spring.mvc.publish-request-handled-events: false`, porque ambos cargaban y prolongaban la sesión en rutas anónimas.
- El piloto de IA en modo de prueba obtiene el subject con `IdentityService.subject(id)` en lugar del principal.
- E2E: el reinicio conserva la identidad, la nota privada y la cookie, también en un contexto reabierto. La pérdida de sesión, la limpieza y la ausencia de bucle se prueban con `control('revoke-sessions', id)`, que borra solo las filas de ese `principal_name` en el namespace propio. El smoke `test-auth-ui-smoke.mjs` sigue la misma lógica; es tooling diferido y no se ejecutó.
- S-001 regla 5, ADR 0002 (enmienda), escenario de reinicio de DEPLOYMENT y DEPENDENCIES actualizados.

| Comando | Exit y resultado |
|---|---|
| `gh pr view codex/t-100-flexible-links-nav-order --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit`, `git fetch origin main`, `git merge-base --is-ancestor 70729d3b5ec038b6ba0c600b8bcb963d842a1be9 origin/main` | 0, MERGED `2026-11-24T17:42:55Z`, oid `70729d3…`; ancestro 0. |
| `STARTER_E2E_PROJECT=starter-e2e-t099-red bash scripts/e2e.sh --grep 'backend restart' --project desktop` sobre la base | 1 esperado: la cookie de sesión no era persistente (`expires` -1). |
| `STARTER_E2E_PROJECT=starter-e2e-t099-red2 bash scripts/e2e.sh --grep 'backend restart' --project desktop` sobre la base, con las aserciones de reinicio primero | 1 esperado: tras el reinicio `/api/v1/auth/me` dio 401 en lugar de 200 (`auth.spec.ts:83`). |
| `(cd server && ./mvnw -q verify -Dtest=SecurityConfigTest -Dit.test=PersistentGoogleSessionIT,OidcLoginIT,OidcFailureIT,PublicOriginIT -Djacoco.skip=true)` (AC-02) | 0 en `6d5f740`: 14, 5, 2, 16 y 14 casos. |
| `STARTER_E2E_PROJECT=starter-e2e-t099-session bash scripts/e2e.sh --grep 'visitor, real OIDC callback\|backend restart\|logout requires CSRF\|provider cancellation' --project desktop` | 1, 3/4: el reinicio pasó y falló el contexto reabierto, que abría el menú de cuenta durante la redirección `/` → `/notes`. |
| Mismo filtro con `starter-e2e-t099-session-r2` (AC-01) | 0, 4/4 con la espera de la URL de Notas. |
| `STARTER_E2E_PROJECT=starter-e2e-t099-mobile-r2 bash scripts/e2e.sh --grep 'backend restart\|logout requires CSRF' --project mobile` (AC-03) | 0, 2/2. La corrida previa `starter-e2e-t099-mobile` también dio 0. |
| `(cd server && ./mvnw test -Djacoco.skip=true)` y `./mvnw -q spotless:check` | 0: 775 casos; formato 0. |
| `./mvnw verify -Dtest=NONE -Dit.test=AiMessageApiIT,ApiDocsEnabledIT,ApiDocsDisabledIT,ReadinessIT,OpenApiContractIT,ServiceActivityJourneyIT` y `SessionCookieIT` | 0: 19 casos y 1 caso. |
| `git diff --check origin/main...HEAD` | 0. |
| `node scripts/docs-check.mjs` | 1 en el checkout del dueño, solo por `trailer/CLAUDE.md`: una carpeta sin versionar ajena a la tarea, que no se tocó. 0 en un worktree limpio del HEAD (`.orchestrator/t099-base`). |
| `bash scripts/verify.sh --policy origin/main` | 0: `policy=FULL`, `profile=STARTER`. FULL/STARTER: DIFERIDO POR EL DUEÑO. |
| `docker ps -aq`, `docker volume ls -q` y `docker network ls -q` con `label=com.docker.compose.project=starter-e2e-t099-<namespace>` para red, red2, session, mobile, session-r2 y mobile-r2 | 0 contenedores, volúmenes y redes en cada namespace. |

Pendiente: revisión independiente del [PR #101](https://github.com/MatiasNicolasAcevedo/devnotes/pull/101) y `verify-required` en el HEAD publicado. Después del merge, verificar en Render con Google real y en los dispositivos del dueño. En el primer despliegue se pide un login más, porque las sesiones anteriores estaban en memoria.

Límites conocidos: el principal se guarda con serialización Java y `serialVersionUID` fijo. Un cambio incompatible futuro de `LocalOidcUser`, `AuthMeResponse` o `LocalSessionAuthentication` requiere invalidar las sesiones. Una sesión que llegó a los 30 días con actividad reciente queda inutilizable; su fila se borra en el siguiente acceso autenticado o al vencer la inactividad.

## Correcciones significativas

| Causa | Ajuste | Evidencia |
|---|---|---|
| El cron anterior dejó una pausa nocturna y acumuló 429 al intentar usar readiness. | Sonda pública de proceso, cadencia de 10 minutos sin corte nocturno. Readiness se usa para validar disponibilidad de la aplicación y PostgreSQL. | [Historial y ajuste](../DEPLOYMENT.md#despertador-externo-de-devnotes). |
| El proxy publica únicamente readiness entre las rutas de Actuator. | Seleccionar `/api/v1/system/info` existente para la sonda liviana. | GET directo liveness 404 y system/info 200. |
| `SessionFlashMapManager` y `ServletRequestHandledEvent` de Spring MVC llamaban `getSession(false)` en cada request y prolongaban la sesión desde sondas anónimas. | `FlashMapManager` sin sesión y `spring.mvc.publish-request-handled-events: false`. | `PersistentGoogleSessionIT` (system/info, csrf y readiness sin cambiar `last_access_time`), `6d5f740`. |
| `AuthMeResponse` no era serializable y el login fallaba con 403 al guardar la sesión JDBC. | `AuthMeResponse implements Serializable`. | `OidcLoginIT` y `PersistentGoogleSessionIT` en verde, `6d5f740`. |
| `SecurityConfigTest` ya fallaba en `main` con 14 errores: el slice no tenía `AiMessageService` ni `FreeNoteService`. AC-02 lo exige. | Excluir el paquete `ai` del slice y agregar el mock de `FreeNoteService`, solo en el test. | Worktree limpio de `origin/main`: 14 errores; rama: 14/14, `6d5f740`. |
| La fixture de los slices fijaba un login del 2026-10-13, ya vencido por la regla de 30 días. | Login de la fixture en el instante actual. | `AuthControllerTest` 11/11. |
| El contexto reabierto del E2E abría el menú de cuenta durante la redirección `/` → `/notes`. | Esperar la URL de Notas y usar el viewport del proyecto, como los demás specs. | AC-01 4/4 en `starter-e2e-t099-session-r2`. |

## Prompts de salida

Al publicar la implementación (vigente):

```text
Frontera reviewer independiente de T-099 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md y docs/tasks/T-099-persistent-google-session.md, en especial «Checkpoint vigente» y «Correcciones significativas». PRECONDICIÓN: gh pr view 101 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, base 70729d3b5ec038b6ba0c600b8bcb963d842a1be9, HEAD igual al último commit de codex/t-099-persistent-google-session (commit documental sobre 6d5f740) y verify-required verde en ese HEAD. Si no se cumple, devolvé el estado vigente. ACCIÓN: revisá que la sesión persista solo LocalSessionAuthentication/LocalOidcUser, sin tokens, claims ni ids del proveedor. Comprobá en el servidor ambos vencimientos (7 días de inactividad y 30 desde cada login) y que las rutas anónimas no prolonguen la sesión. Revisá aislamiento por dispositivo, rotación y revocación del id anterior, logout con CSRF, callback fallido, atributos de cookie, V10 aditiva y el gate de IA con IdentityService.subject. En un worktree aislado corré el comando AC-02 de la tarea y el E2E de AC-01 de escritorio con un namespace propio, barras verticales sin escapar; registrá exit y cleanup por label. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view 101 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Tras el merge:

```text
Frontera planner de seguimiento de T-099 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/tasks/T-099-persistent-google-session.md y docs/DEPLOYMENT.md. PRECONDICIÓN: gh pr view codex/t-099-persistent-google-session --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED con fecha y oid y git merge-base --is-ancestor con el oid confirmado y origin/main sale 0. ACCIÓN: conciliá T-099, confirmá el SHA activo y readiness. Coordiná la verificación de continuidad con el dueño en sus dispositivos y retomá el pendiente de vencimiento de PostgreSQL. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: registro de cierre y prompt vigente.
```
