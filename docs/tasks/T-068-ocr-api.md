---
id: T-068
status: changes_requested
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

R2 solicita cambios por [B-2](#b-2--un-resultado-parcial-con-página-inválida-se-clasifica-como-coherente). Frontera implementer corrige en la misma rama y PR y aporta los negativos indicados. El dueño decide la autorización para el STARTER sobre el nuevo SHA técnico y para una R3 independiente. T-069 espera PR71 MERGED.

## Evidencia de STARTER y traspaso a R2

El 2026-11-15 el dueño autorizó una sola corrida adicional de STARTER. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, Node 24.21.0 y Docker Desktop Linux. La sesión verificó el candidato existente.

GitHub confirmó PR71 OPEN, HEAD `645530de1ebc23031ebfda00e8f0b1714c2b7356`, `verify-required` SUCCESS y base `main` en la punta remota `405e7e58b5133220acd2e9c8c425594323469124`. Candidato técnico `320125a623d482763e988db86c76cdf446c27ed0`, árbol `1ec318707d62ee3f96c2c377f57b2c9adfb2c4a3`, merge-base igual a la base autorizada y clasificación FULL/STARTER. Checkout limpio detached en `.orchestrator/t068-a1115-c37f` para aislar el cambio reversible del ensayo HMR.

Desde ese checkout, con Git Bash explícito y Node del host, se ejecutó una sola vez `COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container COMPOSE_PROJECT_NAME=starter-verify-t068-a1115-c37f STARTER_LOCAL_TEST_PREFIX=starter-dev-test-t068-a1115-c37f STARTER_E2E_PROJECT=starter-e2e-t068-a1115-c37f bash scripts/verify.sh --starter`. Solo fixtures ficticias. Antes de iniciar se comprobaron puertos libres y 0/0/0 contenedores, redes y volúmenes por etiqueta exacta en verify, nginx, vite y E2E.

**STARTER exit 0.** Docs, backend, cliente, tooling y Playwright verdes. Backend con 626 Surefire, 308 Failsafe con PostgreSQL, Spotless y JaCoCo. Cliente con 803 pruebas, typecheck, lint, formato, cobertura y build. Playwright 77/77 (39 desktop, 38 mobile), incluidos CA-04, CA-06 y SP-06/SP-07. El JUnit saneado confirmó cero fallos, errores y omitidos. Salida local en `.orchestrator/t068-a1115-c37f.log` y JUnit en `e2e/artifacts/starter-e2e-t068-a1115-c37f/sanitized/junit.xml` dentro del checkout.

Al cierre se cotejaron el SHA, el árbol, la base y el checkout limpio. Se retiraron la red y el volumen de caché de verify. Los cuatro proyectos fijos y los cinco proyectos auxiliares identificados en la salida quedaron en 0/0/0 contenedores, redes y volúmenes por etiqueta exacta (`.orchestrator/t068-a1115-c37f-cleanup.log`). Los ensayos de tooling también pasaron sus verificaciones de limpieza. Se conserva el checkout aislado para consultar la evidencia.

GitHub confirmó de nuevo PR71 OPEN con HEAD de R1 y base autorizados. Se publicó `320125a623d482763e988db86c76cdf446c27ed0` a PR71 mediante fast-forward. Este traspaso agrega solo el checkpoint y STATUS sobre ese SHA. R2 revisa el HEAD publicado con el prompt de STATUS. T-069 espera PR71 MERGED.

## Resolución de Frontera · transición de Notas

El 2026-11-15, Frontera planner/implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, Node 24 y Docker Desktop. Se acota la corrección a la navegación del cliente: resolver la URL de hoy antes de ofrecer controles de la nota que puedan recibir un cambio de fecha. Conservar el flush, el espacio confirmado, el historial del navegador, el contrato de versiones y todas las aserciones de CA-04 y CA-06. Sin impacto en API, permisos, formato de datos ni proveedor.

Las trazas saneadas de ambos FULL muestran que el `fill` inmediatamente posterior al clic en «Notas» terminó, pero la primera expectativa de URL agotó su plazo. El código permite montar los controles en `/notes?space=work` mientras un efecto reemplaza esa URL por la de hoy. La prueba de componente comprueba si esa ruta de paso expone controles; después, el stack real verifica el cambio de fecha, la independencia y la propiedad de versiones.

Rojo reproducible, desde `client/`: `npm.cmd test -- --run src/features/daily/DailyDraftNavigation.test.tsx`, exit 1, 4/5 casos. Registró controles en `/notes` y en la ruta con fecha (`t068-r2-date-red.log`). Se deja el indicador de carga durante la transición; el editor y selector montan en la URL con fecha. Con el cambio, `npm.cmd test -- --run src/features/daily/DailyDraftNavigation.test.tsx src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyNotesToolbar.test.tsx src/app/AppRoutes.test.tsx src/features/spaces/SpaceNavigation.test.tsx` salió 0, 76/76 (`t068-r2-date-green.log`); typecheck, ESLint y Prettier de los archivos cambiados también salieron 0.

Dirigido móvil: desde la raíz con Git Bash explícito, `STARTER_E2E_PROJECT=starter-e2e-t068-r2-date-mobile bash scripts/e2e.sh --project mobile --grep 'T-020: direct URL|CA-04: dates 19/10 and 20/10|CA-06: two identities on the same date'` (`t068-r2-date-mobile.log`). HEAD local de partida `55ede1e`, base `405e7e58b5133220acd2e9c8c425594323469124`; delta técnico limitado a `DailyDraftNavigation.tsx` y su prueba, congelados sin cambios en `320125a623d482763e988db86c76cdf446c27ed0` (árbol `1ec318707d62ee3f96c2c377f57b2c9adfb2c4a3`). Exit 0, **4/4**: T-020, CA-04, CA-06 de versiones y CA-06 de espacios, con OIDC/API/PostgreSQL reales y fixtures ficticias. JUnit saneado en `e2e/artifacts/starter-e2e-t068-r2-date-mobile/sanitized/junit.xml`: cero fallos, errores u omisiones. Fuentes técnicas y base cotejadas al final; cleanup 0 contenedores, 0 redes y 0 volúmenes por etiqueta exacta.

## Evidencia de la corrección de R1

Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, JDK 21, Node 24 y Docker Desktop. GitHub confirmó [PR71](https://github.com/MatiasNicolasAcevedo/devnotes/pull/71) abierto, HEAD de [R1](https://github.com/MatiasNicolasAcevedo/devnotes/pull/71#issuecomment-6887836048) `645530de1ebc23031ebfda00e8f0b1714c2b7356`, base `main` `405e7e58b5133220acd2e9c8c425594323469124` y `verify-required` SUCCESS en ese HEAD. B-1 y B-2 corrigen la clasificación de errores del adaptador dentro del contrato HTTP de S-112.

Sobre el HEAD de R1, con solo las regresiones añadidas, `mvnw.cmd -o -q -Dtest=OcrSpaceClientTest test` salió 1 (`t068-r2-red.log`): 16 casos, 2 fallos de código. En la corrección, Spotless y el comando de aceptación desde `server/` con `-o` salieron 0 (`t068-r2-directed.log`): **21/21 Surefire** y **24/24 Failsafe**, con PostgreSQL de Testcontainers, OIDC ficticio y OCR.space simulado. `OcrSpaceClientTest` pasó 16/16, incluidos los casos de límite y timeout sobre HTTP 200 y el parcial mixto con texto descartado.

Primer STARTER de la corrección sobre `fb0d0ececc5aae0c2ef456f51908f59557e2eecf`, árbol `ebc137b438d3c4f3538ee310c5f084f77ff0bcd2`, base `405e7e58b5133220acd2e9c8c425594323469124` (`t068-r2-starter.log`). Docs pasó. El backend salió 1 con un fallo en 625 pruebas Surefire: `rejectsRedirectAndDoesNotRetryQuota` devolvió `OCR_PROVIDER_ERROR` para el 429 pequeño en Temurin Linux. El 429 sobredimensionado pasó. El gate se detuvo antes de cliente, tooling y E2E. Los cuatro proyectos propios quedaron en 0/0/0 por etiqueta exacta. Retoma: probar el cierre del cuerpo tras completar la respuesta HTTP desde `server-tests`, congelar el nuevo SHA y volver a ejecutar STARTER. T-069 depende de PR71 MERGED.

`docker compose --profile verify run --rm server-tests ./mvnw -B -ntp spotless:apply verify -Dtest=OcrScreenshotValidatorTest,OcrSpaceClientTest,OcrConfigurationTest -Dit.test=OcrExtractionApiIT,VoiceTranscriptionApiIT,PortabilityImportApiIT -Djacoco.skip=true` salió 0 en `starter-verify-t068-r2-directed` (`t068-r2-directed-linux.log`), con **22/22 Surefire** y **24/24 Failsafe**. Los 17 casos del adaptador incluyen el 429 cuyo cuerpo queda retenido por el doble. Cleanup 0/0/0 por etiqueta.

Cierre FINAL en `.orchestrator/t-068-ocr-api`, SHA técnico `c6c9797f6866e85ff561039d98f5782801776e28`, árbol `7d07e77d1543c01155c614665295236e9e497492`, base `405e7e58b5133220acd2e9c8c425594323469124`. Ejecutar desde PowerShell con Git Bash explícito y Node del host: `COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container COMPOSE_PROJECT_NAME=starter-verify-t068-r2-final STARTER_LOCAL_TEST_PREFIX=starter-dev-test-t068-r2-final STARTER_E2E_PROJECT=starter-e2e-t068-r2-final bash scripts/verify.sh --starter` (`t068-r2-starter-final.log`). Verificar etiquetas exactas antes y después. Los harnesses limpian sus proyectos y el runner retira el proyecto verify con sus volúmenes. Cotejar SHA/árbol/base y fuentes al terminar, luego publicar la corrección y el traspaso a R2 si el gate pasa.

STARTER salió 1, con docs, backend (626 Surefire y 308 Failsafe, Spotless y JaCoCo), cliente (802), y tooling verdes. Playwright 75/77: SP-06/SP-07 en escritorio y CA-06 de versiones diarias en móvil. Evidencia saneada en `e2e/artifacts/starter-e2e-t068-r2-final/sanitized/`. SHA/árbol/base y fuentes coinciden. Cleanup 0/0/0 por etiqueta en los cuatro proyectos. Siguiente: aislar ambos recorridos con `bash scripts/e2e.sh --project desktop --grep 'SP-06/SP-07 responsive navigation'` y `bash scripts/e2e.sh --project mobile --grep 'CA-06: two identities on the same date only see their own versions'`, namespaces `starter-e2e-t068-r2-desk` y `starter-e2e-t068-r2-mob`, logs locales con nombres equivalentes y cleanup de cada harness.

Los dos Playwright dirigidos salieron 0, 1/1 por proyecto y cleanup 0/0/0 (`t068-r2-desk.log`, `t068-r2-mob.log`). En el FULL anterior, `spaces.spec.ts:425` vio una solicitud de colección donde esperaba cero al abrir el espacio inválido. `daily-helpers.ts:8`, desde `daily-versions.spec.ts:127`, conservó la fecha de hoy en vez de la elegida. Los tests, scripts y cliente coinciden con el HEAD de R1. Reintentar el FULL canónico de aplicación con el mismo SHA técnico `c6c9797f6866e85ff561039d98f5782801776e28`, árbol `7d07e77d1543c01155c614665295236e9e497492` y base `405e7e58b5133220acd2e9c8c425594323469124`. Conservar el tooling verde de ese SHA y base. PowerShell → Git Bash explícito: `COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container COMPOSE_PROJECT_NAME=starter-verify-t068-r2-full2 STARTER_E2E_PROJECT=starter-e2e-t068-r2-full2 bash scripts/verify.sh` (`t068-r2-full2.log`). Comprobar 0/0/0 inicial y final en ambos proyectos y cotejar SHA, árbol y fuentes. Publicar y entregar a R2 si el gate pasa.

El segundo FULL de aplicación salió 1. Docs, backend y cliente verdes. Playwright 76/77, con SP-06/SP-07 y CA-06 verdes. El único fallo fue CA-04 móvil en la misma expectativa de `daily-helpers.ts:8`, ahora llamada desde `daily-versions.spec.ts:50`: conservó la fecha de hoy tras seleccionar 19/10. Evidencia saneada en `e2e/artifacts/starter-e2e-t068-r2-full2/sanitized/`. SHA, árbol y base iguales antes y después. Ambos proyectos quedaron en 0/0/0 por etiqueta. `STARTER_E2E_PROJECT=starter-e2e-t068-r2-ca04 bash scripts/e2e.sh --project mobile --grep 'CA-04: dates 19/10 and 20/10'` salió 0, 1/1 con cleanup 0/0/0 (`t068-r2-ca04.log`). La canonicalización de `/notes` a la fecha de hoy y la selección de fecha son dos transiciones distintas en la SPA. Su orden relativo en los dos fallos sigue por confirmar. GitHub reconfirmó PR71 OPEN en el HEAD de R1 antes del checkpoint de bloqueo.

## Evidencia del cierre técnico

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
| R1 B-1. Un HTTP 429 con cuerpo ficticio de 1.000.001 bytes fallaba por el límite del lector. El primer arreglo cerraba el cuerpo dentro del mapper y falló con 429 pequeño en Temurin Linux. | Esperar la respuesta de cabeceras de HTTP 429, clasificar la cuota y cerrar el cuerpo. Regresión roja con `OCR_PROVIDER_ERROR`; verde con `OCR_QUOTA_EXHAUSTED` para cuerpos pequeño, excesivo y demorado, y una sola solicitud en `c6c9797`. |
| R1 B-2. `OCRExitCode=2` devolvía `OCR_PARTIAL` aunque todas las páginas informaran éxito. | Rechazar la contradicción como `OCR_PROVIDER_ERROR`. Regresión roja con `OCR_PARTIAL`, verde en `c6c9797`, con control de parcial mixto cuyo texto queda fuera del error. |
| Los controles de Notas se montaban durante el reemplazo de `/notes` por la URL con fecha, dejando una ventana en la que la selección podía quedar pisada por la navegación a hoy. | Mostrar carga hasta la URL con fecha. Rojo del montaje transitorio y verde en `320125a`; Playwright móvil 4/4 con las aserciones existentes. |

## Cierre y siguiente tarea

Tras MERGED confirmado, habilita [T-069](T-069-ocr-workspace.md) para integrar la experiencia. La sesión de implementación publica para revisión independiente y se detiene.

## Revisión independiente R1

2026-11-14, Buenos Aires. Frontera reviewer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, JDK 21 y Docker. Worktree propio `.orchestrator/t-068-review-codex`. GitHub confirmó [PR71](https://github.com/MatiasNicolasAcevedo/devnotes/pull/71) abierto y listo para revisión, HEAD de entrada `8f8a96370631d89218eff8a1ac3e1cbf82319b54`, base y punta de `main` `405e7e58b5133220acd2e9c8c425594323469124`, y [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43662283132/job/132653999942). Los hallazgos afectan los errores HTTP del adaptador, dentro de la API acordada. Las pruebas usan datos ficticios.

- `git diff --check 405e7e5...HEAD` y `node scripts/docs-check.mjs` pasaron. El clasificador sobre esa base dio `FULL/STARTER`, 27 rutas técnicas de 40. El delta desde el SHA técnico `3c93fae69915f5e5ebdd74b5edb070472e23f8f3`, árbol `099c43bf8269646420a26d72fe1c255353c89e66`, solo modifica STATUS y T-068. Se cotejaron las salidas `t068-frontier-full-final.log` y `t068-frontier-tooling-final.log` con exit 0 para docs/backend/client/E2E/tooling, y el JUnit saneado con 77 casos sin fallos, errores ni omitidos. Se revisaron los cambios de login, readiness y layout contra el contrato vigente de espacios y revalidación en primer plano.
- El comando dirigido de aceptación con `-o` dio **18/18 Surefire y 24/24 Failsafe** (4 OCR, 9 voz, 11 portabilidad), con PostgreSQL real, OIDC ficticio y el doble de OCR.space. El `verify` salió 1 en Spotless al detectar la prueba temporal añadida por el reviewer. Tras moverla fuera de los fuentes, `mvnw.cmd -o -q spotless:check` salió 0 sobre el árbol publicado.
- En `server/`, `./mvnw -o -q -Dtest=OcrProviderReviewerTest test` salió 1, **2 casos ejecutados y ambos fallidos** por los códigos descritos abajo. La prueba y la salida saneada quedan en `e2e/artifacts/t068-review-r1/` del worktree reviewer. La transición del reviewer solo modifica T-068 y STATUS.

### B-1 · El cuerpo de un HTTP 429 puede ocultar la cuota agotada

S-112 exige `429 OCR_QUOTA_EXHAUSTED` cuando OCR.space responde HTTP 429. `OcrSpaceClient.extract` aplica el lector de cuerpo de 1 MB antes de examinar el status. Con HTTP 429 y un cuerpo ficticio de 1.000.001 bytes, el adaptador devuelve `OCR_PROVIDER_ERROR` (502). El estado de cuota ya es concluyente en las cabeceras.

Cierre observable: un 429 con cuerpo pequeño o superior al límite conserva `OCR_QUOTA_EXHAUSTED`, sin consumir un cuerpo sin límite ni reintentar. Un 200 con cuerpo excesivo sigue dando `OCR_PROVIDER_ERROR` y uno lento sigue dando `OCR_TIMEOUT`.

### B-2 · Se clasifica como parcial un resultado contradictorio

S-112 exige `502 OCR_PROVIDER_ERROR` para señales contradictorias. `OcrSpaceResponse.text` devuelve `OCR_PARTIAL` cuando `OCRExitCode=2` antes de contrastarlo con el resultado de página. La prueba devuelve una sola página, exit global 2 y exit de página 1 con texto: el adaptador responde `OCR_PARTIAL` pese a que el único resultado de página indica éxito completo.

Cierre observable: validar la coherencia de las señales de página presentes antes de clasificar un parcial. El caso contradictorio devuelve `OCR_PROVIDER_ERROR`; un parcial coherente sigue devolviendo `OCR_PARTIAL` sin exponer fragmentos. Conservar los negativos de cuota, timeout y éxito ambiguo.

## Revisión independiente R2

2026-11-15, Buenos Aires. Frontera reviewer independiente en Codex Desktop (GPT-6, variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, JDK 21, Node 24.21.0 y Docker Desktop. Checkout detached `.orchestrator/t-068-review-r2-codex`. GitHub confirmó [PR71](https://github.com/MatiasNicolasAcevedo/devnotes/pull/71) OPEN en `codex/t-068-ocr-api`, HEAD de entrada `f0f2c7741af2581bd78f5aa662a391598785d034`, base y punta de `main` `405e7e58b5133220acd2e9c8c425594323469124`, y [verify-required SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43705422519/job/132785339702) en el mismo HEAD. El padre `320125a623d482763e988db86c76cdf446c27ed0` coincide con el candidato de STARTER. Su delta al HEAD solo modifica STATUS y T-068.

- `node scripts/docs-check.mjs` y `git diff --check 405e7e5...HEAD` pasaron. `node scripts/ci/classify-diff.mjs --base 405e7e58b5133220acd2e9c8c425594323469124 --head HEAD --phase FULL` dio `FULL/STARTER` (29 de 42 rutas técnicas). Cotejé checkout limpio, SHA/árbol/base, el resumen con las cinco etapas en verde, 626 Surefire, 308 Failsafe, 803 Vitest y el JUnit saneado de Playwright con 77 casos y cero fallos, errores u omitidos. El log de cleanup y la consulta a Docker por etiqueta exacta coincidieron en 0/0/0 para los nueve proyectos de STARTER. Se conserva esa evidencia sobre las fuentes de entrada. R2 ejecutó solo dirigidos.
- En `server/`, `mvnw.cmd -o -q verify -Dtest=OcrScreenshotValidatorTest,OcrSpaceClientTest,OcrConfigurationTest -Dit.test=OcrExtractionApiIT,VoiceTranscriptionApiIT,PortabilityImportApiIT -Djacoco.skip=true` salió 0: **22/22 Surefire y 24/24 Failsafe**, con PostgreSQL 18.6 y OIDC/proveedor ficticios. Los cuatro contenedores de Testcontainers identificados quedaron ausentes. **B-1 cerrado**: los 429 con cuerpo pequeño, mayor a 1 MB y retenido por el doble conservaron `OCR_QUOTA_EXHAUSTED`. El HTTP 200 excesivo devolvió `OCR_PROVIDER_ERROR` y el lento, `OCR_TIMEOUT`. Sin redirección ni reintento.
- En `client/`, `npm.cmd test -- --run src/features/daily/DailyDraftNavigation.test.tsx src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyNotesToolbar.test.tsx src/app/AppRoutes.test.tsx src/features/spaces/SpaceNavigation.test.tsx` salió 0: **76/76**. En `/notes` la carga precede al montaje del selector en la URL definitiva. El JUnit de STARTER conserva T-020, CA-04, CA-06 y SP-06/SP-07 en escritorio y móvil.

### B-2 · Un resultado parcial con página inválida se clasifica como coherente

El caso exacto de R1 (exit global 2 y todas las páginas exitosas) ya devuelve `OCR_PROVIDER_ERROR`, y el parcial mixto coherente conserva `OCR_PARTIAL`. Sin embargo, [OcrSpaceResponse.java](../../server/src/main/java/com/example/devnotes/ocr/OcrSpaceResponse.java) acepta cualquier valor de página distinto de `1`. `code()` convierte un valor ausente o inválido en `Integer.MIN_VALUE`, de modo que una página malformada se toma como evidencia de fallo de página.

Reproducción independiente sobre las clases compiladas del HEAD de entrada, con respuestas ficticias y sin cambios en fuentes. `server/target/OcrPartialReviewerCheck.java` salió 1 (dos controles verdes y dos fallos). Con `OCRExitCode=2` e `IsErroredOnProcessing=false`, tanto `ParsedResults:[{}]` como una página exitosa seguida por `{"FileParseExitCode":"invalid"}` devolvieron `OCR_PARTIAL`. S-112 exige HTTP 502 `OCR_PROVIDER_ERROR` para una respuesta inválida. Los detalles saneados quedan en `server/target/t068-r2-malformed-partial.log` del checkout aislado.

**Condición de cierre.** Validar la presencia y el valor admitido de `FileParseExitCode` en cada página presente antes de clasificar un parcial. Agregar los dos casos rojos al doble HTTP y demostrar que devuelven `OCR_PROVIDER_ERROR`, que el parcial mixto válido conserva `OCR_PARTIAL` sin fragmentos y que siguen verdes los negativos de cuota, timeout y éxito ambiguo.

**Siguiente decisión.** Frontera implementer corrige en una sesión nueva sobre PR71 y deja las regresiones rojo/verde y los dirigidos de OCR. Para cerrar fuentes nuevas, el dueño debe autorizar un STARTER de T-068 según el perfil del PR y, agotadas las dos rondas, una R3 independiente que coteje la corrección, el gate y `verify-required` sobre el HEAD y la base vigentes. Solo tras ese veredicto y los requisitos de AUTONOMY corresponde evaluar el merge. T-069 espera PR71 MERGED. El gate acumulado de I5, la clave de T-071 y la autorización de Render conservan sus condiciones.
