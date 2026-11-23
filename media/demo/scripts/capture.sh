#!/usr/bin/env bash
# Captura del recorrido de la demo (T-096) en el stack E2E propio, con datos, OIDC y proveedores de prueba.
# Copia el ritmo al buzón de control del proyecto, ejecuta solo el spec del recorrido en desktop y trae los
# cuadros y marcas a media/demo/build/capture. Se ejecuta desde Git Bash en la raíz del repositorio.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
node media/demo/scripts/pacing.mjs
PROJECT="starter-e2e-t096demo-$(date +%s)-$$"
mkdir -p "e2e/artifacts/$PROJECT/control"
cp media/demo/build/pacing.json "e2e/artifacts/$PROJECT/control/demo-pacing.json"
STARTER_E2E_PROJECT="$PROJECT" bash scripts/e2e.sh --grep "demo tour" --project desktop
source_dir="$(ls -d e2e/artifacts/"$PROJECT"/test-results/*/demo-capture | head -1)"
[[ -d "$source_dir" ]] || { echo 'capture.sh: no demo-capture directory' >&2; exit 1; }
rm -rf media/demo/build/capture
mkdir -p media/demo/build
cp -r "$source_dir" media/demo/build/capture
cp e2e/artifacts/"$PROJECT"/control/demo-pacing.json media/demo/build/capture/pacing.json
echo "ok media/demo/build/capture ($(ls media/demo/build/capture/frames | wc -l) cuadros) desde $PROJECT"
