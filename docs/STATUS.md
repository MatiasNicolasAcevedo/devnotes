# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-001](tasks/T-001-document-contract.md) |
| Estado | changes_requested |
| Acción actual | Revisión solicita corrección: textTotal usa codePointCount en lugar de length() para unidades UTF-16; implementer corrige y reenvía |
| Rama / PR | codex/t-001-document-contract · [PR4](https://github.com/MatiasNicolasAcevedo/devnotes/pull/4) contra main |

T-018 MERGED en PR3, SHA 7b53ad2, 2026-10-22T19:00:48Z; conciliada done al crear rama T-001. T-000/T-015 ya MERGED/conciliadas, adopción histórica22/22 y E-01 conservadas. Quince contratos I1 en BACKLOG, S-101/S-104 v2 y T-016 entre T-006/T-007; voz S-105/T-017 es I2 posterior draft.

### Prompt de la siguiente sesión
```text
Sesión nueva Junie implementer para corrección T-001 en codex/t-001-document-contract. La revisión independiente rechazó PR4: textTotal en DailyContent.java:65 usa codePointCount() en lugar de String.length() para contar unidades UTF-16 según S-101 v2. Corregir la línea 65 a text.length(), añadir test con caracteres suplementarios (emoji) que demuestre el fallo con codePointCount y el paso con length(), ejecutar DailyContentTest y spotless:apply, commit y push. No cambiar otra lógica. Ver veredicto en https://github.com/MatiasNicolasAcevedo/devnotes/pull/4#issuecomment-6354815953.
```
