---
id: T-075
status: draft
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-074]
branch: codex/t-075-image-text-library
role: planner
executor: frontier
pr: null
---

# T-075 · Guardar y borrar textos de Imagen

## Objetivo

En **Imagen**, guardar el resultado editado, reencontrarlo en una lista y borrarlo cómodamente cuando ya no haga falta.

## Alcance acordado

El dueño eligió guardar como en Voz, con una colección propia de **Textos guardados**. Guardar exige un gesto explícito y conserva texto, fecha y espacio. La captura, su nombre y el contexto del editor quedan fuera del registro. Cada fila muestra extracto, fecha, acceso para abrir y acción de borrar. Usar confirmación y recuperación de foco como en Voz. El borrado debe reflejarse en la lista tras la respuesta del servidor. Abrir, copiar, guardar y borrar operan sobre el texto y no consumen cuota del proveedor.

## Aceptación a refinar

El dueño ve sus textos guardados tras recargar, separados entre Trabajo y Personal y protegidos de otras cuentas. Puede copiar un texto guardado y borrar uno sin tocar los demás. Guardar y borrar fallidos muestran un error y conservan el estado previo. Una captura elegida o extraída sin guardar sigue siendo transitoria.

## Checkpoint vigente

Draft por T-074 y diseño pendiente de persistencia y recuperación. Antes de implementación, separar contratos pequeños de API, interfaz y portabilidad según el impacto. Revisar [Voz](../specs/S-105-voice-notes.md), autorización por owner/space y [XLSX v2](../specs/S-109-private-spaces.md#portabilidad-xlsx-v2). La guía de respaldo debe explicar si incluye los resultados guardados y cómo se restauran. Conservar lectura de libros existentes. Diseñar fixture de otra cuenta/espacio y criterios de creación, consulta y borrado antes de habilitar la persistencia. T-072 sigue en pausa.
