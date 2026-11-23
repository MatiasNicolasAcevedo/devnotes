# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-094](tasks/T-094-ai-workspace.md) · [S-116](specs/S-116-ai-workspace.md) |
| Estado | `changes_requested` |
| Siguiente acción | Frontera implementer nuevo corrige el PR #90 con el piloto Free acotado |
| Rama / PR | `codex/t-094-ai-workspace` · [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90) |

Modo `FRONTERA_CONTINUA`. T-093 conciliada. La [cola](BACKLOG.md#lote-imagen-libres-e-ia) continúa con IA, tráiler v2 y demo narrada. [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

Piloto aprobado con cinco destinos: Groq 20B/120B, Workers AI 20B/120B y Gemini 3.1 Flash-Lite. Gemini 3.8 Flash y OpenRouter Free quedan diferidos. El selector y el compositor muestran disponibilidad, fallos y cuota. El usuario elige y confirma otro destino. [Decisión y cierre observable](tasks/T-094-ai-workspace.md#decisión-de-alcance-del-dueño). FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Pendientes del dueño

| Tema | Qué falta |
|---|---|
| PostgreSQL Free de Render | Vence el 2026-12-11 a las 22:35 de Buenos Aires si sigue la misma instancia. Antes: exportar, restaurar en local una cuenta vacía, cotejar ambos espacios y recién entonces reemplazar la base. [Procedimiento](DEPLOYMENT.md#respaldo-y-reemplazo-de-postgresql-free) |
| Sonda interna en Render | Ensayo pendiente de autorización expresa sobre SHA y ventana. [Receta](DEPLOYMENT.md#ensayo-de-la-sonda-interna-en-render-free) |
| SP-06 | Prueba en Android físico con teclado real y zoom nativo |
| Limpieza local | Hay decenas de worktrees en `.orchestrator/`, ramas locales ya mergeadas y siete stashes viejos. Listarlos y decidir cuáles se borran; ningún agente los elimina sin esa decisión |

Render: Auto-Deploy **On Commit** para `main`; cada merge despliega, también los documentales.

## Gates diferidos

| Dato | Valor |
|---|---|
| Último integrado válido | FULL local del 2026-11-15 sobre `398801f` ([T-069](tasks/T-069-ocr-workspace.md#evidencia-del-full-de-cierre)); STARTER de T-068 conservado |
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo y el encadenamiento del lote hasta T-085 |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-094 incorpora rutas privadas y cambia Compose |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de corrección de T-094 en MatiasNicolasAcevedo/devnotes. Sesión nueva, mismo PR #90 y rama codex/t-094-ai-workspace.

LEER: AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-094-ai-workspace.md, docs/specs/S-116-ai-workspace.md, la sección IA de docs/design/WRITING-WORKSPACES.md y el banco ficticio de T-072.

PRECONDICIÓN: ejecutá gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup y git fetch origin main codex/t-094-ai-workspace. Confirmá OPEN, refs iguales a GitHub, base dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795 y HEAD con la decisión publicada y el checkpoint de reviewer 3f0ffde6f16c1c703c32edbbc6c9afba34e1b97f como ancestro. Verificá con git merge-base --is-ancestor 3f0ffde6f16c1c703c32edbbc6c9afba34e1b97f origin/codex/t-094-ai-workspace. Si cambió la precondición o no se puede verificar, informá el estado real y entregá el prompt corregido.

ACCIÓN
1. Aplicá el alcance de S-116/T-094. El piloto ofrece Groq 20B/120B, Workers AI 20B/120B y Gemini 3.1 Flash-Lite. Gemini 3.8 Flash y OpenRouter Free quedan diferidos, sin selección ni envío en el piloto, incluso con credenciales cargadas. Probá el catálogo y el rechazo de ambos destinos vía POST directo. Conservá los cuatro adaptadores y el positivo de OpenRouter con un doble externo en pruebas aisladas de compatibilidad.
2. Corregí OpenRouter según los hallazgos de T-094. GET y POST deben compartir la comprobación vigente de ruta para la variante de texto :free exacta. Ausencia de ruta, variante distinta, precio desconocido o no cero, política incompatible y caché vencida sin refresco válido dejan indisponibilidad saneada y cero POST de inferencia. Probá esos negativos y una ruta válida con dobles. Conservá caché de hasta 5 minutos y refresco deduplicado, ZDR, data_collection: deny, precio cero, sin fallback ni reintento automático, sin créditos ni BYOK.
3. Mostrá en la UI la hora de observación de la cuota Groq y las unidades de solicitudes restantes por día y tokens restantes por minuto según cada cabecera válida. Probá cabeceras válidas, cero, parcial, ausente e inválida desde el adaptador hasta la UI. Sin estimar saldo ni confundir consumo con cuota.
4. Mostrá el estado por modelo en el selector y para el destino del compositor, con texto e icono además del color. «Disponible para intentar» (verde) expresa elegibilidad. «No disponible», «No responde» y «Cuota agotada» tienen motivos visibles. Ante timeout o fallo transitorio, conservá el borrador, suspendé Enviar hacia ese par y ofrecé «Elegir otro modelo» y «Volver a intentar» de manera explícita. Para 429 remoto, respetá Retry-After válido antes de volver a habilitar el intento, sin reenviar. Si falta, no inventes hora ni saldo y permití un nuevo intento deliberado con motivo visible. Abrir selector, aplicar un destino, refrescar opciones o vencer la espera no comparte texto. El usuario elige el destino y confirma Enviar. Cubrí teclado, anuncios accesibles, timeouts y 429 con/sin espera válida, cambio manual y ausencia de envíos involuntarios.
5. Completá la matriz de T-094 con respuesta real y muestra ficticia de T-072 para cada uno de los cinco destinos habilitables, usando solo las cuentas Free ya autorizadas. Conservá los resultados previos y explicitá las dos filas diferidas, su evidencia y la condición de reactivación. Para OpenRouter en esta ronda, si el acceso existente lo permite, actualizá solo la evidencia de metadatos y registrá su resultado. Sin probar inferencia externa de los destinos diferidos, sin datos reales ni cambios de Render. Conservá Auto-Deploy On Commit.

GATE: rojo antes del arreglo y luego gate diario de T-094 con backend dirigido y Failsafe PostgreSQL, cliente y typecheck, E2E filtrados, docs-check y perfil informativo. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: publicá en el mismo PR #90 el checkpoint con matriz, negativos de cero inferencia, evidencia de cuota y estados de UI, comandos y exit. Confirmá el HEAD con gh pr view y verify-required verde sobre él. Cerrá STATUS y la respuesta con el prompt completo de un reviewer independiente para ese HEAD/base. La eventual aprobación y el squash corresponden a ese reviewer.
```
