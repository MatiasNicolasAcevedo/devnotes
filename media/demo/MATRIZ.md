# Matriz de funciones de la demo narrada

Inventario del producto en `origin/main` `b0e46a3` (T-095 mergeada), tomado de las rutas de `client/src/app/AppRoutes.tsx`, de los controles de cada pantalla y del árbol de accesibilidad de la aplicación probada en el stack E2E propio. Cada función habilitada tiene una escena de [`script.json`](script.json) o una razón verificable de exclusión. El recorrido que la ejecuta es [`e2e/tests/demo-tour.spec.ts`](../../e2e/tests/demo-tour.spec.ts).

## Funciones con escena

| Función | Escena | Acción en pantalla | Resultado visible |
|---|---|---|---|
| Ingreso con Google (OIDC de prueba) | S01, S02 | «Continuar con Google» | Notas de hoy con la cuenta ficticia |
| Navegación principal (Voz, Notas, Referencias, Imagen, Historial) | S03 | El cursor recorre la barra | Cada destino resaltado |
| Estado del servidor | S03 | Cursor sobre «Online» | «Servidor conectado» |
| Espacios Trabajo y Personal | S04 | Selector «Espacio» → Personal → Trabajo | URL y selector cambian de espacio |
| Fecha de la nota diaria | S05 | Calendario y fecha de ayer | Barra con la fecha elegida |
| Escritura con líneas numeradas y autoguardado | S06 | Escribe tres líneas | Numeración y «Guardado» |
| Enlaces | S07 | Selección, «Enlace», URL, «Guardar» | «1279» como enlace |
| Separadores (`--25`, `--50`, `--75`, `---`) | S08 | `--50` y `---` con Enter | Separador al 50 % y completo |
| Guardar versión | S09 | «Guardar versión» | «Versión guardada correctamente.» |
| Ir a hoy | S10 | «Hoy» | Nota de hoy vacía |
| Copiar nota anterior | S10 | «Copiar nota anterior» | Contenido de ayer en hoy |
| Copiar nota al portapapeles | S11 | «Copiar nota» | Portapapeles con la nota |
| Historial y versión de solo lectura | S12 | «Historial» → versión de ayer | «Versión de solo lectura» |
| Referencias: crear | S13 | «Crear elemento», Título, Descripción | Elemento en la lista |
| Referencias: copiar, editar, eliminar | S14 | Cursor sobre las acciones y copia de la descripción | Portapapeles con la descripción |
| Insertar referencia con @ y vista previa | S15 | `@Runbook` y clic en el chip | Vista previa con la descripción |
| Lectura al lado | S16 | «Herramientas» → «Abrir al lado» → versión | Versión de ayer junto al editor |
| Libres: crear | S17 | «Libres» → «Nueva nota» | Editor con título y contenido |
| Libres: listas (viñetas, numerada, casillas) | S18 | «Lista» → «Casillas» y tilde | Casillas con la primera tildada |
| Libres: títulos y negrita | S19 | «Formato» → «Título 2» y «Negrita» | Encabezado con palabra en negrita |
| Libres: bloque de código y copia | S20 | «Herramientas» → «Bloque de código» → SQL, «Copiar código» | SQL resaltado y copiado |
| Libres: guardar, listado y borrado con confirmación | S21 | «Guardar», «Libres», «Borrar» → «Cancelar» | Nota en la lista y diálogo de borrado |
| Voz: grabar y transcribir | S22 | «Grabar» → «Detener» | Contador, nivel y texto transcripto |
| Voz: editar, copiar y guardar | S23 | Edición, «Copiar», «Guardar» | Nota en «Notas guardadas» |
| Imagen: pegar captura y extraer | S24 | Pegado, vista previa, «Extraer texto» | Texto extraído |
| Imagen: corregir, copiar y guardar | S25 | Edición, «Copiar texto», «Guardar» | «Texto copiado» y «Textos guardados» |
| IA: proveedor, modelo y estado por modelo | S26 | «Elegir proveedor y modelo», Workers AI 120B, «Aplicar» | Estado por modelo y destino aplicado |
| IA: consultar un fragmento del diario | S27 | Selección y «Consultar con IA» | «Fragmento a compartir» |
| IA: enviar y copiar la respuesta | S28 | Mensaje, «Enviar», «Copiar texto» | Respuesta y portapapeles |
| IA: añadir fragmento de una nota guardada | S29 | «Añadir fragmento» → Libres → selección | Fragmento de la nota libre |
| Exportar respaldo XLSX | S30 | Cuenta → «Datos de la cuenta» → «Descargar Excel» | «Descarga lista» |
| Cerrar sesión | S31 | Cuenta → «Cerrar sesión» | Visitante, luego otra cuenta |
| Importar: vista previa sin escribir | S32 | Archivo de respaldo | «Contenido del archivo» con totales |
| Importar: confirmación todo o nada | S33 | «Importar» → «Confirmar importación» | Importación terminada |
| Recuperación de lo creado | S34 | Notas, Libres, Voz, Imagen, Referencias | Contenido restaurado en la cuenta vacía |
| Vista angosta con navegación inferior | S35 | Ventana a 390 px | Cinco destinos abajo |
| Herramientas del editor en móvil, IA y cuenta arriba | S36 | «Herramientas» y «Voz» abajo | Diálogo de herramientas y Voz en móvil |

## Exclusiones por entorno o permiso

| Función | Razón | Verificación |
|---|---|---|
| Google real | La demo usa el proveedor OIDC de prueba del stack E2E. Su formulario se corta del montaje | `scripts/fixtures/oidc.json`, operación `reference-login` de `scripts/run-e2e.mjs` |
| Groq, OCR.space y proveedores de IA reales | Dobles propios del stack E2E con claves ficticias. Las respuestas dicen «transcripción de prueba» y «Resultado ficticio» | `docker-compose.e2e.yml`, `e2e/fixtures/voice-provider.mjs` y `ai-provider.mjs` |
| Actividad del servidor | El menú solo la ofrece con la ventana operativa de Render disponible. En el stack E2E el ítem no aparece | `SessionControls.tsx` (`available`) y árbol de accesibilidad del menú de cuenta |
| Gemini 3.8 Flash y OpenRouter | Diferidos en el piloto. El selector los muestra como «Diferido en este piloto» y no se pueden aplicar | Decisión de T-094 y `ai-workspace.spec.ts` |
| «Actualizar catálogo» de IA | Recarga el mismo catálogo del doble, sin cambio visible | Diálogo «Proveedor y modelo» |
| Errores de proveedor, cuota, conflictos de revisión y caída del servidor | Estados de error. Requieren inyectar fallas y no son una función de uso | `voice.spec.ts`, `ai-workspace.spec.ts`, `daily-notes.spec.ts`, `system.spec.ts` |
| Swagger UI | Herramienta de desarrollo habilitada solo en loopback, fuera del producto para usuarios | ADR 0003 y `swagger.spec.ts` |
| Gestos táctiles propios del teléfono | La vista angosta es la misma interfaz por ancho (`useMediaQuery`), sin gestos distintos. Se muestra con la ventana a 390 px | `AppShell.tsx`, `useIsNarrow.ts` |
