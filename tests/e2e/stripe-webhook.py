#!/usr/bin/env python3
"""Local signed-webhook integration checks; no Stripe payment is created.

Requires the configured Docker development stack and its root .env.
Only this run's temporary account and synthetic sales are removed afterwards.
Run separately from run-all.sh: Stripe configuration is optional for that suite.
"""
from concurrent.futures import ThreadPoolExecutor
from http.cookiejar import CookieJar
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import time
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import build_opener, HTTPRedirectHandler, HTTPCookieProcessor, Request
import uuid

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)
BASE = "http://localhost:3000"
WEBHOOK = BASE + "/api/stripe/webhook"
source = (ROOT / ".env").read_text()


def env_value(name):
    match = re.search(r"^" + name + r"=(.*)$", source, re.M)
    return match.group(1).strip().strip("\"'") if match else ""


assert env_value("STRIPE_SECRET_KEY").startswith(("sk_test_", "rk_test_")), "Test key required"
secret = env_value("STRIPE_WEBHOOK_SECRET")
assert re.fullmatch(r"whsec_[A-Za-z0-9]+", secret), "Configure the local listener first"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


browser = build_opener(HTTPCookieProcessor(CookieJar()), NoRedirect())


def http(path, data=None, headers=None, client=None):
    request = Request(path if path.startswith("http") else BASE + path,
                      data=data, headers=headers or {})
    try:
        response = (client or build_opener()).open(request, timeout=30)
    except HTTPError as error:
        response = error
    with response:
        return response.code, response.read(), response.headers


def post_json(path, data, client=None):
    return http(path, json.dumps(data).encode(), {"Content-Type": "application/json"}, client)


