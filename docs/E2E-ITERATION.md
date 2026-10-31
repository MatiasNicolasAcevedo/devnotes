# Prompt template para tareas con E2E

## Advertencia crítica — tiempos de E2E

**La suite E2E completa tarda >100 minutos.**

Ejecuta 9 specs × 2 proyectos (desktop + mobile) = ~18 tests en serie con `workers: 1`.

### Durante iteración de desarrollo

**NUNCA** ejecutes la suite FULL E2E mientras desarrollas. Usa siempre `--grep` para ejecutar solo el test afectado:

```bash
# Ejemplo: solo el test de reference-preview, solo desktop
docker compose -p starter-e2e-xxx -f docker-compose.yml -f compose.auth-test.yml -f docker-compose.e2e.yml \
  --profile oidc --profile e2e run --rm --no-deps e2e npx playwright test \
  --grep "reference preview:" --project=desktop
```

O con `run-e2e.mjs` (soporta `--grep`):

```bash
node scripts/run-e2e.mjs compose --env-file scripts/fixtures/e2e.env.example -p starter-e2e-xxx \
  -f docker-compose.yml -f compose.auth-test.yml -f docker-compose.e2e.yml \
  --profile oidc --profile e2e --grep "reference preview:"
```

### Regla de oro

1. **Desarrollo:** `--grep "patrón"` + `--project=desktop` → solo el test afectado
2. **Cierre de tarea:** Suite FULL una vez, con stack limpio y sin editar fuentes durante la corrida
3. **Revisión:** No repitas FULL por rutina — la revisión es independiente

### Si la suite FULL tarda demasiado

- Verifica que no haya tests colgados (timeout 120s por test)
- Usa `--grep` para identificar qué test específico está fallando
- Limpia el stack anterior: `docker compose -p starter-e2e-xxx down -v`
- Revisa logs del contenedor e2e: `docker compose -p starter-e2e-xxx logs e2e`

### Referencia

- [TESTING.md — Tiempos de E2E](docs/TESTING.md#tiempos-de-e2e---advertencia-critica)
- [AGENTS.md — Pruebas y entrega](AGENTS.md#pruebas-y-entrega)
- [Implementer protocol — E2E](docs/agents/implementer.md#4)
