---
id: T-093
status: in_review
priority: P1
size: S
milestone: M8
spec: null
depends_on: [T-085]
branch: codex/t-093-ai-media-plan
role: planner
executor: frontier
pr: null
---

# T-093 · Replanificar IA y los materiales de la versión final

## Objetivo

Publicar la [especificación de IA](../specs/S-116-ai-workspace.md) y tres tareas secuenciales. El cron externo se resuelve desde la consola del dueño y se documenta en [Despliegue](../DEPLOYMENT.md#despertador-externo-de-devnotes).

## Checkpoint vigente

2026-11-22. Frontera planner, Codex Desktop GPT-6, PowerShell, Git Bash, gh y navegador Brave. Base `f14701055cff6b13b710cf1d2e5e7b138edc3949`. `gh pr view 88 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit`, `git fetch origin main` y `git merge-base --is-ancestor f14701055cff6b13b710cf1d2e5e7b138edc3949 origin/main` dieron exit 0. Se retiraron los seis contratos pendientes, se revisaron catálogo/pasarela del TFI y fuentes locales del tráiler. Alcance del diff documental. Impacto operativo independiente: cambio del despertador externo sobre la lectura pública de salud. Implementación, prueba de claves y producción audiovisual corresponden a sesiones posteriores.

## Prompts de salida

Tras el squash confirmado, usar el prompt de [STATUS](../STATUS.md#prompt-de-la-siguiente-sesión) para T-094. Conciliar este plan en la primera rama de implementación.
