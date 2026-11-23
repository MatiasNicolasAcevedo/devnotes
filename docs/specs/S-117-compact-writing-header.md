# S-117 · Barra superior compacta para escribir en ventana chica

## Intención

El dueño escribe y lee notas con DevNotes en una ventana restaurada. Marcó la barra interna que contiene Personal, Demo, estado del servidor y Cuenta. Aprobó reducir el cuerpo de letra de esa fila. La superficie marcada corresponde a `AppShell`, arriba de la barra de fecha y debajo del marco nativo de Windows. [Compactación previa del Diario](S-114-writing-editor.md) · [Contrato del selector de espacio](S-109-private-spaces.md).

## Diseño

Una fila sigue mostrando el espacio activo a la izquierda y los controles de sesión y estado a la derecha. Demo e IA conservan sus nombres y su accesibilidad según las reglas de ancho vigentes. Se conservan los acentos de la app, la tipografía del editor y la posición de la navegación inferior. El espacio liberado arriba aumenta el alto visible para escribir.

```text
┌ Personal ▾ ─────────────── Demo  ●  [IA ▾]  Cuenta ┐  32 px CSS
│ Fecha   Libres   Hoy   Enlace          … Guardar  │
│ 1  Texto de la nota                               │
│    Área de escritura con más alto visible         │
└ Notas       Voz      Referencias    Imagen  Historial ┘
```

La variante compacta se activa para una sesión autenticada al entrar en Diario (`/notes` y fecha) o Libres (`/free-notes` y sus rutas), cuando se cumpla `(width < 768px) and (hover: hover) and (pointer: fine) and (not (any-pointer: coarse))`. Se actualiza al redimensionar. Los dispositivos híbridos con puntero táctil conservan los objetivos cómodos. En las demás rutas y condiciones rige la densidad actual. El criterio se basa en el viewport CSS del contenido, de modo que la misma ventana funciona en navegador o PWA.

La fila compacta mide **32 px CSS**, más el `safe-area-inset-top` cuando corresponda. Es una decisión de diseño para aproximar la reducción solicitada y dar lugar a controles de **28 px de alto mínimo**, con foco visible íntegro. En Diario recupera 16 px respecto de los 48 px actuales. El selector muestra «Trabajo» o «Personal» completo, en una línea. Las etiquetas de cabecera pueden reducirse hasta 13 px equivalentes a tamaño base. Las opciones de los menús conservan sus tamaños y el orden de tabulación se mantiene. La variante táctil conserva el mínimo de 44 px del selector, Demo, Cuenta e IA y el de 48 px en los destinos inferiores. Se mantiene el Demo con solo ícono por debajo de 360 px, con nombre accesible.

La densidad es presentación y se deriva del viewport y de la capacidad de entrada. Se conserva la nota, el cursor, el foco y los guardados al cambiar de ancho. El Diario sigue llenando el espacio real disponible. El alto de Libres debe descontar la altura efectiva de la barra y aprovechar la fila más baja, respetando mínimos, áreas seguras y scroll. El cambio abarca cliente y E2E. El marco nativo, la barra de herramientas del Diario, los permisos, los datos y la API quedan fuera de alcance.

## Aceptación

| Caso | Resultado observable |
|---|---|
| AC-01 · Ventana restaurada | A 640×480 CSS px, con puntero fino y sin táctil, la barra mide 32 px más área segura. En el mismo viewport, tema y estado de pantalla, el alto útil del Diario y de Libres gana al menos 16 px respecto de la base. Medir el viewport de escritura, no solo el borde de la tarjeta. La barra y el editor quedan dentro del espacio hasta la navegación inferior. |
| AC-02 · Reflujo y foco | A 320, 375 y 767 px de ancho con puntero fino, la fila cabe sin scroll horizontal, solapamiento o texto del espacio cortado, también con IA disponible. Al cruzar 767↔768 con el editor enfocado se conservan texto y cursor. El selector se opera por teclado y Escape devuelve el foco. Demo, Cuenta e IA disponible son alcanzables, con foco visible. |
| AC-03 · Densidad vigente | A 768 y 1280 px se conservan la altura y la disposición vigentes. A 375 px con táctil, y en un dispositivo híbrido con `any-pointer: coarse`, no se activa la densidad baja. El menú del selector conserva filas de al menos 48 px y la navegación inferior su mínimo de 48 px. |

La captura del dueño orienta el diseño. Las medidas de la tabla se verifican en Chromium con datos ficticios; el tamaño externo de la ventana de Windows no sustituye el viewport de prueba. [Tarea T-098](../tasks/T-098-compact-writing-header.md).
