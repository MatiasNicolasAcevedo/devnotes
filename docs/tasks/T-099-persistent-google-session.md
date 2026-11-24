---
id: T-099
status: ready
priority: P1
size: M
milestone: post-M9
spec: null
depends_on: [T-098]
branch: codex/t-099-persistent-google-session
role: implementer
executor: frontier
pr: null
---

# T-099 · Conservar la sesión de Google en cada dispositivo

## Objetivo

Una persona que vuelve a DevNotes desde el mismo perfil de navegador, incluso después de cerrar el navegador o de que Render reinicie Spring, puede volver a sus notas con la sesión que ya inició. Aplica también a Android. El dueño pidió el 2026-11-24 evitar entradas repetidas cada 30–60 minutos y priorizó que DevNotes estuviera disponible al abrirlo. La configuración operativa del despertador está en [DEPLOYMENT](../DEPLOYMENT.md#despertador-externo-de-devnotes).

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

1. Adaptar el E2E de reinicio para esperar la misma sesión después de readiness, conservando la comprobación de identidad y el cambio de cuenta. Demostrar el fallo sobre la base antes de implementar.
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

2026-11-24. Frontera, diagnóstico operativo y planificación en Codex Desktop, GPT-6, variante y esfuerzo sin dato expuesto. Herramientas: Brave, cron-job.org, Render, PowerShell, curl, Git y gh. Base y deploy activo `89c375869b8183089fdd9cd57a9616f0f2383e19`. Esta rama documenta disponibilidad y prepara un cambio de comportamiento, seguridad y datos de sesión. La implementación y sus pruebas corresponden a T-099 en una sesión nueva.

| Evidencia | Resultado |
|---|---|
| `gh pr view 97 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit`, `git fetch origin main`, `git merge-base --is-ancestor 89c375869b8183089fdd9cd57a9616f0f2383e19 origin/main` | Exit 0. PR #97 MERGED el 2026-11-23 a las 19:26:04 UTC, merge SHA igual a la base. |
| `curl.exe` a readiness y a las rutas candidatas | El sandbox inicial devolvió error 6 de DNS. Con red autorizada, readiness dio 200 y `{"status":"UP"}` en 1,52 s. Liveness pública dio 404, información de sistema dio 200 en 0,54 s. |
| Historial de cron-job.org y logs de Render | [Resultados operativos](../DEPLOYMENT.md#despertador-externo-de-devnotes). |
| `node scripts/docs-check.mjs`, `git diff --check` | Exit 0 para el plan documental. FULL/STARTER: DIFERIDO POR EL DUEÑO. |

## Correcciones significativas

| Causa | Ajuste | Evidencia |
|---|---|---|
| El cron anterior dejó una pausa nocturna y acumuló 429 al intentar usar readiness. | Sonda pública de proceso, cadencia de 10 minutos sin corte nocturno. Readiness se usa para validar disponibilidad de la aplicación y PostgreSQL. | [Historial y ajuste](../DEPLOYMENT.md#despertador-externo-de-devnotes). |
| El proxy publica únicamente readiness entre las rutas de Actuator. | Seleccionar `/api/v1/system/info` existente para la sonda liviana. | GET directo liveness 404 y system/info 200. |

## Prompts de salida

Al publicar la implementación:

```text
Frontera reviewer independiente de T-099 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md y docs/tasks/T-099-persistent-google-session.md. PRECONDICIÓN: gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <SHA> y verify-required verde. ACCIÓN: revisá la persistencia mínima, ambos vencimientos, el aislamiento por dispositivo, la revocación, CSRF/OIDC y el gate diario. Repetí la prueba dirigida de reinicio y logout en un namespace propio. Si aprobás, squash ligado al SHA revisado y confirmá MERGED con gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Tras el merge:

```text
Frontera planner de seguimiento de T-099 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/tasks/T-099-persistent-google-session.md y docs/DEPLOYMENT.md. PRECONDICIÓN: gh pr view codex/t-099-persistent-google-session --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED con fecha y oid y git merge-base --is-ancestor con el oid confirmado y origin/main sale 0. ACCIÓN: conciliá T-099, confirmá el SHA activo y readiness. Coordiná la verificación de continuidad con el dueño en sus dispositivos y retomá el pendiente de vencimiento de PostgreSQL. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: registro de cierre y prompt vigente.
```
