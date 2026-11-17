# DevNotes · Diseño de Imagen, Notas e IA

Referencia para la revisión de frontend de T-073…T-091. Parte de la PWA oscura de Windows del dueño. Las capturas adjuntas sirvieron para localizar el espacio antes de la primera línea y el listado bajo Notas. Todos los ejemplos de esta referencia son ficticios.

## Sistema visual

Conservar el tema MUI del producto. Fondo `#181a1b`, superficies `#212324`, divisor `#393d42`, texto `#e1e3e6`, selección de navegación `#ffb74d` y acento de IA `#ceb6ff` sobre tinta `#211630`. El azul de acción/foco existente y el verde de Trabajo/guardado mantienen su significado. Usar la fuente de sistema de DevNotes para controles y Roboto Mono con fallback monoespaciado para diario y código. El cuerpo de Libres y del compositor usa 16 px. Alinear cabeceras con el contenido y conservar radios de 8 px, líneas divisorias y rellenos cortos.

La barra de la ventana instalada queda a cargo del sistema. En escritorio la barra web de 48 px agrupa espacio, destinos y cuenta. Mantener destinos completos mientras entren y usar la navegación inferior existente cuando el ancho no alcance. Imagen se coloca entre Referencias e Historial. En móvil se conservan cinco celdas inferiores iguales y área segura, con objetivo de 48 px de alto. **IA** vive en la barra superior junto a la cuenta. Retirar el texto de conexión a estrecho si hace falta y conservar su nombre accesible. **Libres** vive al lado de la fecha de Notas, y nunca se duplica como otro tab global. La barra contextual persigue una fila de 48 px o menos en escritorio al 100 % y puede crecer cuando el zoom lo exige. Los iconos tienen nombre, foco visible y destino de foco al cerrar. Menús desplegables fuera del flujo, sin paneles que tapen la primera línea al cerrarse.

En cada tarea de frontend, usar frontend-design sobre el alcance y cotejar el resultado con esta referencia en la app, con vista real de escritorio angosto y móvil según la tarea. En tareas de API, validar que DTOs y estados puedan alimentar esos mismos estados de UI. Registrar por tarea las vistas o estados comprobados con datos ficticios. La previsualización visual acompaña las pruebas de interacción y no acredita implementación.

[WCAG 2.2: Reflow, tamaño de objetivos, foco y alternativa a arrastrar](https://www.w3.org/TR/WCAG22/) · [WAI: navegación con disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/).

## Diario y Libres

```text
Trabajo ▾   Voz  Notas  Referencias  Imagen  Historial      ✦ IA  Cuenta
16/11 ▾  Hoy  Libres              Guardado      Guardar    Herramientas
01  Revisar despliegue
02  Actualizar variable del servicio
    …
```

Fila estrecha de Diario: fecha · Libres · Guardar versión · Herramientas. Mostrar error en región viva y permitir retry; evitar barras permanentes para un estado normal. Eliminar el listado que se veía abajo. Conservar borradores por calendario y copias en Historial. Medir la primera línea en CSS px desde el inicio del área web con la misma ventana; [aceptación exacta](../specs/S-114-writing-editor.md#diario--t-081).

```text
Directorio   [Diario]  Libres                       [Nueva nota]
             Checklist del despliegue               16/11      [⋯]
             Ideas para DevNotes                    15/11      [⋯]

Edición      [‹ Libres]                    [Lista] [Formato] [⋯] [Guardar]
             Título
             [Checklist del despliegue                       ]
             [Notas de la versión                            ]
             ☐ Revisar readiness
             ┌ SQL                         Copiar código ┐
             │ SELECT status FROM deployments;           │
             └────────────────────────────────────────────┘
```

Las acciones de formato aparecen cuando llega su tarea y aplican al cuerpo. En móvil usar iconos con nombre y concentrar los controles secundarios en Herramientas. Párrafo plano, lista y bloque tienen jerarquía por sangría, semántica y superficie discreta. En código, copia y lenguaje en una sola fila; fondo ligeramente más oscuro, foco claramente visible y scroll local.

## Imagen

```text
Imagen a texto
┌ Captura ─────────────────────┐   ┌ Texto extraído ─────────────┐
│                             │   │                             │
│      Pegá tu imagen acá     │   │                             │
│                             │   │                             │
└─────────────────────────────┘   └─────────────────────────────┘
Pegar   Elegir imagen              Copiar texto   Guardar
PNG o JPG, hasta 1 MB              Textos guardados
[Extraer texto]                    [16/11  Revisar deploy…   ⋯]
```

Columna única debajo de 880 px de ancho útil. Primero pegar, luego elegir archivo y arrastrar para escritorio. En móvil prevalece Elegir imagen. Caja vacía con texto no seleccionable y foco interno. Mientras se arrastra un archivo, usar el mismo borde azul de foco para distinguir destino. Tras validar consume solo vista previa. Confirmar reemplazo con texto editado. El aviso precede cada extracción. **Textos guardados** sigue el modelo de Voz con fecha, extracto, apertura y borrado. Carga, vacío, 429, archivo inválido y confirmación tienen estados distinguibles.

## Consulta al lado

```text
┌ Diario editable ──────────────────┐  ┌ Consulta ──────────────────┐
│ 16/11   Libres        Herramientas │  │ Notas del 12/11 Cambiar  × │
│ 01  Revisar despliegue              │  │ Versión guardada           │
│ 02                                 │  │ Revisé la versión…         │
└────────────────────────────────────┘  └────────────────────────────┘
```

Conservar aproximadamente 60/40 desde 1.100 px útiles. El lector tiene scroll propio y una cabecera más discreta que el editor. No usar modal persistente ni duplicar nav. Debajo del umbral, **Ver consulta** preserva acceso por una sola columna.

## IA

```text
Trabajo ▾             navegación existente                ✦ IA  Cuenta

IA                                   Proveedor y modelo
                                     [GroqCloud · GPT OSS 20B ▾]
¿Podés ordenar estos pasos de despliegue?
Respuesta                                       GroqCloud · GPT OSS 20B
1. Confirmá la versión en revisión.
2. Comprobá readiness después de desplegar.               [Copiar texto]

[Escribí un mensaje…                                                   ]
[+ Añadir fragmento]                 Se enviará a GroqCloud.   [Enviar]
```

Lila reservado para el acceso y el botón principal de IA. Estrellas estáticas con brillo suave al enfocar o pasar el cursor, sin animación continua. En estrecho, etiqueta y dropdown a ancho completo, respuestas y compositor en flujo vertical y controles táctiles. Con OpenRouter se muestra otro selector justo debajo para el modelo gratuito, con filtro y refresco. Mostrar al lado del campo el destino antes de enviar. Después de un fallo, conservar el mensaje y dejar el cambio de proveedor al alcance del mismo selector. En cuota mostrar solo dato interpretado y su hora; las otras opciones llevan al sitio del proveedor si corresponde. El selector de notas y su vista exacta aparecen en T-091.
