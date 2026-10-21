# Despliegue económico de varias aplicaciones

**Pendiente de decisión del dueño para cada aplicación.** Esta guía es una propuesta técnica: completar contexto, carga prevista, capacidad, presupuesto, proveedor, región y dominio propios antes de aprobar despliegue o gastos. Las decisiones del mantenimiento del starter no autorizan ni aceptan la operación de una copia.

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
