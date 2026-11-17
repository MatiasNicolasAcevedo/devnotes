---
id: T-086
status: draft
priority: P2
size: M
milestone: M8
spec: S-116
depends_on: [T-085]
branch: codex/t-086-ai-groq-api
role: implementer
executor: frontier
pr: null
---

# T-086 · API de IA con GroqCloud y cuota reciente

## Objetivo

API de IA con GroqCloud y cuota reciente con el recorrido observable descrito en la aceptación.

## Alcance

Implementar options/messages y Groq por URL fija. Aplicar habilitación cerrada por cuenta y por proveedor. Separar la clave de Voz y mapear cuota y errores saneados. [Contrato S-116](../specs/S-116-ai-workspace.md).

## Aceptación y pruebas

Sin sesión, CSRF o cuenta autorizada no hay llamada externa. Doble 200/429, timeout, respuesta excesiva o inválida y cabecera ausente. Envío simultáneo y límites validados; sin reintento ni cuerpos en log. Regresión de Voz.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=GroqAiClientTest,AiMessageServiceTest -Dit.test=AiMessageApiIT,VoiceTranscriptionApiIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-085](T-085-side-reading.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
