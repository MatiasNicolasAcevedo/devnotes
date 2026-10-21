---
id: S-103
status: approved
version: 1
milestone: M1
tasks: [T-005, T-008, T-012, T-014]
---
# S-103 · Separadores numerados

## Objetivo I1

CA-01/03: sustituir un comando completo de una línea al Enter por un nodo separator, con ancho relativo al área de contenido (excluye gutter), número consecutivo propio y eliminación por teclado. Depende de T-007/S-101; T-009 sigue tras merge. Retorno a frontera al objetivo I1 completo o decisión fuera de contrato.

Capacidad compartida entre T-005 (nodo/render/roundtrip), T-008 (comandos/borrado), T-012 (historial readonly) y T-014 (navegador real). Cada tarea conserva un solo PR y spec primaria; compartir este contrato no duplica ejecución.

## Contrato de edición

Nodo superior atom/block/selectable `{"type":"separator","attrs":{"width":25}}` ya permitido por S-101. Anchos exactos 25/50/75/100, alineado a izquierda. Una línea y un número por nodo. Render semántico role=separator con ancho porcentual; gutter fuera del ancho. Sin texto editable ni atributo HTML arbitrario.

Al Enter, sin selección y cursor al final de paragraph cuyo texto completo sea --25, --50, --75 o --- sin marcas, convertir en una sola transacción al ancho correspondiente y colocar cursor en paragraph vacío siguiente (crearlo si hace falta). Si queda contenido siguiente, conservarlo; no saltarlo. Un comando con espacios extra, prefijo/sufijo, marks, cursor intermedio, selección no vacía o pegado sin Enter no se transforma: Enter normal conserva contenido. No transformar --- en paste automáticamente.

Desde paragraph vacío siguiente, Backspace elimina el separator anterior y mantiene un paragraph editable; nodo seleccionado se borra con Backspace/Delete y deja cursor válido. Undo recupera comando/estado anterior de la transacción y redo vuelve al resultado, sin múltiples números ocultos. Shift+Enter es división normal de línea, sin conversión de comando. Readonly no ejecuta shortcuts ni borra. Documento compuesto solo de separator debe permitir entrar/salir con teclado y dejar una línea al borrar todo.

## Datos y seguridad

Mismo JSON/PUT/cola de S-101, sin endpoints/migraciones/dependencias nuevas. Backend rechaza width ajeno a enum y nodo con hijos/marks. Render determinista en editor e historial, no usar HTML servido por API.

## Aceptación trazada

| ID | Caso | CA | Prueba | Tarea |
|---|---|---|---|---|
| R-00 | Nodo ya permitido conserva width/posición al cargar y serializar el editor | 01/03/05 | dailyDocument.test.ts, DailyEditor.test.tsx | T-005 |
| R-01 | Cuatro comandos exactos/Enter producen nodo correcto + cursor editable, numeración consecutiva | 01/03 | separator.test.ts (editor/transacción real) | T-008 |
| R-02 | Espacios, selección, línea marcada, cursor intermedio y paste no convierten; borrar/undo no pierde texto | 03 | separator.test.ts + DailyEditor.test.tsx | T-008 |
| R-03 | Anchos relativos reales, wrap sin número extra, 375/1280 y roundtrip | 01/03/05 | daily-notes.spec.ts | T-014 |
| R-04 | La copia muestra separadores y números sin permitir comandos/borrado | 01/03/05 | DailyHistoryPage.test.tsx | T-012 |

## Tareas y dependencias

T-005 (espera T-004) → T-008 (espera T-007) → T-012 (espera T-011) → T-014 (espera T-013), respetando además toda la cola secuencial de BACKLOG. MERGED y nueva sesión antes de cada implementación, sin PR extra de capacidad.

## Implementación y ruta

Extender daily/editor/separator.ts con addKeyboardShortcuts Enter/Backspace y pruebas; estilos existentes para render se conservan/ajustan si corresponde. No depender del inputRule horizontalRule de StarterKit. Documentación oficial consultada: [nodo](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node). Frontera/Codex, 2026-10-20, contrato v1 aprobado por alineación con brief; no acreditación de runtime.
