---
id: T-068
status: in_review
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-067]
branch: codex/t-068-ocr-api
role: implementer
executor: frontier
pr: 71
---

# T-068 · Extracción OCR autenticada con proveedor simulado

## Objetivo

La API privada acepta una captura válida y devuelve texto extraído, con permisos y errores comprobables frente a un doble HTTP de OCR.space. Esta entrega prepara el contrato y la configuración del servidor para T-069.

## Alcance y decisiones resueltas

Aplicar íntegro el [contrato HTTP de S-112](../specs/S-112-screenshot-ocr.md#contrato-http-datos-y-errores). Usar la autenticación, CSRF, enum de espacios, ProblemDetail y entrada HTTPS de proveedor de la aplicación. Validar y acotar antes de invocar el adaptador. El servidor arranca con OCR apagado y permite verificar capacidad sin consultar al proveedor. Se prueba el multipart saliente con bytes ficticios y la cabecera con un valor ficticio. Sin interfaz de usuario ni pruebas autenticadas contra OCR.space. Si el contrato global multipart/proxy no permite el límite puntual, mantener intactos sus demás consumidores y probar esa regresión.

## Leer antes

[Decisión de envío y contrato S-112](../specs/S-112-screenshot-ocr.md), [server/AGENTS](../../server/AGENTS.md), [seguridad existente](../../server/src/main/java/com/example/devnotes/security/SecurityConfig.java), [cuenta y espacios](../specs/S-109-private-spaces.md#contrato-http-y-compatibilidad) y [selección de pruebas](../TESTING.md#elegir-pruebas-para-una-tarea-pequeña).

## Archivos y pasos

1. Acreditar MERGED de T-067 y registrar la decisión de espacios. Si se autoriza envío, pasar a ready y llevar estos Markdown a la rama exacta de T-068 sobre main remoto. Las variables quedan apagadas por defecto incluso con la decisión de producto registrada.
2. Crear el endpoint de OCR, su validador y adaptador en `server/src/main/java/com/example/devnotes/ocr/`. Reutilizar configuración de seguridad y API común. Inyectar `DEVNOTES_OCR_ENABLED`, `DEVNOTES_OCR_ALLOWED_SPACES` y `OCR_SPACE_API_KEY` solo en el servicio `server` mediante `docker-compose.yml` y defaults vacíos en `.env.example`. El destino real es fijo. Inyectar el doble en los tests sin exponer un override de URL en ejecución ordinaria.
3. Correr los dirigidos, registrar evidencia por SHA/base y el perfil clasificado. Publicar para revisión independiente con las reglas del repo.

## Aceptación y pruebas

| Criterio observable | Prueba dirigida |
|---|---|
| Sesión ausente y CSRF inválido bloquean. Un espacio denegado devuelve 403. `work/personal` se evalúan según configuración. Flag apagado o clave ausente devuelven no disponible sin tráfico externo. Sólo un archivo, espacio explícito sin repetición y sin URLs. | `OcrExtractionApiIT`, HTTP con OIDC ficticio y PostgreSQL real, incluyendo dos sesiones para distinguir la concurrencia por cuenta. |
| PNG/JPEG válido viaja como multipart al doble con bytes exactos, nombre neutro y header esperado. 1.000.000 bytes permitidos y un byte más rechazado. Vacío, corrupto, MIME/bytes discordantes, dimensiones y multipart excesivos no contactan al proveedor. | `OcrScreenshotValidatorTest`, `OcrSpaceClientTest` y `OcrExtractionApiIT`. |
| Texto completo conserva IDs/rutas/saltos. Respuesta parcial, error en 200, sin texto, cuota 429 y señal explícita en 200, proveedor lento, cuerpo grande o ambiguo tienen resultado tipado, sin filtrar cuerpo ni secretos. No sigue 3xx ni reintenta. | `OcrSpaceClientTest` usa servidor HTTP local. Verificar adquisición/liberación de cupos, incluido error, timeouts y concurrencia global por instancia, en `OcrExtractionApiIT`. |
| Configuración ordinaria conserva extracción apagada y voz/importación con sus límites. El secreto de prueba pasa al server por Compose, nunca a client. | Comprobar con una configuración ficticia y pruebas existentes de voz y portabilidad. Validar que el PNG/JPG permitido pasa por el proxy en T-070. |

Desde `server/` con Git Bash, JDK 21 y Docker Linux:

```bash
./mvnw -q verify -Dtest=OcrScreenshotValidatorTest,OcrSpaceClientTest,OcrConfigurationTest -Dit.test=OcrExtractionApiIT,VoiceTranscriptionApiIT,PortabilityImportApiIT -Djacoco.skip=true
```

Los nombres `Ocr*` son clases a crear. Guardar recuentos Surefire y Failsafe. Desde raíz ejecutar `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. La clasificación aplica la política ordinaria de iniciativas nuevas de [TESTING](../TESTING.md#regla-general-fuera-de-la-excepción) en el cierre técnico, según instrucciones vigentes del dueño. El integrado de I5 queda diferido. Gates de OCR con dobles y valores ficticios.

## Checkpoint vigente

Frontera reabrió el cierre técnico en `.orchestrator/t-068-ocr-api` sobre `31a9da0464ad790008f611860dc5975235209ac8`. GitHub reconfirmó PR70 MERGED contra main, `verify-required` verde y squash `405e7e58b5133220acd2e9c8c425594323469124` igual a main remoto, con cero PR abiertos.

El ensayo nginx aislado reprodujo dos fallos del harness. El login ficticio completó callback 302 y `GET /api/v1/auth/me` 200, pero el menú podía cerrarse por el cambio de ruta al espacio predeterminado. Esperar la URL final de Notas antes de abrir el menú permitió completar login, recarga, preservación de identidad y Swagger. Luego se reprodujo la espera de `database-outage`: PostgreSQL estaba detenido y una sonda de loopback al nginx propio obtuvo `503 {"status":"DOWN"}` mientras el navegador no hacía una nueva consulta de readiness. Los dos ensayos rojos (`t068-frontier-red.log` y `t068-frontier-outage-red.log`) devolvieron 1, con 0/0/0 contenedores/redes/volúmenes por etiqueta exacta al terminar.

Frontera acotó la corrección a sincronizar el login del ensayo y verificar caída y recuperación al volver al primer plano en los ensayos de [S-002](../specs/S-002-local-stack.md#frontend). La aplicación conserva el contrato de T-055 (al montar, al volver al primer plano y cada 60 s visible). Las pruebas conservan las ventanas de 30 s para DB y 20 s para la recuperación del indicador en el smoke de sistema, HTTP contra PostgreSQL/API/OIDC reales con fixtures y los negativos existentes.

`STARTER_LOCAL_TEST_PREFIX=starter-dev-test-t068green bash scripts/test-dev-stack.sh nginx` pasó (exit 0, `t068-frontier-green-nginx.log`): caída y recuperación en 7,34 s y 5,87 s a 1280 px, y 7,32 s y 0,92 s a 375 px. También pasó idempotencia, propiedad, persistencia, reingreso y Swagger. `STARTER_E2E_PROJECT=starter-e2e-t068-foreground bash scripts/e2e.sh --project desktop --grep "real database outage|compiled shell displays the real server status|backend restart expires the session"` pasó 3/3 (exit 0, `t068-frontier-directed-e2e.log`). Ambos usaron valores ficticios y OCR apagado. Siguiente paso: STARTER completo de T-068 con fuentes congeladas.

Checkpoint de corrida larga: HEAD técnico `8b304e56469768e82d50fe23d524dd6157ab7eaa`, árbol `c3a3a17314c54b75f229c30621a897d537f5430a`, base `405e7e58b5133220acd2e9c8c425594323469124`. PowerShell con Git Bash explícito ejecuta `COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container COMPOSE_PROJECT_NAME=starter-verify-t068-frontier-1114 STARTER_LOCAL_TEST_PREFIX=starter-dev-test-t068gate STARTER_E2E_PROJECT=starter-e2e-t068-starter-1114 bash scripts/verify.sh --starter` (log local `t068-frontier-starter.log`). Los ensayos crean sus namespaces y hacen cleanup propio. El runner de verificación retira por separado contenedores, redes y volumen de caché del proyecto verify y comprueba 0/0/0 por etiqueta. Al terminar, cotejar SHA/base y diff con las fuentes congeladas, registrar exit y publicar el PR si pasa.

Resultado de esa corrida: docs, backend, cliente y tooling completos pasaron (incluidos nginx y Vite). Playwright terminó con 70/77 y exit 1. Las siete apariciones corresponden a cuatro expectativas anteriores al contrato de espacios: almacenamiento local vacío pese a la preferencia por cuenta, foco inicial en «Cerrar sesión» pese a «Datos de la cuenta», altura/ubicación anterior de la cabecera, y medición del editor móvil hasta el borde inferior de la ventana sin descontar la navegación inferior. Los fallos se localizaron mediante metadatos de acción y números de línea. SHA/árbol/base permanecieron idénticos y los proyectos propios quedaron en 0/0/0 por etiqueta exacta.

En una copia aislada del mismo SHA, `bash scripts/e2e.sh --project desktop|mobile --grep "visitor, real OIDC callback|logout requires CSRF|multiline clipboard"` y `bash scripts/e2e.sh --project desktop|mobile --grep "CA-01: text blocks"` pasaron 8/8 entre cuatro corridas (exit 0 en todas, logs locales `t068-frontier-compat-{desktop,mobile}.log` y `t068-frontier-height-{desktop,mobile}.log`). Se verifican una única preferencia válida por cuenta, borrado en logout, recorrido por teclado hasta logout y límites del editor medidos contra la navegación vigente. Las demás aserciones de autenticación, seguridad, editor, foco, scroll y layout de los recorridos se mantienen. Las tres fuentes de prueba ensayadas pasaron al worktree de T-068 con las mismas huellas. Siguiente paso: repetir el gate de cierre como FULL de aplicación y tooling sobre el mismo SHA/base.

Corrida de cierre STARTER en dos comandos canónicos, con SHA técnico `3c93fae69915f5e5ebdd74b5edb070472e23f8f3`, árbol `099c43bf8269646420a26d72fe1c255353c89e66` y base `405e7e58b5133220acd2e9c8c425594323469124`. FULL de aplicación: `COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container COMPOSE_PROJECT_NAME=starter-verify-t068-final-1114 STARTER_E2E_PROJECT=starter-e2e-t068-final-1114 bash scripts/verify.sh` en el worktree de T-068, log `t068-frontier-full-final.log`. Tooling: `COMPOSE_ENV_FILES=.env.example STARTER_LOCAL_TEST_PREFIX=starter-dev-test-t068final bash scripts/verify.sh --tooling` en el worktree propio detached `.orchestrator/t068-starter-tooling-1114`, log `t068-frontier-tooling-final.log`. Tooling inicia después del backend FULL y usa su propio checkout para aislar la edición reversible del ensayo HMR. Los comandos usan Git Bash explícito y fixtures ficticias. Al cerrar, comprobar SHA/árbol/base, cleanup 0/0/0 de los namespaces por etiqueta exacta, retirar el worktree temporal y publicar si ambos concluyen con exit 0.

**STARTER verde.** FULL de aplicación y tooling salieron 0 y conservaron el SHA, el árbol y la base anteriores. Docs-check OK; backend 622/622 Surefire y 308/308 Failsafe con PostgreSQL, Spotless y JaCoCo; cliente 802/802 y verificación completa; Playwright real **77/77** en escritorio y móvil, con export saneado sin fallos; tooling completo, incluidos copia, guards, lifecycle de nginx y Vite, rollback, HMR, persistencia, proxies y señales. Las cuatro transiciones de caída y las cuatro de recuperación de PostgreSQL en tooling tardaron menos de 8 s por transición. Los proyectos de verificación, E2E y lifecycle terminaron sin contenedores, redes ni volúmenes por etiqueta exacta. Esta evidencia corresponde a T-068 sobre `405e7e5`.

Entrega para revisión independiente en [PR71](https://github.com/MatiasNicolasAcevedo/devnotes/pull/71). Worktree temporal de tooling retirado. El cierre posterior al SHA técnico solo modifica Markdown. La revisión independiente verifica la base, el HEAD publicado y `verify-required`; el veredicto se registra en la sesión revisora.

## Evidencia previa de la API y del gate

El 2026-11-14 el dueño eligió **Trabajo y Personal**, con aviso visible antes de cada envío. GitHub reconfirmó PR70 MERGED contra main, squash y punta de main `405e7e58b5133220acd2e9c8c425594323469124`, y cero PR abiertos. Plan incorporado desde `.orchestrator/plan-post-i5` al worktree propio `.orchestrator/t-068-ocr-api`.

Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Docker Desktop Linux, Git Bash y Node 24.21.0. La implementación agrega una API privada, autorización de OCR por espacio y configuración exclusiva del servidor. La UI corresponde a T-069 y la clave real a T-071.

Dirigidos en Git Bash con el comando de aceptación y `-o`, exit 0. Surefire 18/18 (3 validador, 13 proveedor, 2 configuración). Failsafe 24/24 (4 OCR, 9 voz, 11 importación), con PostgreSQL de Testcontainers, OIDC ficticio y proveedor en loopback. Reportes en `server/target/{surefire,failsafe}-reports`. Validación de Compose con `.env.example` y valores ficticios: variables OCR solo en server. `node scripts/docs-check.mjs` y `git diff --check`, exit 0.

Cierre técnico sobre `6679b531e0adb85ee3a258ab19a9eb38360d9699`, base `405e7e58b5133220acd2e9c8c425594323469124`. El clasificador informó FULL / STARTER por Compose y `.env.example`. `bash scripts/verify.sh --starter` con `.env.example`, `COMPOSE_PROJECT_NAME=starter-verify-t068-ocr-1114` y `STARTER_E2E_PROJECT=starter-e2e-t068-ocr-1114` salió 1 (`t068-gate-r2.log`). Docs pasó. Backend pasó con Surefire 622/622, Failsafe 308/308, Spotless y JaCoCo. Cliente pasó con 802/802, typecheck, lint, formato, cobertura y build. En tooling pasaron la verificación de copia y los controles locales previos. `scripts/test-dev-stack.sh nginx` falló en `database-outage`, entre los marcadores `outage-ready` y `outage-down`. El gate se detuvo ahí y Playwright E2E quedó pendiente.

Diagnóstico aislado con `bash scripts/test-dev-stack.sh nginx` sobre el SHA base, exit 1 en login (`t068-baseline-nginx.log`). Con marcadores de etapa saneados y las mismas aserciones y tiempos, tanto la base como el candidato fallaron en `login-account-menu`, exit 1 (`t068-baseline-diag-nginx.log` y `t068-candidate-diag-nginx.log`). El fallo de login se observa en la base. La comparación no alcanzó `database-outage`, por lo que falta determinar la causa de ese fallo del gate. Contenedores, redes y volúmenes propios verificados ausentes, imágenes propias retiradas por etiqueta y worktree temporal retirado. Los logs de diagnóstico quedan locales e ignorados.

FULL/STARTER acumulado de I5 sigue diferido.

## Correcciones de implementación

| Problema y causa | Corrección y evidencia |
|---|---|
| STARTER sobre `d555c17` salió 1 en backend. `SecurityConfigTest` carga todos los controladores en un slice MVC y faltaba el doble de `OcrExtractionService`. | Registrar el doble en el slice y conservar sus aserciones. `./mvnw -o -q -Dtest=SecurityConfigTest test`, 13/13, exit 0. Primer gate en `t068-gate.log`, docs verde y suites posteriores sin ejecutar. |
| El menú se abría durante la canonicalización de Notas. Las pruebas de caída/recuperación esperaban la cadencia anterior de readiness. | Esperar la ruta autenticada y simular regreso al primer plano con el backend en el estado esperado. Rojo aislado, lifecycle nginx y Playwright dirigido con HTTP/DB/OIDC reales en el checkpoint. |
| El E2E completo de `8b304e5` expuso cuatro expectativas preexistentes de autenticación/layout, 7 fallos sobre 77 casos. | Alinear solo las aserciones obsoletas con S-109 y la navegación actual. Dirigidos 8/8 con sesiones, PostgreSQL y navegador reales en el checkpoint. |

## Cierre y siguiente tarea

Tras MERGED confirmado, habilita [T-069](T-069-ocr-workspace.md) para integrar la experiencia. La sesión de implementación publica para revisión independiente y se detiene.
