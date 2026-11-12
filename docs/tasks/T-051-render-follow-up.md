---
id: T-051
status: in_progress
priority: P1
size: M
milestone: M4
spec: null
depends_on: [T-047]
branch: codex/t-051-render-follow-up
role: implementer
executor: frontier
pr: 54
---

# T-051 · Ícono y voz en Render

## Objetivo

El dueño abre DevNotes en `devnotes-pilot.onrender.com`, ve el ícono nuevo en la pestaña y en la app web instalada en Windows y puede grabar y transcribir con Groq. Un PR y un deploy de prueba para verificar juntos el ícono y la voz. El trabajo empieza después de [T-047](T-047-render-first-deploy.md) MERGED.

## Alcance acordado

- **Ícono.** El dueño entregó un ICO de 16 × 16 con un símbolo de terminal cian sobre negro. Se redibujó como SVG y se exportaron PNG de 192 y 512 px para el manifiesto. La copia del ICO, el SVG `devnotes-favicon.svg` y los PNG `devnotes-icon-192.png` y `devnotes-icon-512.png` están en `.orchestrator/t051-inputs/`, que Git ignora. Integrar el SVG en el favicon y las variantes en el manifiesto. Verificar la pestaña y la app instalada en Brave/Windows. [Íconos del manifiesto](https://developer.chrome.com/docs/modern-web-guidance/guides/pwa/install-web-app).
- **URL resuelta.** A pedido del dueño se probó un segundo Web Service Free llamado `devnotes`. Render asignó `devnotes-m8tr.onrender.com`. El dueño eligió conservar `devnotes-pilot.onrender.com` y autorizó eliminar el servicio de prueba. Render confirmó que el servicio descartado desapareció y que el piloto y PostgreSQL siguen disponibles. Esta decisión conserva el origen canónico y el callback de Google del piloto.
- **Voz.** El dueño informó que cargó `GROQ_API_KEY` y guardó `DEVNOTES_VOICE_ENABLED=true` en Render el 2026-11-12. Mantener desactivado el proveedor de prueba y conservar los secretos en el panel privado. Render seguía informando el deploy `222ae003` sin un nuevo deploy al comprobar. El deploy por SHA de esta tarea toma las variables guardadas. Validar grabación, transcripción y guardado con una muestra ficticia y las condiciones de [VOICE-RELEASE](../VOICE-RELEASE.md#habilitación-segura-del-proveedor).

## Sonda aplazada

El dueño pidió dejar la sonda para después y avanzar con el ícono y la voz. El ejemplo Java y el diseño quedan como referencia para retomarla.

- **Sonda.** La primera visita manual del dueño despierta el servicio cuando está suspendido. Después, el dueño activa la sonda para ese día. Desde esa activación, hacer GET público a `/actuator/health/readiness` cada 10 min y detener los GET antes de las 00:00 de Buenos Aires. La activación se reinicia por fecha local. El dueño pidió cero cargos nuevos y sin tarjeta. El ejemplo aportado (`.orchestrator/t051-inputs/ServerWakeUpScheduler.java`, copia local ignorada) usa `@Scheduled(fixedRate = 840000)` para consultar otra aplicación cada 14 min, desde el arranque y sin corte horario. La opción preferida es un `TaskScheduler` dentro de DevNotes que programe el próximo GET solo durante la vigencia de la activación, con destino derivado del `APP_PUBLIC_URL` validado, timeout y estado diario recuperable tras reiniciar. Validar si Render cuenta la petición de la propia instancia como tráfico entrante, con Brave cerrado y sin sondas externas. Si Render no cuenta el GET propio, evaluar un disparador gratuito en Windows que depende de que el equipo siga encendido. [Programación de tareas de Spring](https://docs.spring.io/spring-framework/reference/integration/scheduling.html) · [Suspensión y cuota Free](https://render.com/docs/free#spinning-down-on-idle) · [Repetición de tareas en Windows](https://learn.microsoft.com/en-us/windows/win32/taskschd/repetitionpattern).

## Aceptación prevista

| Área | Evidencia esperada |
|---|---|
| Ícono | La pestaña y la app instalada muestran el ícono elegido. |
| URL | Readiness `200` y `UP` en `devnotes-pilot.onrender.com`, login real y recuperación de una nota existente con la misma cuenta. |
| Voz | El dueño graba una muestra ficticia, recibe texto editable y recupera la nota de voz guardada. |

## Pasos y pruebas

1. Desde `main` actualizado tras PR53 MERGED, abrir la rama indicada. Copiar el SVG local sobre `client/public/favicon.svg` y añadir los PNG de 192 y 512 px al manifiesto. Ajustar `client/src/app/manifest.test.ts` para comprobar los tres tamaños sin perder los datos de instalación existentes.
2. Desde `client/`, ejecutar `npm test -- --run src/app/manifest.test.ts`. Conservar `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main`. El dueño exceptuó el gate STARTER para adelantar el deploy de prueba el 2026-11-12.
3. Publicar el SHA de prueba y coordinar un solo deploy manual en `devnotes-pilot`, con confirmación expresa del dueño para ese SHA. Comprobar readiness y el nuevo ícono. El dueño prueba voz con la muestra ficticia bajo las condiciones de VOICE-RELEASE y confirma el veredicto. Registrar evidencia saneada en el mismo PR.

## Checkpoint vigente

**2026-11-12 · Implementación.** Frontera como implementer en Codex de escritorio, familia GPT-6, variante y esfuerzo no expuestos. Git, `gh`, PowerShell, Git Bash, Node, MCP de Render y documentación oficial. Base `main` `00407ef4a637369d3078d19aceab123be3b13521` tras [conciliar T-047](T-047-render-first-deploy.md#checkpoint-vigente). El favicon SVG y los PNG de 192 y 512 px usan los insumos del dueño. El cambio de producto alcanza la presentación de la pestaña y de la app instalada. La voz usa la configuración del piloto indicada por el dueño.

- `npm test -- --run src/app/manifest.test.ts` desde `client/`: 4/4. Verificación de los tres archivos de ícono y de las dimensiones PNG mediante cabeceras IHDR: OK. `npm run build`: OK, con aviso de tamaño del bundle. Los cuatro archivos públicos están en `dist`. `node scripts/docs-check.mjs` y `git diff --check origin/main...HEAD`: OK. `bash scripts/verify.sh --policy origin/main` en Git Bash: `FULL` / `STARTER`, nueve rutas, cinco técnicas. STARTER exceptuado por el dueño para el deploy de prueba.
- [PR54](https://github.com/MatiasNicolasAcevedo/devnotes/pull/54) abierto como borrador. SHA de prueba publicado y verificado en GitHub: `f6a23c7ec7587baa004d85b8a4187058b9fff255`, con [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43148200959/job/130950912772). Render confirmó `devnotes-pilot` Free, enlazado a `main` con auto-deploy desactivado. El deploy `dep-dbqhq3s9v7es73cksk2g` de `222ae003f5db5fc887929ca98f9405ae67bd4d09` seguía `live` al preparar el deploy de prueba. El panel de Render en Brave reconoció el SHA exacto y quedó listo en **Deploy a specific commit**, pendiente confirmación del dueño. Antes de iniciar, comprobar que no exista otro deploy de ese SHA. Tras `live`, hacer un GET a readiness, comprobar el manifiesto y los archivos de ícono públicos y recoger la aceptación del dueño en Brave, Windows y voz. La sonda y la medición del despertar siguen aplazadas.
