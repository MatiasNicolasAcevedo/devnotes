---
id: T-017
status: draft
priority: P2
size: S
executor: frontier
role: planner
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 1
branch: codex/t-017-voice-readiness
pr: null
depends_on: [T-014]
---
# T-017 · Habilitar la iteración posterior de voz

## Objetivo

Tras cerrar I1, dejar los paquetes A…F de S-105 convertidos en tareas pequeñas ejecutables por Junie y validar la viabilidad de Groq/Whisper. Esta tarea es de frontera, no una tarea liviana de implementación ni una dependencia de I1.

## Alcance y decisiones pendientes explícitas

Intención de producto confirmada en PROJECT_CONTEXT/S-105. Draft por I1 no terminada y configuración/proveedor todavía sin validar. No habilitar como ready solo porque T-014 esté MERGED: primero conciliar I1 y resolver formato efectivo, modelo disponible, cuotas de la cuenta, retención, límites y permiso/configuración para un smoke ficticio. No leer/imprimir claves reales ni autenticar/instalar herramientas por inferencia; el dueño provee la configuración por un canal seguro al habilitar el servicio. No contratar plan pago ni usar audio real sin decisión específica según AUTONOMY.

## Leer antes

1. [PROJECT_CONTEXT, I2](../../PROJECT_CONTEXT.md#i2-posterior--notas-por-voz).
2. [S-105](../specs/S-105-voice-notes.md).
3. [T-014](T-014-mvp-journey.md), solo salida/MERGED y evidencia CA.
4. [Planner](../agents/planner.md).
5. [AUTONOMY](../AUTONOMY.md); TESTING es entrada común al concretar comandos de tareas.

## Archivos y pasos

1. Comprobar main/PR/CI y T-014 MERGED; conciliar su done y salida I1 antes de preparar otra iteración. Confirmar datos ficticios y configuración segura sin exponer secretos.
2. Revalidar las fuentes oficiales enlazadas en S-105 y probar compatibilidad con un audio sintético no personal cuando exista autorización/configuración. Comparar español/términos técnicos y registrar errores/latencia sin publicar el audio ni su contenido. Si falta algo indispensable, checkpoint con dato necesario; no inventar éxito ni extender pruebas equivalentes.
3. Resolver límites, esquema/API, estados/errores, propiedad/concurrencia/borrado, configuración upload/proxy y estrategia de pruebas en S-105. Convertir A…F en tareas con máximo cinco referencias, ramas exactas, archivos acotados y comandos reales sobre main de I1. Decidir qué tareas tocan configuración y requieren STARTER.
4. Actualizar ROADMAP/BACKLOG/STATUS y habilitar solo la primera tarea con dependencias/decisiones satisfechas. Publicar contratos junto al primer avance autorizado de I2, sin PR separado de planificación. No implementar toda I2 aquí.

## Aceptación y pruebas

Trazabilidad VO-01…07 → tareas/pruebas, límites/proveedor/retención fechados, smoke ficticio claramente realizado o bloqueado con causa, sin aceptación de audio real. Toda tarea Junie ready tiene contrato y comandos ejecutables; las posteriores draft indican dependencia concreta. Mantener intactos CA-01…06 y suites de I1.

La planificación solo Markdown usa DOCS_ONLY desde raíz: `node scripts/docs-check.mjs` y `git diff --check`; `bash scripts/verify.sh --policy origin/main` clasifica commits publicados y se revisa también el diff pendiente. El smoke externo y los comandos de desarrollo no se fijan como ejecutados: T-017 debe concretarlos al conocer configuración/modelo efectivos; no es contrato implementer listo ni se ejecuta durante I1.

## Checkpoint vigente

2026-10-21, propuesta posterior registrada por frontera/Codex a pedido del dueño. Sin cuenta/clave comprobada, sin audio enviado, código, migración, dependencias, PR ni pruebas de voz. Próximo responsable frontera después de I1; no bloquea Junie T-001.

## Correcciones significativas

Sin implementación ni correcciones; no confundir la investigación pública con calidad/viabilidad ejecutada.

## Cierre y siguiente tarea

Salida: primera tarea Junie de I2 predefinida y habilitable con el contrato ya cerrado. Si faltan proveedor/permisos/viabilidad, registrar decisión concreta al dueño; no presentar los paquetes A…F como ready. No anticipar aceptación de runtime ni realizar merges propios.
