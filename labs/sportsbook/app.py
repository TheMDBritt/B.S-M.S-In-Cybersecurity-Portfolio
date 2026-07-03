"""
StakeLine — simulated sportsbook target application.

A deliberately minimal Flask app that mirrors the core of a real sportsbook:
account login, wager placement, and withdrawals against a wallet. It exists so
the attack scripts in ../attacks have a realistic target to run against and so
the detection stack has real traffic and logs to inspect.

The security posture is controlled by environment variables so the same app can
be run as the BASELINE build (password-only, no fraud model) or the ENHANCED
build (password + TOTP MFA, anomaly-based fraud monitoring):

    # baseline
    MFA_ENABLED=0 FRAUD_MODEL=baseline python app.py

    # enhanced
    MFA_ENABLED=1 FRAUD_MODEL=enhanced python app.py

Every authentication and transaction event is written as one JSON object per
line to ../data/stakeline.log, which is the file the SIEM ingests.

Capstone: "An Analysis of Cybersecurity Measures in Sports Betting Platforms"
Author:  Malcolm D. Britt
"""

import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, request, jsonify, session

from auth import verify_password, verify_totp, load_users
from fraud import score_transaction

APP_ROOT = Path(__file__).resolve().parent
LOG_PATH = APP_ROOT.parent / "data" / "stakeline.log"

MFA_ENABLED = os.environ.get("MFA_ENABLED", "0") == "1"
FRAUD_MODEL = os.environ.get("FRAUD_MODEL", "baseline")  # baseline | enhanced
FRAUD_FLAG_THRESHOLD = 60

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "lab-only-not-a-real-secret")

USERS = load_users()          # {username: {"hash":..., "totp_secret":..., "balance":...}}
PENDING_MFA = {}              # session_token -> username awaiting second factor


def log_event(event, **fields):
    """Append one structured JSON event for the SIEM to correlate."""
    record = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "src_ip": request.headers.get("X-Forwarded-For", request.remote_addr),
        "posture": "enhanced" if (MFA_ENABLED and FRAUD_MODEL == "enhanced") else "baseline",
        **fields,
    }
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a") as fh:
        fh.write(json.dumps(record) + "\n")
    return record


@app.post("/login")
def login():
    user = (request.form.get("user") or "").strip()
    password = request.form.get("pass") or ""

    record = USERS.get(user)
    if not record or not verify_password(password, record["hash"]):
        log_event("auth_fail", user=user, reason="bad_credentials")
        return jsonify(status="bad_credentials"), 401

    if MFA_ENABLED:
        token = uuid.uuid4().hex
        PENDING_MFA[token] = user
        log_event("mfa_challenge", user=user)
        return jsonify(status="mfa_required", mfa_token=token), 401

    session["user"] = user
    log_event("auth_success", user=user, mfa=False)
    return jsonify(status="ok", user=user)


@app.post("/mfa")
def mfa():
    token = request.form.get("mfa_token") or ""
    otp = request.form.get("otp") or ""
    user = PENDING_MFA.get(token)
    if not user:
        return jsonify(status="mfa_expired"), 401

    if not verify_totp(USERS[user]["totp_secret"], otp):
        log_event("mfa_fail", user=user, reason="bad_otp")
        return jsonify(status="mfa_required"), 401

    PENDING_MFA.pop(token, None)
    session["user"] = user
    log_event("auth_success", user=user, mfa=True)
    return jsonify(status="ok", user=user)


@app.post("/bet")
def bet():
    user = session.get("user")
    if not user:
        return jsonify(status="unauthorized"), 401
    stake = float(request.form.get("stake", 0))
    record = USERS[user]
    if stake <= 0 or stake > record["balance"]:
        return jsonify(status="invalid_stake"), 400
    record["balance"] -= stake
    log_event("bet_placed", user=user, stake=stake, balance=record["balance"])
    return jsonify(status="ok", balance=record["balance"])


@app.post("/withdraw")
def withdraw():
    """Withdrawals are the fraud surface: each one is scored before it settles."""
    user = session.get("user")
    if not user:
        return jsonify(status="unauthorized"), 401

    txn = {
        "amount": float(request.form.get("amount", 0)),
        "new_device": request.form.get("new_device") == "1",
        "geo_jump": request.form.get("geo_jump") == "1",
        "rapid_repeat": request.form.get("rapid_repeat") == "1",
        "odd_hour": datetime.now().hour in range(2, 5),
        "new_account": USERS[user].get("account_age_days", 999) < 30,
    }

    fraud_score = score_transaction(txn, FRAUD_MODEL)
    flagged = fraud_score >= FRAUD_FLAG_THRESHOLD

    log_event(
        "withdrawal",
        user=user,
        amount=txn["amount"],
        fraud_score=fraud_score,
        flagged=flagged,
        model=FRAUD_MODEL,
    )

    if flagged:
        return jsonify(status="held_for_review", fraud_score=fraud_score), 202

    USERS[user]["balance"] -= txn["amount"]
    return jsonify(status="settled", balance=USERS[user]["balance"])


@app.get("/healthz")
def healthz():
    return jsonify(status="ok", mfa=MFA_ENABLED, fraud_model=FRAUD_MODEL)


if __name__ == "__main__":
    print(f"[StakeLine] posture: MFA_ENABLED={MFA_ENABLED} FRAUD_MODEL={FRAUD_MODEL}")
    print(f"[StakeLine] logging events to {LOG_PATH}")
    app.run(host="0.0.0.0", port=8080)
