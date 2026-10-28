#!/usr/bin/env bash
# Launch Strata for IADAF — portable on any machine.
#
# Resolution order (évite un 2e téléchargement si une install locale existe) :
#   1) STRATA_HOME (env) contenant serve/server.py
#   2) %USERPROFILE%/Strata ou $HOME/Strata
#   3) `strata` CLI on PATH (seulement si pas d'install locale)
set -euo pipefail

PORT="${STRATA_PORT:-8080}"
PARALLEL="${STRATA_PARALLEL:-2}"
CONTEXT="${STRATA_CONTEXT:-32k}"
PRESET="${STRATA_PRESET:-iadaf-5080}"
MODEL_PATH="${1:-}"

if [[ -z "${STRATA_API_KEY:-}" ]]; then
  export STRATA_API_KEY="iadaf-dev-local-key"
  echo "STRATA_API_KEY not set — using ephemeral dev key."
fi

# Git Bash on Windows: USERPROFILE is the real home
user_home="${HOME:-}"
if [[ -n "${USERPROFILE:-}" ]]; then
  # Convert C:\Users\X → /c/Users/X when under MSYS
  if command -v cygpath >/dev/null 2>&1; then
    user_home="$(cygpath -u "${USERPROFILE}")"
  else
    user_home="${USERPROFILE}"
  fi
fi

resolve_strata_home() {
  if [[ -n "${STRATA_HOME:-}" && -d "${STRATA_HOME}" ]]; then
    echo "${STRATA_HOME}"
    return
  fi
  for candidate in "${user_home}/Strata" "${HOME}/Strata"; do
    [[ -z "${candidate}" ]] && continue
    if [[ -d "${candidate}" && -f "${candidate}/serve/server.py" ]]; then
      echo "${candidate}"
      return
    fi
  done
  echo ""
}

pick_config() {
  local home="$1"
  if [[ -n "${STRATA_CONFIG:-}" ]]; then
    echo "${STRATA_CONFIG}"
    return
  fi
  # Prefer a default name if present, else first strata-*.json
  if [[ -f "${home}/strata-iq2_xs.json" ]]; then
    echo "${home}/strata-iq2_xs.json"
    return
  fi
  local first
  first="$(ls -1 "${home}"/strata-*.json 2>/dev/null | head -n 1 || true)"
  echo "${first}"
}

STRATA_HOME_RESOLVED="$(resolve_strata_home)"

launch_local_server() {
  local home="$1"
  local py="${home}/.venv/Scripts/python.exe"
  local cfg
  cfg="$(pick_config "${home}")"
  if [[ ! -f "${py}" ]]; then
    py="${home}/.venv/bin/python"
  fi
  if [[ ! -f "${py}" ]]; then
    echo "Python venv introuvable dans ${home}/.venv — lance d'abord START-HERE.bat / setup" >&2
    exit 1
  fi
  if [[ -z "${cfg}" || ! -f "${cfg}" ]]; then
    echo "Aucune config strata-*.json dans ${home}" >&2
    echo "Définis STRATA_CONFIG=/chemin/vers/ta-config.json" >&2
    exit 1
  fi
  echo "Using local Strata install: ${home}"
  echo "Config: ${cfg}  port: ${PORT}"
  cd "${home}"
  exec "${py}" "${home}/serve/server.py" \
    --engine strata \
    --config "${cfg}" \
    --port "${PORT}"
}

launch_cli() {
  echo "Starting Strata CLI preset '${PRESET}' on port ${PORT} (parallel=${PARALLEL})…"
  if [[ -n "${MODEL_PATH}" ]]; then
    strata launch \
      --model-path "${MODEL_PATH}" \
      --context "${CONTEXT}" \
      --kv q4_0 \
      --parallel "${PARALLEL}" \
      --vision off \
      --tune quick \
      --access local \
      --port "${PORT}" \
      --api-key-env STRATA_API_KEY \
      --save-preset "${PRESET}" \
      --yes --no-tui
  else
    strata launch \
      --family qwen \
      --model iq3_xxs \
      --context "${CONTEXT}" \
      --kv q4_0 \
      --parallel "${PARALLEL}" \
      --vision off \
      --tune quick \
      --access local \
      --port "${PORT}" \
      --api-key-env STRATA_API_KEY \
      --save-preset "${PRESET}" \
      --yes --no-tui
  fi
}

if [[ -n "${STRATA_HOME_RESOLVED}" ]]; then
  launch_local_server "${STRATA_HOME_RESOLVED}"
elif command -v strata >/dev/null 2>&1; then
  launch_cli
else
  cat <<'EOF' >&2
Strata introuvable.

Install unique recommandée (une seule copie) :
  Place / clone Strata sous %USERPROFILE%\Strata (Windows) ou $HOME/Strata,
  lance START-HERE.bat une fois, puis :
    bash ml/serving/strata-iadaf.sh

Ou pointe explicitement :
  export STRATA_HOME="$HOME/Strata"
  export STRATA_CONFIG="$STRATA_HOME/strata-iq2_xs.json"
  bash ml/serving/strata-iadaf.sh

N'installe le CLI officiel (install.ps1) QUE si tu n'as PAS déjà
%USERPROFILE%\Strata — sinon tu retélécharges moteur + modèle en double.
EOF
  exit 1
fi

cat <<EOF

Strata API: http://127.0.0.1:${PORT}/v1
  OPENAI_BASE_URL=http://127.0.0.1:${PORT}/v1
  OPENAI_API_KEY=${STRATA_API_KEY}

Healthcheck:
  python ml/serving/healthcheck.py --base-url http://127.0.0.1:${PORT}/v1
EOF
