---
id: T-051
status: draft
priority: P1
size: M
milestone: M4
spec: null
depends_on: [T-047]
branch: codex/t-051-render-follow-up
role: planner
executor: frontier
pr: null
---

# T-051 · Ícono, voz y horario del servicio en Render

## Objetivo

El dueño abre DevNotes en `devnotes-pilot.onrender.com`, ve el ícono nuevo en la pestaña y en la app web instalada en Windows, puede grabar y transcribir con Groq, y activa cada día una sonda de disponibilidad hasta medianoche. El dueño pidió agrupar los cambios en una tarea y un PR. El trabajo empieza después de [T-047](T-047-render-first-deploy.md) MERGED.

## Alcance acordado

- **Ícono.** El dueño entregó un ICO de 16 × 16 con un símbolo de terminal cian sobre negro. Se redibujó como SVG y se exportaron PNG de 192 y 512 px para el manifiesto. La copia del ICO, el SVG `devnotes-favicon.svg` y los PNG `devnotes-icon-192.png` y `devnotes-icon-512.png` están en `.orchestrator/t051-inputs/`, que Git ignora. Integrar el SVG en el favicon y las variantes en el manifiesto. Verificar la pestaña y la app instalada en Brave/Windows. [Íconos del manifiesto](https://developer.chrome.com/docs/modern-web-guidance/guides/pwa/install-web-app).
- **URL resuelta.** A pedido del dueño se probó un segundo Web Service Free llamado `devnotes`. Render asignó `devnotes-m8tr.onrender.com`. El dueño eligió conservar `devnotes-pilot.onrender.com` y autorizó eliminar el servicio de prueba. Render confirmó que el servicio descartado desapareció y que el piloto y PostgreSQL siguen disponibles. Esta decisión conserva el origen canónico y el callback de Google del piloto.
- **Voz.** El dueño configura `GROQ_API_KEY` en el panel privado. Activar `DEVNOTES_VOICE_ENABLED=true`, mantener desactivado el proveedor de prueba y validar grabación, transcripción y guardado con la muestra ficticia y las condiciones de [VOICE-RELEASE](../VOICE-RELEASE.md#habilitación-segura-del-proveedor).
- **Sonda.** La activa el dueño al comenzar su día. Desde esa activación, hacer GET público a `/actuator/health/readiness` cada 10 min y detener los GET antes de las 00:00 de Buenos Aires. La activación se reinicia por fecha local. El dueño pidió cero cargos nuevos y sin tarjeta. El ejemplo aportado (`.orchestrator/t051-inputs/ServerWakeUpScheduler.java`, copia local ignorada) usa `@Scheduled(fixedRate = 840000)` para consultar otra aplicación cada 14 min, desde el arranque y sin corte horario. La opción preferida es un `TaskScheduler` dentro de DevNotes que programe el próximo GET solo durante la vigencia de la activación, con destino derivado del `APP_PUBLIC_URL` validado, timeout y estado diario recuperable tras reiniciar. Validar si Render cuenta la petición de la propia instancia como tráfico entrante, con Brave cerrado y sin sondas externas. El primer acceso despierta una instancia suspendida. Si Render no cuenta el GET propio, evaluar un disparador gratuito en Windows que depende de que el equipo siga encendido. [Programación de tareas de Spring](https://docs.spring.io/spring-framework/reference/integration/scheduling.html) · [Suspensión y cuota Free](https://render.com/docs/free#spinning-down-on-idle) · [Repetición de tareas en Windows](https://learn.microsoft.com/en-us/windows/win32/taskschd/repetitionpattern).

## Aceptación prevista

| Área | Evidencia esperada |
|---|---|
| Ícono | La pestaña y la app instalada muestran el ícono elegido. |
| URL | Readiness `200` y `UP` en `devnotes-pilot.onrender.com`, login real y recuperación de una nota existente con la misma cuenta. |
| Voz | El dueño graba una muestra ficticia, recibe texto editable y recupera la nota de voz guardada. |
| Sonda | Evidencia saneada de un día activado, cadencia de 10 min y corte en medianoche local. Un día sin activar no genera GET de la sonda. |

## Checkpoint vigente

Frontera en Codex de escritorio, familia GPT-6, variante y esfuerzo no expuestos. Git, PowerShell, MCP de Render y documentación oficial. El dueño confirmó el alcance agrupado. Insumos conservados en `.orchestrator/t051-inputs/`, con copias del ICO y del ejemplo Java verificadas por SHA-256. Pendientes para `ready`: T-047 MERGED y concretar el disparador autorizado y la prueba de la sonda en Render. Completar archivos, comandos y gate antes de pasar a implementación. El cambio de assets en `client/public` exige comprobar el perfil STARTER según [TESTING](../TESTING.md#frecuencia-y-alcance-del-gate).
