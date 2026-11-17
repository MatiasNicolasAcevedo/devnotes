# E2E durante el desarrollo

La suite E2E completa supera los 100 minutos y es un [gate diferido](TESTING.md#gates-diferidos): solo se corre cuando el dueño lo ordena. El trabajo diario usa el E2E dirigido del [gate diario](TESTING.md#gate-diario).

```bash
# Raíz del repo, Git Bash. Solo los casos que coinciden, en un proyecto.
STARTER_E2E_PROJECT=starter-e2e-xxx bash scripts/e2e.sh --grep "reference preview:" --project desktop
```

- Usar siempre `scripts/e2e.sh`: arma el stack, espera readiness, exporta los artefactos y limpia su proyecto. No invocar `node scripts/run-e2e.mjs` ni `docker compose … playwright test` a mano.
- Un patrón por flujo afectado; `--project mobile` solo si la tarea lo pide.
- Si un caso queda colgado (timeout de 120 s por test), acotar el patrón y revisar `docker compose -p starter-e2e-xxx logs e2e`.
- La revisión repite el dirigido solo si el riesgo lo pide; no corre la suite completa.

Detalle en [TESTING](TESTING.md#tiempos-de-e2e) y en [WORKFLOW](WORKFLOW.md#gates).
