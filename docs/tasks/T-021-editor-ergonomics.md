---
id: T-021
status: in_review
priority: P1
size: M
milestone: M1
spec: null
depends_on: [T-020]
branch: codex/t-021-editor-ergonomics
role: implementer
executor: frontier
pr: 22
---
# T-021 · Correcciones de uso del editor

## Contrato

Solicitud del dueño del 2026-10-27 tras prueba local: pegar y copiar texto multilínea con espacios, caracteres Unicode y símbolos sin perder líneas; quitar el enlace solo de la selección, escribir fuera al final; mantener visible el borde de foco durante scroll; compactar navegación, fecha y acciones conservando accesibilidad y ancho 375. Cambia el comportamiento de selección de S-102 según la solicitud; se conserva el formato JSON, límites, guardado, seguridad y navegación existentes. Referencia sigue siendo la capacidad técnica existente, no se agrega funcionalidad.

Codex desktop, modelo GPT-6, esfuerzo no expuesto; PowerShell/Git Bash, Node, Docker y skill frontend-design; sin delegación. Impacto en UI y edición; sin cambios de API, permisos, dependencias ni esquema. Base inicial main `cde66f4693fad0ea6d2bb0c738e5138ef1ab3a00`, PR #20 MERGED verificado. Se conservan los cambios documentales de arranque solicitados en la sesión previa y el stack persistente del dueño.

## Checkpoint vigente

Implementación publicada en `f288275db772d86d7d9931565196af06e9aa333c`, [PR22](https://github.com/MatiasNicolasAcevedo/devnotes/pull/22) contra main; pendiente revisión independiente y CI. FULL final **exit 0**, `t021-full-r4.log`: docs, backend (153 unitarias y 144 IT PostgreSQL), cliente (336 pruebas, cobertura statements 91.03 %, typecheck/lint/formato/build) y Playwright real (39/39 escritorio y móvil) OK. Huella antes/después de fuentes `0682065b0a29e7b1bfae33ba01d95527fe3397ae`; base local/remota `cde66f4693fad0ea6d2bb0c738e5138ef1ab3a00`. Los namespaces propios de verify y E2E se limpiaron y comprobaron sin contenedores, redes ni volúmenes. El cierre documental posterior no cambia las fuentes verificadas.

Comando FULL: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t021-r4 STARTER_E2E_PROJECT=starter-e2e-t021-r4 STARTER_SERVER_TESTS=container bash scripts/verify.sh > t021-full-r4.log 2>&1`. Solo fixtures ficticias; trap E2E y `docker compose --env-file .env.example -p starter-verify-t021-r4 --profile verify down --volumes --remove-orphans`. En la retoma se reconstruyó únicamente el cliente del stack persistente `starter-dev-devnotes-preview-1027`; backend/DB siguieron activos y la sonda local pasó. La aplicación actualizada está disponible para prueba manual.

Ejecuciones previas no acreditan gate: primer FULL interrumpido para corregir serialización de copiado; segundo detectó una regresión al abrir enlace; tercero pasó escritorio pero quedó interrumpido en móvil (`t021-full-interrumpido.log`). Los recursos de esas ejecuciones se limpiaron. La corrección de clic/arrastre pasó 20 pruebas dirigidas y el FULL final.

## Bitácora

| Problema / causa | Corrección | Prueba |
|---|---|---|
| Pegado solo insertaba el primer párrafo | Slice de texto plano con líneas y espacios; validación previa y aviso ante límite | Rojo en DailyEditor; pruebas dirigidas verdes |
| Selección parcial se expandía al enlace entero | Expandir solo con cursor; marca no inclusiva al final | Rojo en DailyEditor; pruebas dirigidas verdes |
| Copiado por defecto separaba párrafos con doble salto | Serialización de texto con un salto por línea lógica | Playwright escritorio/móvil verde en FULL |
| Clic sobre enlace con selección previa no abría destino | Distinguir clic de arrastre para conservar selección y apertura | T-020 Playwright rojo; 20 dirigidos y FULL verdes |
| Foco pintado sobre contenido se desplazaba con el texto | Indicador en el área desplazable | Playwright escritorio/móvil verde en FULL |
