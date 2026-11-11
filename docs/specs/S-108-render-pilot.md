---
id: S-108
status: approved
version: 1
milestone: M4
tasks: [T-046, T-047]
---
# S-108 · Piloto de DevNotes en Render Free

## Iteración y objetivo de salida

I4 / M4 · Piloto cloud. Es el último paso del plan que el dueño fijó el 2026-11-10: M2-RC1 activada y probada, luego portabilidad `.xlsx` ([S-107](S-107-xlsx-portability.md)) y al final este despliegue. El alcance técnico acordado, los comandos y las fuentes de Render están en [DEPLOYMENT · Piloto](../DEPLOYMENT.md#piloto-de-devnotes-en-render-free). Esta spec ordena las tareas y fija el criterio de salida, sin repetir esa receta.

Criterio de salida: el dueño usa DevNotes desde la URL HTTPS de Render con Google real. Guarda una nota, reinicia el servicio y la recupera. Importa en la cuenta vacía de Render el `.xlsx` exportado de su entorno local, y queda registrado el SHA desplegado con las métricas de arranque y RAM. Después, frontera recibe los hallazgos y decide la siguiente iteración.

## Reglas y límites

- **Reservado al dueño** ([AUTONOMY](../AUTONOMY.md#reservado-al-dueño)): crear o borrar recursos en Render, conectar GitHub, configurar Google real y cargar secretos (`GOOGLE_CLIENT_*`, `GROQ_API_KEY`, credenciales de la base). Un agente puede preparar la receta, guiar y registrar evidencia saneada, pero no lee secretos, cookies, tokens ni datos reales, y no ejecuta acciones en la cuenta Render sin la confirmación explícita del dueño para cada una.
- **Un solo origen.** El Web Service sirve React, `/api/`, `/oauth2/`, el callback y `/logout` desde la misma URL. Se conservan sesión, CSRF, validación de Host y propagación confiable de `Forwarded`, según [ADR 0002](../adr/0002-google-oidc-session-csrf-and-proxy.md). Perfil `google` (el predeterminado). Nunca `e2e`, `DEVNOTES_VOICE_TEST_PROVIDER=true` ni Swagger.
- **Voz.** Opcional en Render. Si el dueño quiere usarla, carga `DEVNOTES_VOICE_ENABLED=true` y `GROQ_API_KEY` en el panel privado, con las mismas condiciones de [VOICE-RELEASE](../VOICE-RELEASE.md#habilitación-segura-del-proveedor). Si no, `/api/v1/voice/capabilities` informa `disabled` y la edición de texto sigue disponible.
- **Datos.** La base Free vence a los 30 días de su creación. La exportación `.xlsx` es el respaldo: el dueño exporta antes del vencimiento y recrea la cuenta importando en una base nueva vacía. No hay backups automáticos en este piloto.

## Criterios de aceptación

| ID | Dado / cuando / entonces | Nivel | Tarea |
|---|---|---|---|
| RP-01 | Desde un checkout limpio, la imagen `deploy/render/Dockerfile` con `compose.smoke.yml` alcanza readiness con unos 512 MB y 0,1 CPU, PostgreSQL 18 aparte y OIDC ficticio. Recarga una ruta interna, devuelve 401 en la API sin sesión y recupera la nota tras reiniciar la app. Se registran el tiempo hasta readiness y el pico de memoria | smoke local + gate | T-046 |
| RP-02 | La app escucha en `PORT`, termina ambos procesos de forma ordenada ante SIGTERM y falla el contenedor si cae Spring o nginx | smoke local | T-046 |
| RP-03 | En Render, con Google real, el dueño inicia sesión, guarda una nota, reinicia el servicio y la reabre, también desde Chrome instalado como app | aceptación del dueño | T-047 |
| RP-04 | El dueño importa en Render el `.xlsx` local y ve sus datos; volver a importar en esa cuenta da 409 | aceptación del dueño | T-047 |

## Fuera de alcance

Dominio propio, plan pago, backups automáticos, ping de actividad (solo se evalúa, según DEPLOYMENT), CI/CD con deploy automático, multiinstancia y el VPS de la arquitectura recomendada.

## Tareas y dependencias

| Tarea | Resultado observable | Depende de | Salida para continuar |
|---|---|---|---|
| [T-046](../tasks/T-046-render-image.md) | Imagen única y smoke local con métricas | T-045 aceptada y [T-050](../tasks/T-050-ui-adjustments.md) MERGED (orden del dueño, 2026-11-11) | RP-01, RP-02 y MERGED |
| [T-047](../tasks/T-047-render-first-deploy.md) | Primer deploy, migración de datos y aceptación del dueño | T-046 | RP-03, RP-04 y evidencia en DEPLOYMENT |

## Validación de planificación

Frontera: Claude Code (Claude Opus 5.5, `claude-opus-5-5`; esfuerzo no expuesto), 2026-11-10. El alcance técnico viene del plan del dueño en DEPLOYMENT (PR43) y aquí solo se reordena tras S-107. `approved` significa contrato alineado; no autoriza crear recursos ni gastos.