def sql(statement):
    result = subprocess.run(
        ["docker", "compose", "exec", "-T", "postgres", "sh", "-c",
         'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA'],
        input=statement, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, "PostgreSQL command failed (diagnostics withheld)"
    return result.stdout.strip()


def check(label, condition):
    assert condition, label
    print("OK  " + label)


run_id = uuid.uuid4().hex
email = "stripe-webhook-" + run_id + "@example.test"
password = secrets.token_urlsafe(24) + "A1!"
session_ids = ["cs_test_local_" + run_id + "_" + str(i) for i in range(4)]
user_id = None


def emit(index=0, event_type="checkout.session.completed", status="paid",
         metadata=None, signature="valid", event_id=None):
    event = {
        "id": event_id or "evt_local_" + uuid.uuid4().hex,
        "object": "event", "type": event_type, "livemode": False,
        "data": {"object": {
            "id": session_ids[index], "object": "checkout.session", "mode": "payment",
            "payment_status": status, "amount_total": 1000, "currency": "eur",
            "metadata": metadata if metadata is not None else {"userId": user_id, "packSlug": "impots"},
        }},
    }
    payload = json.dumps(event).encode()
    timestamp = int(time.time()) - (600 if signature == "expired" else 0)
    digest = hmac.new(secret.encode(), str(timestamp).encode() + b"." + payload,
                      hashlib.sha256).hexdigest()
    headers = {"Content-Type": "application/json"}
    if signature != "missing":
        headers["Stripe-Signature"] = "t=" + str(timestamp) + ",v1=" + digest
    if signature == "tampered":
        payload += b" "
    return http(WEBHOOK, payload, headers)[0]


def counts():
    return sql("SELECT (SELECT count(*) FROM users.pack_entitlements WHERE user_id='" + user_id +
               "'), (SELECT count(*) FROM billing.sales WHERE stripe_session_id IN (" +
               ",".join("'" + sid + "'" for sid in session_ids) + ")); ")


try:
    check("frontend accessible", http("/")[0] == 200)
    code, body, _ = post_json("/api/auth/register", {
        "name": "Stripe local test", "email": email, "password": password,
    })
    check("temporary account registered", code == 201)
    user_id = str(uuid.UUID(json.loads(body)["id"]))
    code, body, _ = http("/api/auth/csrf", client=browser)
    check("CSRF token available", code == 200)
    http("/api/auth/callback/credentials", urlencode({
        "csrfToken": json.loads(body)["csrfToken"], "email": email, "password": password,
    }).encode(), {"Content-Type": "application/x-www-form-urlencoded"}, browser)
    check("application sign-in works", http("/api/account", client=browser)[0] == 200)
    code, _, headers = http("/packs/impots?checkout=success", client=browser)
    check("success redirect alone does not unlock the pack",
          code in (302, 307) and "/payment/impots" in headers.get("Location", ""))
    check("anonymous Checkout refused", post_json("/api/checkout", {"slug": "impots", "waiveWithdrawal": True})[0] == 401)
    check("Checkout requires explicit consent", post_json("/api/checkout", {"slug": "impots"}, browser)[0] == 400)
    check("missing signature rejected", emit(signature="missing") == 400)
    private_marker = "evt_private_" + run_id
    check("changed raw body rejected", emit(signature="tampered", event_id=private_marker) == 400)
    logs = subprocess.run(["docker", "compose", "logs", "--no-color", "--since", "1m", "frontend"],
                          capture_output=True, text=True, timeout=30)
    check("invalid request payload is absent from logs",
          logs.returncode == 0 and private_marker not in logs.stdout + logs.stderr)
    check("old signature rejected", emit(signature="expired") == 400)
    check("unrelated event acknowledged", emit(event_type="payment_intent.succeeded") == 200)
    check("generic metadata ignored", emit(metadata={}) == 200)
    check("unknown pack ignored", emit(metadata={"userId": user_id, "packSlug": "unknown"}) == 200)
    check("unpaid Checkout acknowledged without fulfillment", emit(status="unpaid") == 200)
    check("no rights or sales before a confirmed payment", counts() == "0|0")

    event_id = "evt_local_" + run_id
    check("confirmed payment accepted", emit(event_id=event_id) == 200)
    check("sale and entitlement persisted", counts() == "1|1")
    check("paid pack accessible to its owner", http("/packs/impots", client=browser)[0] == 200)
    code, body, _ = post_json("/api/checkout", {"slug": "impots", "waiveWithdrawal": True}, browser)
    check("owned pack does not create another Checkout", code == 200 and json.loads(body).get("alreadyOwned") is True)
    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(executor.map(lambda _: emit(event_id=event_id), range(4)))
    check("concurrent duplicate events acknowledged", responses == [200] * 4)
    check("same session with another event ID acknowledged", emit() == 200)
    check("duplicates did not double rights or sales", counts() == "1|1")

    metadata = {"userId": user_id, "packSlug": "assurance-maladie"}
    check("delayed payment initially unpaid", emit(index=1, status="unpaid", metadata=metadata) == 200)
    check("delayed payment did not grant access early", counts() == "1|1")
    check("asynchronous success accepted", emit(index=1, event_type="checkout.session.async_payment_succeeded", metadata=metadata) == 200)
    check("asynchronous success persisted", counts() == "2|2")
    check("asynchronous duplicate accepted", emit(index=1, event_type="checkout.session.async_payment_succeeded", metadata=metadata) == 200)
    check("asynchronous duplicate is idempotent", counts() == "2|2")
    missing_user = {"userId": str(uuid.uuid4()), "packSlug": "impots"}
    check("database failure is retryable (HTTP 500)", emit(index=2, metadata=missing_user) == 500)
    check("failed entitlement preserves the sale without granting access", counts() == "2|3")
    check("failed persistence can be retried", emit(index=2, metadata=missing_user) == 500)
    check("failed retry does not duplicate the sale", counts() == "2|3")
    print("Signed local webhook checks passed; Stripe CLI transport and hosted Checkout are separate checks.")
finally:
    if user_id:
        # UUIDs/session IDs are generated locally, never taken from untrusted input.
        sql("BEGIN; DELETE FROM billing.sales WHERE stripe_session_id IN (" +
            ",".join("'" + sid + "'" for sid in session_ids) + "); " +
            "DELETE FROM users.app_users WHERE id='" + user_id + "' AND email='" + email + "'; COMMIT;")
        print("Temporary account and this run's synthetic sales removed.")
