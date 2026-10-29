#!/usr/bin/env bash
# Docker development only. No API key or signing secret is printed.
set -euo pipefail
command -v stripe >/dev/null 2>&1 || {
  echo "Stripe CLI absente : https://docs.stripe.com/cli/install" >&2
  exit 1
}
command -v python3 >/dev/null 2>&1 || {
  echo "Python 3 est requis (bibliothèque standard uniquement)." >&2
  exit 1
}
cd "$(dirname "$0")/.."
exec python3 -u - <<'PY'
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
from urllib.parse import urlparse


def fail(message):
    sys.exit(message)


def run(args, env=None, input=None):
    # Always capture errors: CLI diagnostics can contain credentials/payloads.
    try:
        result = subprocess.run(args, env=env, input=input, capture_output=True,
                                text=True, timeout=90)
    except (OSError, subprocess.TimeoutExpired):
        fail("Commande indisponible ou délai dépassé : " + args[0])
    return result


def stripe_json(path, env):
    result = run(["stripe", "get", path], env=env)
    try:
        data = json.loads(result.stdout)
    except ValueError:
        data = {}
    if result.returncode or "error" in data or not data:
        fail("Accès Stripe impossible. Vérifiez le réseau et lancez stripe login "
             "dans votre terminal (sandbox/test uniquement), puis relancez ce script. "
             "Vérifiez aussi la clé de test du .env si la CLI est déjà connectée.")
    return data


env_file = Path(".env")
if not env_file.is_file() or env_file.is_symlink():
    fail("Un fichier .env racine ordinaire est requis ; voir .env.example.")
if run(["git", "check-ignore", "-q", ".env"]).returncode:
    fail("Le fichier .env doit être ignoré par Git.")
source = env_file.read_text()


def env_value(name):
    values = re.findall(r"^" + name + r"=(.*)$", source, re.M)
    if len(values) > 1:
        fail("Variable dupliquée dans .env : " + name)
    return values[0].strip().strip("\"'") if values else ""


key = env_value("STRIPE_SECRET_KEY")
if not key.startswith(("sk_test_", "rk_test_")) or "your-" in key or "..." in key:
    fail("Renseignez STRIPE_SECRET_KEY avec une clé de TEST dans le .env racine. "
         "Ne la collez pas dans le chat.")

# Discard API-key overrides for the CLI login; explicitly verify test mode.
cli_env = dict(os.environ, STRIPE_CLI_TELEMETRY_OPTOUT="1", STRIPE_NO_AUTO_UPDATE="1")
cli_env.pop("STRIPE_API_KEY", None)
if stripe_json("/v1/balance", cli_env).get("livemode") is not False:
    fail("La CLI doit utiliser un sandbox Stripe, jamais le mode live.")
cli_account = stripe_json("/v1/account", cli_env).get("id")
app_env = dict(cli_env, STRIPE_API_KEY=key)
if stripe_json("/v1/balance", app_env).get("livemode") is not False:
    fail("La clé applicative doit être en mode test.")
if not cli_account or stripe_json("/v1/account", app_env).get("id") != cli_account:
    fail("La CLI et STRIPE_SECRET_KEY utilisent des comptes différents. "
         "Sélectionnez le bon sandbox avec stripe switch.")

config = run(["docker", "compose", "config", "--format", "json"])
if config.returncode:
    fail("Configuration Docker Compose invalide ou Docker inaccessible.")
frontend = json.loads(config.stdout)["services"]["frontend"]["environment"]
if urlparse(frontend.get("AUTH_URL", "")).hostname not in ("localhost", "127.0.0.1", "::1"):
    fail("Ce script exige un frontend local (AUTH_URL sur localhost).")
if frontend.get("STRIPE_SECRET_KEY") != key:
    fail("Compose surcharge STRIPE_SECRET_KEY : utilisez la clé du .env racine.")

secret_result = run(["stripe", "listen", "--print-secret"], env=cli_env)
match = re.fullmatch(r"whsec_[A-Za-z0-9]+", secret_result.stdout.strip())
if secret_result.returncode or not match:
    fail("Secret de signature indisponible. Vérifiez stripe login et le réseau.")
secret = match.group()
if env_value("STRIPE_WEBHOOK_SECRET") != secret:
    line = "STRIPE_WEBHOOK_SECRET=" + secret
    updated = re.sub(r"^STRIPE_WEBHOOK_SECRET=.*$", line, source, flags=re.M)
    if updated == source:
        updated = source.rstrip("\n") + "\n" + line + "\n"
    # Atomic write with restrictive permissions, preserving every other key.
    fd, temporary = tempfile.mkstemp(prefix=".stripe-", suffix=".env", dir=".")
    try:
        with os.fdopen(fd, "w") as output:
            output.write(updated)
        os.replace(temporary, env_file)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print("Secret de signature enregistré dans .env (valeur masquée).")
os.chmod(env_file, 0o600)

# Detect exported/Compose overrides before recreating any container.
config = run(["docker", "compose", "config", "--format", "json"])
if config.returncode or json.loads(config.stdout)["services"]["frontend"]["environment"].get("STRIPE_WEBHOOK_SECRET") != secret:
    fail("Compose surcharge STRIPE_WEBHOOK_SECRET. Retirez cette surcharge et relancez.")
probe = run(["docker", "compose", "exec", "-T", "frontend", "node", "-e",
             "let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{"
             "const e=JSON.parse(s);process.exit(Object.keys(e).every(k=>process.env[k]===e[k])?0:1)})"],
            input=json.dumps({"STRIPE_SECRET_KEY": key, "STRIPE_WEBHOOK_SECRET": secret}))
if probe.returncode:
    print("Recréation du frontend uniquement pour charger les variables Stripe…")
    if run(["docker", "compose", "up", "-d", "--no-deps", "--force-recreate", "frontend"]).returncode:
        fail("Recréation échouée. Vérifiez docker compose ps, puis relancez le script.")

print("Écoute TEST vers localhost:3000/api/stripe/webhook. Gardez ce terminal ouvert.")
print("Autre terminal : stripe trigger checkout.session.completed (transport uniquement).")
print("Pour les droits : payez un pack via l'application avec une carte de test.")
listener = subprocess.Popen(
    ["stripe", "listen", "--events",
     "checkout.session.completed,checkout.session.async_payment_succeeded",
     "--forward-to", "localhost:3000/api/stripe/webhook"],
    env=cli_env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
)


def stop(signum, frame):
    listener.terminate()


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    for line in listener.stdout:
        print(re.sub(r"(?:whsec_|[sr]k_(?:test|live)_)[A-Za-z0-9_.-]+", "[secret masqué]", line), end="")
finally:
    listener.terminate()
    try:
        listener.wait(timeout=5)
    except subprocess.TimeoutExpired:
        listener.kill()
        listener.wait()
sys.exit(listener.returncode if listener.returncode > 0 else 0)
PY
