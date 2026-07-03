#!/usr/bin/env bash
#
# Network-intrusion kill chain against the StakeLine application tier.
# A fixed three-stage sequence — reconnaissance, probing, exploitation — run
# from the Kali monitoring VM so Snort/Suricata + the SIEM have consistent
# traffic to detect across trials. Stage timing is logged so mean-time-to-detect
# (MTTD) can be computed from the IDS alerts against these timestamps.
#
# Authorised lab use only — target is the isolated lab network.

set -euo pipefail

TARGET="${1:-10.10.10.20}"     # StakeLine application server VM
LOG="../data/intrusion_timeline.log"

stamp() { echo "$(date --iso-8601=seconds) $*" | tee -a "$LOG"; }

echo "[*] intrusion kill chain -> ${TARGET}"
: > "$LOG"

# --- Stage 1: Reconnaissance (MITRE T1595 Active Scanning) ---
stamp "STAGE recon start"
nmap -sS -T4 -p 1-1024 "${TARGET}"                    # fast SYN sweep, trips scan rule
stamp "STAGE recon end"
sleep 5

# --- Stage 2: Probing (service/version enumeration) ---
stamp "STAGE probe start"
nmap -sV --version-intensity 5 -p 22,80,443,8080 "${TARGET}"
nmap --script http-enum -p 8080 "${TARGET}"
stamp "STAGE probe end"
sleep 5

# --- Stage 3: Exploitation attempt (T1041 exfil over web / T1190) ---
stamp "STAGE exploit start"
# scripted probe of the login and a crafted oversized payload to the app port
curl -s -m 5 "http://${TARGET}:8080/healthz" >/dev/null || true
python3 - "$TARGET" <<'PY'
import socket, sys
host = sys.argv[1]
payload = b"POST /login HTTP/1.1\r\nHost: %b\r\nContent-Length: 65535\r\n\r\n" % host.encode()
try:
    s = socket.create_connection((host, 8080), timeout=5)
    s.sendall(payload + b"A" * 4096)   # abnormal request body -> IDS signature
    s.close()
except OSError:
    pass
PY
stamp "STAGE exploit end"

echo "[*] timeline written to ${LOG} — correlate against IDS alerts for MTTD"
