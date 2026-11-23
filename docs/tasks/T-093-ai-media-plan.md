---
id: T-093
status: done
priority: P1
size: S
milestone: M8
spec: null
depends_on: [T-085]
branch: codex/t-093-ai-media-plan
role: planner
executor: frontier
pr: 89
---

# T-093 · Replanificar IA y los materiales de la versión final

## Objetivo

Publicar la [especificación de IA](../specs/S-116-ai-workspace.md) y tres tareas secuenciales. El cron externo se resuelve desde la consola del dueño y se documenta en [Despliegue](../DEPLOYMENT.md#despertador-externo-de-devnotes).

## Checkpoint vigente

Conciliada el 2026-11-22 en la rama de T-094. `gh pr view 89 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` devolvió `MERGED`, `2026-11-22T21:23:23Z` y `dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795`. `git fetch origin main` y `git merge-base --is-ancestor dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795 origin/main` dieron exit 0.

2026-11-22. Frontera planner, Codex Desktop GPT-6, PowerShell, Git Bash, gh y navegador Brave. Base `f14701055cff6b13b710cf1d2e5e7b138edc3949`. `gh pr view 88 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit`, `git fetch origin main` y `git merge-base --is-ancestor f14701055cff6b13b710cf1d2e5e7b138edc3949 origin/main` dieron exit 0. Se retiraron los seis contratos pendientes, se revisaron catálogo/pasarela del TFI y fuentes locales del tráiler. Alcance del diff documental. Impacto operativo independiente: cambio del despertador externo sobre la lectura pública de salud. Implementación, prueba de claves y producción audiovisual corresponden a sesiones posteriores.

[PR #89](https://github.com/MatiasNicolasAcevedo/devnotes/pull/89) contra main. Primer HEAD `52436d864180e2af9642f1af8a39ec6fdfce451b`. GitHub confirmó verify-required SUCCESS sobre ese HEAD (run 45071623267). Gate documental sobre el índice exportado: `node scripts/docs-check.mjs` (154 Markdown, 91 tareas, exit 0) y `git diff --cached --check` (exit 0). Git Bash del host ejecutó `bash scripts/verify.sh --policy origin/main` (exit 0, FULL / STARTER por las seis rutas eliminadas). FULL/STARTER: DIFERIDO POR EL DUEÑO. Para el squash, verificar nuevamente CI y base del HEAD de transición. La siguiente sesión concilia el merge confirmado.

| Causa | Arreglo | Comprobación |
|---|---|---|
| El trabajo externo estaba inactivo y apuntaba a la portada. El host histórico de la guía respondió 404 al probar readiness. | Mantener el host del trabajo existente, usar su ruta pública de salud y ajustar el horario. | Ejecución de prueba desde cron-job.org 200 OK; configuración persistente al recargar. |
| El chequeo local recorre también el tráiler sin versionar y rechaza su CLAUDE.md. | Validar el árbol exacto del índice en un directorio aislado. | docs-check exit 0 sobre el contenido propuesto y CI del primer HEAD verde. |

## Prompts de salida

Tras el squash confirmado, usar el prompt de [STATUS](../STATUS.md#prompt-de-la-siguiente-sesión) para T-094. Conciliar este plan en la primera rama de implementación.
