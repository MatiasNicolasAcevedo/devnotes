# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-006](tasks/T-006-daily-client.md) |
| Estado | in_review |
| Acción actual | Código publicado, pendiente revisión independiente |
| Rama / PR | codex/t-006-daily-client (c49b894) |

T-005: conciliada como MERGED (5e6c247). Junie merger, Qwen3.6-27B-FP8. Client gate 179 tests OK, 92.16% líneas. Backend SecurityConfigTest con fallo preexistente en main (OIDC), no causado por T-005. docs-check OK, CI verify-required pass.

### Prompt de la siguiente sesión

```text
Sesión nueva Junie reviewer para T-006. Revisar HEAD c49b894 contra origin/main (5e6c247), gate client 218 tests OK, 92.14% líneas, docs-check OK. Verificar propiedad, cobertura 80/70 en daily/api y daily/useDailyNoteQuery, y calidad de pruebas negativas.
```
