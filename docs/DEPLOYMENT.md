# Despliegue económico de varias aplicaciones

**Pendiente de decisión del dueño para cada aplicación.** Esta guía es una propuesta técnica: completar contexto, carga prevista, capacidad, presupuesto, proveedor, región y dominio propios antes de aprobar despliegue o gastos. Las decisiones del mantenimiento del starter no autorizan ni aceptan la operación de una copia.

## Piloto de DevNotes en Render Free

Alcance acordado con el dueño el 2026-11-10. Orden decidido ese mismo día: primero la activación y las pruebas de M2-RC1 ([T-039](tasks/T-039-voice-activation.md)), después la portabilidad `.xlsx` ([S-107](specs/S-107-xlsx-portability.md)) y al final este piloto ([S-108](specs/S-108-render-pilot.md), tareas T-046 y T-047). La validación cloud usa una instancia de prueba y datos ficticios. La creación de recursos, los accesos a GitHub y Render y la configuración de Google se confirman con el dueño al iniciar la prueba.

### Empaquetado

- Un Web Service Docker con React compilado, nginx y Spring Boot. PostgreSQL 18 Free separado, en la misma región, con acceso por red interna y acceso externo deshabilitado. Crear la base al tener la imagen lista porque el plazo de 30 días corre desde su creación. [Red de Render Postgres](https://render.com/docs/postgresql-creating-connecting) y [límites de Free](https://render.com/docs/free#free-postgres).
- Preparar `deploy/render/Dockerfile` multietapa con contexto en la raíz. Reutilizar el flujo `npm ci` y `npm run build` del cliente y el Maven Wrapper con Java 21 del servidor. Mantener las versiones fijadas, copiar insumos explícitos y usar credenciales solo en el entorno de ejecución. Coordinar el inicio, el fallo y la terminación ordenada de los dos procesos. [Docker en Render](https://render.com/docs/docker).
- Adaptar el proxy nginx existente para escuchar en `PORT` y reenviar a Spring en `127.0.0.1:8080`. Mantener React, `/api/`, `/oauth2/`, el callback y `/logout` bajo un único origen público. Conservar la validación de Host, la reconstrucción de `Forwarded`/`X-Forwarded-*` desde configuración confiable, sesión, CSRF y el fallback de rutas de la SPA. Publicar el `GET /actuator/health/readiness` existente, que comprueba Spring y PostgreSQL. [Contrato de origen](adr/0002-google-oidc-session-csrf-and-proxy.md), [puerto de Render](https://render.com/docs/web-services#port-binding) y [health checks](https://render.com/docs/health-checks).

### Prueba local y comandos previstos

Una pasada sobre la imagen final con aproximadamente 512 MB y 0,1 CPU, PostgreSQL 18 aparte y OIDC ficticio. Registrar tiempo hasta readiness y pico de memoria en el arranque y tras guardar una nota. Si el límite falla, aislar Spring para ubicar el consumo antes de reconsiderar el empaquetado. Contrastar la referencia local con las métricas de Render. [Recursos del plan](https://render.com/docs/blueprint-spec) y [métricas](https://render.com/docs/service-metrics).

Ejecutar estos comandos desde un checkout limpio con `deploy/render/compose.smoke.yml`. El stack usa un nombre único y datos descartables. Reservar los puertos de loopback 18080 para la app y 18090 para OIDC. Si el segundo está ocupado, fijar `RENDER_SMOKE_OIDC_PORT` a otro puerto libre. Limpiar volúmenes después de verificar la propiedad y las etiquetas exactas del proyecto de prueba.

```powershell
# Desde la raíz del repo y en la misma terminal durante toda la prueba.
$project = "devnotes-render-smoke-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
$compose = @("compose", "--env-file", ".env.example", "-p", $project,
             "-f", "deploy/render/compose.smoke.yml")
docker @compose up -d --build --wait --wait-timeout 300
curl.exe -fsS http://127.0.0.1:18080/actuator/health/readiness
# Pico de arranque, antes de interactuar con la app.
docker @compose exec -T app cat /sys/fs/cgroup/memory.peak
# Después de guardar una nota ficticia, leer el pico en bytes si está disponible.
docker @compose exec -T app cat /sys/fs/cgroup/memory.peak
# Tras verificar la propiedad de los recursos descartables del proyecto.
docker @compose down --volumes
```

Recargar una ruta interna y verificar que una petición directa a `/api/v1/daily-notes` sin sesión devuelva `401`. En Windows, usar una instancia de Chrome o Edge con perfil temporal y `--host-resolver-rules="MAP host.docker.internal 127.0.0.1"` para que el navegador alcance el OIDC ficticio con el mismo issuer que Spring. Ingresar por el flujo normal, guardar una nota ficticia, ejecutar `docker @compose restart app`, esperar readiness y volver a ingresar para recuperar la nota.

Medir el tiempo desde el inicio del contenedor de la app hasta el primer readiness exitoso. El pico del cgroup mide la memoria de ese contenedor. Si el host no expone `memory.peak`, informar el máximo observado con `docker stats` como estimación. Cierre con el gate STARTER por los cambios en Docker y Compose, según [TESTING](TESTING.md#frecuencia-y-alcance-del-gate). [Pico de memoria del cgroup](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html) y [docker stats](https://docs.docker.com/reference/cli/docker/container/stats/).

### Primer deploy y aceptación del dueño

1. Crear la base y un Web Service Free de Docker con el Dockerfile anterior, contexto raíz, health check de readiness y redeploy manual por SHA. Cargar `SPRING_DATASOURCE_URL` como JDBC interno y configurar usuario y contraseña en `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD`. [Configuración de Docker](https://render.com/docs/docker) y [deploy manual](https://render.com/docs/deploys#manual-deploys).
2. Fijar `APP_PUBLIC_URL` a la URL HTTPS pública del servicio y registrar su callback exacto `/login/oauth2/code/google`. El dueño autoriza Google y carga `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el panel privado. Para operar mediante MCP, comprobar la conexión por OAuth y el alcance de acceso concedido al entorno de prueba. [Callback de Google](https://developers.google.com/identity/protocols/oauth2/web-server) y [MCP de Render](https://render.com/docs/mcp-server).
3. El dueño inicia sesión, guarda una nota ficticia, reinicia el Web Service y vuelve a abrir la nota desde Chrome instalado como app. Registrar SHA desplegado, resultado del recorrido y métricas de arranque y RAM. La receta documenta diagnóstico de build, conexión y callback. [Instalar como app en Chrome](https://support.google.com/chrome/answer/9658361?hl=es-419).

El piloto arranca bajo demanda. Si las suspensiones posteriores molestan, evaluar un ping externo cada 10 minutos durante la franja elegida en Buenos Aires. En un mes de 31 días, de 07:00 a 22:00 son 465 h y hasta las 23:00 son 496 h, más la espera hasta la suspensión y el tráfico fuera de horario. El workspace comparte 750 h mensuales entre sus Web Services Free. [Cuota e inactividad](https://render.com/docs/free#free-web-services).

## Arquitectura recomendada
Un VPS Linux con Docker Compose, un proxy HTTPS compartido (Caddy como opción inicial), un PostgreSQL 18 compartido y un stack separado por aplicación. Servir React compilado y `/api`, `/oauth2`, callback y logout desde el mismo origen de cada aplicación: `https://app-a.ejemplo.com`, `https://app-b.ejemplo.com`. Cloudflare DNS Free como opción inicial propuesta; proxy/CDN opcionales, con TLS completo hasta el origen. No cachear API privada ni respuestas con sesión. No cambiar el modelo OIDC/sesión/CSRF ni publicar puertos de PostgreSQL/backend.

Cada aplicación sigue necesitando un proceso Java/contenedor propio; el ahorro es compartir la máquina y pagar su capacidad, no una tarifa por instancia. PostgreSQL y proxy se administran una vez y el deploy de una aplicación no puede reiniciarlos ni destruirlos. Proyectos, redes, credenciales y límites de recursos explícitos por aplicación. DB en redes privadas; restringir comunicación entre stacks. Separar el host si aparecen usuarios no confiables o necesidades de aislamiento fuerte.

Se pueden detener backends/stacks de apps que no se están mostrando y levantar otros; conservar volúmenes/DB y no usar down -v en datos persistentes. Detener una app libera parte de RAM/CPU; no reduce la tarifa mensual del VPS ni libera el espacio de sus datos/imágenes. No se exige mantener todas las JVM encendidas. Páginas estáticas adicionales pueden compartir el proxy sin un backend Java cada una.

## DNS y herramientas sin suscripción
DNS vincula un nombre como app-a.mi-dominio.com con la IP del VPS. Un dominio propio permite muchos subdominios: no hace falta comprar un dominio ni una IP por proyecto. El registro/renovación del dominio tiene su costo aparte; DNS gratuito no regala el dominio. [Conceptos DNS](https://developers.cloudflare.com/dns/concepts/).

Propuesta inicial: dominio del dueño y Cloudflare DNS Free, registros A/AAAA al VPS, en modo DNS-only al arrancar. Caddy gestiona HTTPS en el VPS; DNS-only no pasa tráfico HTTP por Cloudflare. Evaluar proxy/CDN más adelante, Full (strict), sin cachear sesión/API. No es requisito Cloudflare: también sirve DNS del registrador sin tarifa adicional si su oferta lo incluye. [Plan personal](https://www.cloudflare.com/personal/), [DNS primario](https://developers.cloudflare.com/dns/zone-setups/full-setup/), [proxy status](https://developers.cloudflare.com/dns/proxy-status/).

Linux, Docker Engine/Compose, Caddy, PostgreSQL y herramientas de backup abiertas, sin panel/licencia comercial obligatoria. Compilar en equipo propio/CI antes del VPS. No añadir Kubernetes, base administrada ni cuota por deploy para aplicaciones pequeñas. No crear cuentas/infraestructura ahora.

## Una instancia PostgreSQL, varias bases
Es una configuración válida: un cluster PostgreSQL puede contener varias bases. Crear una DB y roles propios por aplicación, no un único usuario superuser compartido. Cada conexión elige una base y cada aplicación mantiene sus migraciones Flyway allí. Roles son globales al cluster: usar nombres únicos, sin SUPERUSER/CREATEDB/CREATEROLE, revocar CONNECT/TEMP de PUBLIC en cada DB y conceder solo al rol autorizado. Verificar privilegios de esquema; separar rol de migración y runtime al implementar la receta.

En la validación de despliegue, exigir que app A conecte a su base y que falle la conexión/lectura con sus credenciales en base B; no basta cambiar el nombre de la DB en una URL. Limitar pools por app y revisar suma de conexiones frente a max_connections. La separación lógica no limita CPU/disco ni elimina el punto único de fallo.

Backups por base fuera del VPS, cifrados y con retención; restauración probada en entorno aislado. pg_dump por base no reemplaza la estrategia de roles ni garantiza un punto consistente entre bases; para recuperación completa definir también roles/configuración y, si se necesita, WAL/PITR. Snapshot del mismo VPS no basta como única copia.

Fuentes: [gestión de bases PostgreSQL 18](https://www.postgresql.org/docs/18/managing-databases.html), [privilegios](https://www.postgresql.org/docs/18/ddl-priv.html), [backup SQL](https://www.postgresql.org/docs/18/backup-dump.html).

## Capacidad y costo
Dimensionar CPU/RAM, disco, conexiones y margen del sistema/DB con la carga de la aplicación. Medir RSS/heap/pools y latencia; comparar el costo recurrente total, impuestos, dominio, backups y renovación antes de contratar. No hay tamaño ni presupuesto aceptados por herencia.

## Cuando haya una aplicación para publicar
Esta guía propone un camino; no incluye Compose de producción ni promete que desplegar sea solo cambiar una variable. Al llegar el momento reconsultar precio/stock/región, medir latencia, y el dueño elige proveedor, dominio y gasto. Preparar una tarea acotada de despliegue: Compose de infraestructura compartida y configuración por aplicación; imágenes fijadas, redes privadas, TLS/orígenes, secretos externos al repo, roles/DB separados, memoria/pools/health/restart y logs acotados. Ensayar dos apps ficticias con el mismo PostgreSQL, negativos de acceso cruzado, deploy/rollback de A sin afectar B ni DB, backup/restore y cleanup limitado a recursos propios. No ejecutar contra producción para probar esta receta.
