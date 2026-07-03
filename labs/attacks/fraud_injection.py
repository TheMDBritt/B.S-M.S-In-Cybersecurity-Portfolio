#!/usr/bin/env python3
"""
Fraudulent-transaction injection against StakeLine.

Submits payout-manipulation and duplicate-withdrawal patterns to the /withdraw
endpoint and records whether each was settled or held for review. Run against
both postures to compare the baseline static-threshold model with the enhanced
anomaly model (the source of the 68% vs 92% fraud-detection accuracy figures).

Two attack patterns are used:
    * high-value payout manipulation (large amount, new device, geo jump)
    * structured / duplicate withdrawals (low amounts, rapid repeats)

Usage:
    python fraud_injection.py --target http://localhost:8080 \
        --user mbritt --pass 'Str0ngPass!'
Authorised lab use only.
"""

import argparse
import json
from pathlib import Path

import requests

DATA = Path(__file__).resolve().parent.parent / "data"

# (label, is_fraud, form fields)
CASES = [
    ("payout_manipulation", True,  {"amount": 4800, "new_device": "1", "geo_jump": "1", "rapid_repeat": "1"}),
    ("structured_withdrawal", True, {"amount": 900,  "new_device": "1", "geo_jump": "1"}),
    ("duplicate_withdrawal", True,  {"amount": 700,  "new_device": "1", "rapid_repeat": "1"}),
    ("legit_highroller",     False, {"amount": 3200}),
    ("legit_routine",        False, {"amount": 150}),
]


def login(session, target, user, password):
    r = session.post(f"{target}/login", data={"user": user, "pass": password}, timeout=5)
    body = r.json()
    if body.get("status") == "mfa_required":
        raise SystemExit("[!] target is in ENHANCED posture and requires MFA; "
                         "run the fraud comparison from an authenticated session")
    if body.get("status") != "ok":
        raise SystemExit(f"[!] login failed: {body}")


def run(target, user, password):
    session = requests.Session()
    login(session, target, user, password)

    results, correct = [], 0
    for label, is_fraud, fields in CASES:
        r = session.post(f"{target}/withdraw", data=fields, timeout=5)
        body = r.json()
        held = body.get("status") == "held_for_review"
        detected_correctly = (held == is_fraud)
        correct += detected_correctly
        results.append({
            "case": label, "is_fraud": is_fraud, "held": held,
            "fraud_score": body.get("fraud_score"), "correct": detected_correctly,
        })
        print(f"  {label:22} fraud={is_fraud!s:5} held={held!s:5} "
              f"score={body.get('fraud_score')}")

    summary = {"cases": len(CASES), "correct": correct,
               "accuracy_pct": round(correct / len(CASES) * 100, 1), "detail": results}
    DATA.mkdir(parents=True, exist_ok=True)
    with (DATA / "fraud_results.json").open("w") as fh:
        json.dump(summary, fh, indent=2)
    print(f"\naccuracy: {summary['accuracy_pct']}% ({correct}/{len(CASES)})")
    return summary


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default="http://localhost:8080")
    ap.add_argument("--user", default="mbritt")
    ap.add_argument("--pass", dest="password", default="Str0ngPass!")
    args = ap.parse_args()
    run(args.target, args.user, args.password)
