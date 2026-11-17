---
id: T-072
status: blocked
priority: P2
size: S
milestone: M6
spec: null
depends_on: [T-071]
branch: codex/t-072-writing-provider-evaluation
role: planner
executor: frontier
pr: null
---

# T-072 · Evaluar Redactar después de OCR

**Investigación histórica del 2026-11-16.** El dueño retomó los proveedores y reemplazó el flujo Redactar por el [destino global IA](../specs/S-116-ai-workspace.md). Conservar las muestras del experimento. Los modelos, la configuración activa y el recorrido se rigen por S-116.

## Objetivo y primer recorrido

Si el dueño retoma esta tarea tras el veredicto de OCR, comparar hasta tres configuraciones Free con ejemplos ficticios y decidir si merece un contrato de implementación. Recomiendo empezar por **Redactar** en Notas → Herramientas, con un pedido independiente y resultado editable. Funciona aunque la nota esté vacía y deja el envío a decisión de la persona. **Convertir en prompt** tiene una entrada más rápida cuando ya hay un dictado, pero añade origen, prellenado, gestión del borrador y permisos sobre transcripciones. Evaluarlo con la misma herramienta. Desde Voz, una acción secundaria toma el texto vigente de la transcripción. Desde Notas, una acción contextual toma solo la selección. Mostrar el fragmento editable antes de **Generar**. Conservar el original accesible al fallar. Incorporar la salida a una nota sería una acción explícita posterior.

```text
Escritorio ancho, misma herramienta sobre Notas o Voz
Redactar                                              [Cerrar]
Tu pedido                         Resultado editable
[Qué querés redactar…]            [Texto generado…  ]
[Proveedor y modelo ▾]  GroqCloud · gpt-oss-120b
[Generar]                                            [Copiar]

Escritorio al 25 % y móvil
Redactar             [Cerrar]
Tu pedido
[Pedido o fragmento visible]
Proveedor actual    [Cambiar]
[Generar]
Resultado editable
[Texto…]
[Copiar]
```

