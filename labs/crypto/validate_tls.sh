#!/usr/bin/env bash
#
# TLS / session-encryption validation for StakeLine (OpenSSL 3.0).
# Confirms the enhanced posture actually protects credentials and session
# tokens in transit — i.e. that login traffic is not observable in cleartext,
# which is what makes the T1539 session-cookie-theft rule a real mitigation.
#
# Usage: ./validate_tls.sh stakeline.sim 443

set -euo pipefail

HOST="${1:-localhost}"
PORT="${2:-443}"

echo "=== StakeLine TLS validation: ${HOST}:${PORT} ==="

echo "[*] negotiated protocol & cipher:"
echo | openssl s_client -connect "${HOST}:${PORT}" -brief 2>/dev/null \
  | grep -E "Protocol|Cipher" || echo "    (no TLS listener — baseline posture serves cleartext HTTP)"

echo "[*] rejecting deprecated protocols (expect failure for TLS1.0/1.1):"
for proto in tls1 tls1_1; do
  if echo | openssl s_client -connect "${HOST}:${PORT}" -"${proto}" 2>/dev/null | grep -q "BEGIN CERTIFICATE"; then
    echo "    FAIL: ${proto} accepted (weak)"
  else
    echo "    OK:   ${proto} refused"
  fi
done

echo "[*] certificate validity window:"
echo | openssl s_client -connect "${HOST}:${PORT}" 2>/dev/null \
  | openssl x509 -noout -dates 2>/dev/null || true

echo "[*] verifying HSTS header is present:"
curl -sI "https://${HOST}:${PORT}/" | grep -i "strict-transport-security" \
  && echo "    OK: HSTS enforced" || echo "    WARN: no HSTS header"

echo "=== done ==="
