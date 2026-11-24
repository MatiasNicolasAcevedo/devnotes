---
id: S-102
status: approved
version: 1
milestone: M1
tasks: [T-005, T-009, T-012, T-014]
---
# S-102 · Enlaces sobre texto

## Objetivo I1 y contrato compartido

CA-02/05: enlazar identificadores conservando texto, editar/quitar/abrir y persistir el mismo JSON. Contrato compartido por base de representación T-005, interacción T-009, lectura T-012 y validación T-014. Depende de S-101 (documento y cola) y T-008 mergeada antes de la interacción por la ruta secuencial. Las tareas compartidas tienen una sola implementación/PR y una spec primaria en frontmatter; no se ejecutan dos veces. Retorno a frontera en salida I1/T-014 o decisión fuera de contrato.

## Reglas e interacción

Ctrl+K (Mod-k en Tiptap admite Cmd+K) solo dentro del editor editable: selección no vacía dentro de un paragraph abre diálogo MUI Enlace; conserva bookmark de selección, texto visible y foco. Selección que cruza bloques o incluye separator se rechaza con mensaje local, sin mutar. Cursor dentro de un link permite editar/quitar la marca completa; una selección dentro de él modifica o quita la marca únicamente en el rango seleccionado, según solicitud del dueño del 2026-10-27. El texto escrito después del final del enlace no hereda su marca. Selección nueva sin link aplica solo al rango. Si cruza varios enlaces diferentes, pedir seleccionar uno sin cambio. Cursor sin selección/enlace muestra «Seleccioná un texto para enlazar». Una selección nueva puede reemplazar su marca de enlace única.

Formulario RHF/Zod URL con label, error junto al campo, Guardar/Cancelar/Quitar enlace (esta última solo para existente), abrir URL válida mediante enlace nativo a nueva pestaña target=_blank rel=noopener noreferrer. Validar HTTP/HTTPS absoluto y límites de S-101; no autolink/linkOnPaste ni normalización visible del texto. La entrada de URL se normaliza según el [ajuste del 2026-11-24](#ajuste-del-dueño-del-2026-11-24). Rechazar javascript:, data:, relativas, mailto:, controles, host vacío y credenciales. Cancelar o URL inválida conserva JSON/selección y no dispara autosave. Guardar restaura bookmark, aplica marca y foco; Quitar conserva texto. Escape cierra y restaura foco.

En edición click normal posiciona cursor; abrir mediante acción «Abrir enlace» accesible en diálogo (también Ctrl+click como comodidad si se prueba). En readonly link nativo abre al activarlo; Ctrl+K y mutaciones deshabilitados. No hacer fetch/preview al destino; E2E intercepta únicamente dominio externo ficticio si necesita observar apertura, nunca API propia.

## Datos/API/seguridad

Usar link mark de S-101, con **attrs.href únicamente** en JSON; extender addAttributes para excluir defaults target/rel/class, generando los atributos seguros solo en render HTML. Ningún endpoint, tabla ni migración nuevos. Server valida de nuevo href en cualquier PUT. No guardar HTML. Estado solo en editor y diálogo en memoria, limpiado por cambio identidad. Una acción válida participa del debounce/cola existente. Persistencia/recarga conserva texto/href; readonly muestra igual sin posibilidad de alterar la copia.

## Aceptación y pruebas

| ID | Caso | CA | Archivo/capa | Tarea |
|---|---|---|---|---|
| L-00 | Mark href-only renderiza y hace roundtrip sin defaults extras ni pérdida de texto | 02/05 | dailyDocument.test.ts, DailyEditor.test.tsx | T-005 |
| L-01 | Seleccionar 1279/Ctrl+K/URL válida conserva exactamente texto y agrega marca; editar/quitar roundtrip | 02 | LinkDialog.test.tsx, componente con editor real | T-009 |
| L-02 | javascript/data/URL relativa y selección cruzada no alteran JSON ni guardan; Escape restaura foco | 05 | LinkDialog.test.tsx, negativos | T-009 |
| L-03 | Reabrir y readonly preservan marca; apertura segura sin preview remoto | 02/05 | daily-notes.spec.ts, Playwright real | T-014 |
| L-04 | Historial muestra enlace seguro sin shortcut de edición ni mutaciones | 02/05 | DailyHistoryPage.test.tsx | T-012 |

## Tareas y dependencias

T-005 (representación común, espera T-004) → T-009 (interacción, espera T-008 en cola global) → T-012 (lectura, espera T-011) → T-014 (recorrido, espera T-013). Cada transición exige MERGED y nueva sesión. Los contratos concretos están enlazados por BACKLOG; no hay trabajo paralelo ni PR duplicado por compartir esta spec.

## Archivos y decisiones

daily/editor/link.ts, LinkDialog.tsx, DailyEditor.tsx y tests en client; paquete extension-link ya fijado en T-005. Probar transformaciones con Tiptap real; no emular selección DOM solo para hacer verde. Si jsdom limita geometría, mantener unitarios de transacción y verificar selección/teclado en navegador real. Documentación oficial: [Link](https://tiptap.dev/docs/editor/extensions/marks/link). Planificación frontera/Codex 2026-10-20, v1; approved no equivale a prueba ejecutada.

## Ajuste del dueño del 2026-11-24

El diálogo acepta direcciones sin esquema, como `google.com` o `www.google.com`. Pedido del dueño para no exigir `https://`: el formato no debe impedir guardar aunque el destino no exista. El cliente normaliza la entrada a un href HTTP/HTTPS absoluto antes de aplicar la marca. Si falta el esquema, antepone `https://`. Después serializa con `URL` y codifica lo que `java.net.URI` rechazaría. El contrato del documento de [S-101](S-101-daily-notes.md) no cambia: el JSON guarda un href absoluto y el servidor lo valida igual, sin convertirlo. `javascript:`, `data:`, `mailto:`, otros esquemas, credenciales, dominios inválidos y más de 2048 caracteres se siguen rechazando con mensaje junto al campo. La regla, la tabla de entradas y la invariante con el servidor están en [T-100](../tasks/T-100-flexible-links-nav-order.md#alcance-y-decisiones-resueltas).