Seguir el shell y los tokens de [S-112](../specs/S-112-screenshot-ocr.md#entrada-diseño-y-comportamiento). En ventana angosta, una columna, Tab y foco devuelto a Herramientas. En móvil, 48 px por acción, texto editable de 16 px como mínimo, áreas seguras y flujo desplazable con teclado o zoom. Tras generar, el pedido puede plegarse bajo **Ver pedido**, queda disponible durante errores y nunca se sustituye por la salida. Al entrar desde Voz, el título dice **Convertir en prompt** y el fragmento aparece bajo **Texto de origen**. Dejar proveedor y modelo como control secundario de ensayo visible antes del envío. Selección explícita y fija para ese intento. Ante timeout, cuota, falta de configuración o salida inválida, mostrar el motivo, conservar pedido y resultado previo si lo hubiera, y permitir **Cambiar** y pulsar **Generar** de nuevo deliberadamente. Sin fallback ni despacho automático. Evaluar la necesidad de infraestructura multi-proveedor después de medir el experimento.

Candidatas posteriores: Extraer pendientes, Limpiar dictado, Cierre de jornada, Pasar a plantilla, Traducir o ajustar tono y Explicar o comparar. Para pendientes, validar JSON con un esquema `pendientes[]`, cada elemento con `accion` y `fraseOrigen` literal, `fecha` y `responsable` solo si aparecen en ese texto. Si el modo estricto requiere todas las propiedades, recibir valores nulos y omitirlos al mostrar el resultado. Para prompts, objetivo, contexto, restricciones y criterios con los datos disponibles. Indicar qué información falta si afecta el uso del prompt y conservar URLs, rutas, IDs y nombres sin corregirlos automáticamente.

## Configuraciones recomendadas para el experimento

Fuentes oficiales consultadas el 2026-11-14. Estas tres configuraciones tienen cuota Free recurrente publicada. Las cuentas, cuotas efectivas y permisos reales quedan por comprobar. Revalidar al retomar.

| Configuración | Cuota, facturación y agotamiento | Entrada, salida y datos |
|---|---|---|
| **GroqCloud `openai/gpt-oss-120b`**, primera opción | Free publica 30 RPM, 1.000 RPD, 8.000 TPM y 200.000 TPD por organización. Limits de Console y cabeceras dan los valores efectivos. Free es el punto de partida y el salto a Developer requiere medio de pago. Con cuota agotada devuelve 429 y `retry-after`. | Texto, contexto de 131.072, salida máx. 65.536 tokens, limitada en Free por cuota efectiva. JSON por esquema, incluido estricto. Inferencia estándar sin retención por defecto y con excepciones por fiabilidad o abuso de hasta 30 días, salvo obligación legal. Puede habilitarse ZDR en Data Controls. El acuerdo excluye el entrenamiento sin permiso del cliente. [Modelo](https://console.groq.com/docs/model/openai/gpt-oss-120b) · [Cuota](https://console.groq.com/docs/rate-limits) · [Facturación](https://console.groq.com/docs/billing-faqs) · [Salida estructurada](https://console.groq.com/docs/structured-outputs) · [Datos](https://console.groq.com/docs/your-data) · [Acuerdo](https://console.groq.com/docs/legal/services-agreement). |
| **Cloudflare Workers AI `@cf/openai/gpt-oss-120b`**, comparación del mismo modelo | 10.000 Neurons diarios compartidos por cuenta, reinicio a 00:00 UTC y consumo visible en Workers AI Dashboard. Publica 31.818 Neurons/M tokens de entrada y 68.182/M de salida. El modelo figura en el catálogo y fuera de la lista que exige método de pago. Confirmar acceso REST y plan Free de esa cuenta. Al exceder el cupo Free falla la llamada. Workers Paid puede cobrar excedentes. | Texto, ventana de 128.000 tokens y parámetro `max_tokens` (por defecto 256). La ficha pública no fija un techo separado de salida. La ficha muestra `response_format` pero la lista de JSON Mode no incluye el modelo. Verificar soporte efectivo de `json_schema` por REST y validar siempre el resultado. Inferencia sin estado con ZDR y sin entrenamiento según Cloudflare, con excepciones legales/de seguridad. Evitar persistencia y logs/caché de AI Gateway. [Modelo](https://developers.cloudflare.com/workers-ai/models/gpt-oss-120b/) · [Cuota y plan](https://developers.cloudflare.com/workers-ai/platform/pricing/) · [JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) · [Datos](https://developers.cloudflare.com/workers-ai/platform/data-usage/). |
| **Gemini 3.8 Flash `gemini-3.8-flash`**, contraste multimodal | Standard Free publica entrada y salida gratis. RPM/TPM/RPD efectivos por proyecto en AI Studio, reinicio diario a medianoche del Pacífico. Proyecto Free activo sin vincular facturación paga, con posible verificación según cuenta/región. Exceso de límite retorna error de cuota (429). Confirmar región, proyecto/habilitación y cuota efectiva antes de correr. | 1.048.576 tokens de entrada y 65.536 de salida. Acepta texto, imagen, audio, vídeo y PDF. Salida estructurada con subconjunto de JSON Schema. El experimento inicial usa texto. El servicio gratuito puede usar entradas/salidas para mejorar productos y puede tener revisión humana. Usar ficticios, con términos geográficos previstos por Google, y revisar aplicabilidad antes de cualquier uso real. [Modelo](https://aistudio.google.com/docs/models/gemini-3.8-flash) · [Precios](https://aistudio.google.com/docs/pricing#gemini-3.8-flash) · [Cuota](https://aistudio.google.com/docs/rate-limits) · [Facturación](https://aistudio.google.com/docs/billing) · [Términos y excepciones](https://aistudio.google.com/docs/terms) · [Errores](https://aistudio.google.com/docs/api-errors). |

**OpenRouter como banco de pruebas fuera de la terna.** El catálogo lista `openai/gpt-oss-120b:free` (texto, contexto anunciado 131K). Las variantes `:free` permiten 20 RPM y 50 RPD sin comprar créditos. Los intentos fallidos cuentan. Al agotarse el límite, rechaza intentos de la variante gratuita. El límite de salida, JSON Schema y disponibilidad real dependen del endpoint que atienda. OpenRouter declara que no entrena con los datos y ofrece filtros de retención/ZDR; las políticas y la retención de los proveedores de inferencia varían. Confirmar endpoint, disponibilidad y política de cuenta si se retoma alguna vez. Para comparar un mismo modelo con proveedor identificable, las dos integraciones directas ya cubren esa pregunta. El enrutador añade una variable al experimento. [Ficha gratuita](https://openrouter.ai/openai/gpt-oss-120b:free) · [Planes y límites](https://openrouter.ai/pricing) · [Routing](https://openrouter.ai/docs/guides/routing/provider-selection) · [Salida estructurada](https://openrouter.ai/docs/guides/features/structured-outputs).

## Decisiones y primera prueba real

El dueño decidirá qué fragmentos, si alguno, pueden salir desde Trabajo y Personal, por proveedor y tipo de origen. También decidirá si se recuerda la selección o se elige en cada apertura. Propuesta de prueba: solo ejemplos ficticios, default Groq visible, elegible manualmente y selección en memoria de esa apertura. No agregar cuotas pagas, memoria de contenido, integraciones automáticas con notas ni herramientas de búsqueda/ejecución en el modelo.

Cuando el siguiente paso de esta tarea dependa de una clave, Frontera cambia tarea y STATUS y avisa al dueño con el nombre de la variable, el lugar y el SHA/entorno del ensayo. La clave la carga el dueño en el entorno privado que inicia el backend local aislado de pruebas y puede informar «cargada». El contrato de voz ya usa una variable de Groq con el mismo nombre. Usar clave del ensayo y entorno aislados para preservar la configuración ordinaria de Voz. Variables propuestas para el futuro contrato, todas en servidor:

| Configuración | Autenticación y nombre de entorno |
|---|---|
| GroqCloud | Groq Console → API Keys. `GROQ_API_KEY`. [Quickstart](https://console.groq.com/docs/quickstart). |
| Workers AI | Workers AI Dashboard → Use REST API, token según el template y cuenta de prueba. `CLOUDFLARE_API_TOKEN`, más `CLOUDFLARE_ACCOUNT_ID` como identificador de configuración. [REST](https://developers.cloudflare.com/workers-ai/get-started/rest-api/). |
| Gemini Flash | Google AI Studio → API keys, proyecto elegible para Free. `GEMINI_API_KEY`. Revisar el tipo de clave actualmente aceptado antes del ensayo. [Claves](https://aistudio.google.com/docs/api-key). |

La eventual carga de esos secretos en **Render Dashboard → devnotes-pilot → Environment** es una acción posterior del dueño. Requiere contrato que seleccione proveedor y autorización expresa sobre SHA y ventana. Cargar solo las variables del proveedor elegido, guardar con **Save only** y desplegar por SHA después en la ventana autorizada. Mantener secretos fuera de chat, navegador de DevNotes, ejemplos versionados y registros. [Render Environment](https://render.com/docs/configure-environment-variables).

## Experimento posterior y aceptación

Tres textos ficticios congelados, con los mismos mensajes de sistema/usuario y orden para los tres proveedores, sin grounding ni tools. Acordar un máximo de tres primeras solicitudes por proveedor, y una repetición opcional preautorizada por muestra fallida que no sea por cuota/configuración. Tope propuesto para cada solicitud: 4.000 caracteres de ejemplo, 1.024 tokens de salida incluyendo razonamiento cuando el proveedor lo cuente. Usar razonamiento bajo si existe, registrar ajuste y diferencias de tokenización.

| Ejemplo | Comprobaciones |
|---|---|
| «Redactá un aviso breve del T-055. En /src/api/foo-bar.ts vimos ERR_CONNECTION_RESET tras recargar. El cambio todavía está en revisión.» | No convertir una observación en causa confirmada ni una revisión en despliegue. Conservar los tres tokens técnicos exactos y producir español claro. |
| «Pasá a prompt: reproducir el timeout del navegador. Abrir https://devnotes.example.test/tickets/T-055. Mantener la API. Confirmar que reintentar no duplique la solicitud.» | Objetivo, contexto, restricción y criterio completos. URL exacta y sin inventar herramientas, actores ni causas. |
| «Ana revisa /src/api/foo-bar.ts el 20/11. Falta comprobar ERR_CONNECTION_RESET. T-055 ya fue cerrado.» | JSON válido según esquema, citas literales, fecha y responsable solo en el primer pendiente, y excluir el trabajo cerrado. |

Registrar hora, entorno/versión del ensayo, modelo pedido y servido, estado, latencia de extremo a extremo por intento, tokens entrada/salida/razonamiento si se informan y Neurons o consumo observado en consola. Conservar total de tokens críticos exactos, hechos preservados, hechos añadidos, criterio de español (claridad y naturalidad) de 0 a 2 y tasa de parseo correcto. Con tres muestras, publicar tiempos individuales y mediana, sin extrapolar percentiles. Presentar la recomendación después de cotejar fidelidad y política de datos, incluso si la opción más rápida falla. La cuota/plan/controles públicos son insumos. La validez efectiva de credenciales, cuotas y comportamiento de JSON se registra en el ensayo autorizado.

## Checkpoint vigente

La propuesta original de Redactar como entrega separada queda archivada, sin PR ni paso de implementación. Continuar en el orden de [S-116](../specs/S-116-ai-workspace.md). Sus tareas reutilizan las muestras ficticias; un ensayo autenticado en Render requiere la habilitación del dueño según el contrato vigente.
