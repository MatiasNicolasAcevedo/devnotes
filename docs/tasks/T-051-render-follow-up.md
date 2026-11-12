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

# T-051 · Ícono, URL, voz y horario del servicio en Render

## Objetivo

El dueño abre DevNotes en la URL que elija, ve el mismo ícono nuevo en la pestaña y en la app web instalada en Windows, puede grabar y transcribir con Groq, y activa cada día una sonda de disponibilidad hasta medianoche. El dueño pidió agrupar los cuatro cambios en una tarea y un PR. El trabajo empieza después de [T-047](T-047-render-first-deploy.md) MERGED.

## Alcance acordado

- **Ícono.** El dueño entrega la imagen. Preferir SVG cuadrado o PNG de 512 × 512. Actualizar el favicon en `client/index.html` y los íconos del manifiesto `client/public/manifest.json` según el formato entregado. Verificar la pestaña y la app instalada en Brave/Windows.
- **URL.** Consultar en Render la disponibilidad de `devnotes.onrender.com` y confirmar con el dueño la URL elegida y el mecanismo de transición. La consulta HTTP inicial no respondió a tiempo. Alinear la URL canónica `APP_PUBLIC_URL`, el callback exacto de Google y la instalación de la app. Conservar la base y las notas existentes. Cualquier recurso nuevo o retiro del servicio anterior requiere su confirmación específica.
- **Voz.** El dueño configura `GROQ_API_KEY` en el panel privado. Activar `DEVNOTES_VOICE_ENABLED=true`, mantener desactivado el proveedor de prueba y validar grabación, transcripción y guardado con la muestra ficticia y las condiciones de [VOICE-RELEASE](../VOICE-RELEASE.md#habilitación-segura-del-proveedor).
- **Sonda.** La activa el dueño al comenzar su día. Desde esa activación, hacer GET público a `/actuator/health/readiness` cada 10 min y detener los GET antes de las 00:00 de Buenos Aires. La activación se reinicia por fecha local. Elegir un ejecutor que siga funcionando con Brave cerrado y validar el consumo de horas. El Cron Job de Render tiene un mínimo de USD 1 por mes. La elección de ejecutor, disparador y cualquier costo se confirma antes de habilitarlo. [Cron Jobs de Render](https://render.com/docs/cronjobs) y [cuota Free](https://render.com/docs/free#monthly-usage-limits).

## Aceptación prevista

| Área | Evidencia esperada |
|---|---|
| Ícono | La pestaña y la app instalada muestran el ícono elegido. |
| URL | Readiness `200` y `UP` en el origen elegido, login real y recuperación de una nota existente con la misma cuenta. |
| Voz | El dueño graba una muestra ficticia, recibe texto editable y recupera la nota de voz guardada. |
| Sonda | Evidencia saneada de un día activado, cadencia de 10 min y corte en medianoche local. Un día sin activar no genera GET de la sonda. |

## Checkpoint vigente

Frontera en Codex de escritorio, familia GPT-6, variante y esfuerzo no expuestos. Git, PowerShell, MCP de Render y documentación oficial. El dueño confirmó el alcance agrupado y pidió hacerlo posteriormente. Pendientes para `ready`: T-047 MERGED, archivo del ícono, URL y transición verificadas, y mecanismo de activación/ejecución de la sonda acordado. Completar archivos, comandos y gate antes de pasar a implementación. El cambio de assets en `client/public` exige comprobar el perfil STARTER según [TESTING](../TESTING.md#frecuencia-y-alcance-del-gate).
