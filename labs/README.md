# StakeLine Lab Kit

Reproducible lab environment for the capstone **“An Analysis of Cybersecurity
Measures in Sports Betting Platforms.”** It builds a small simulated sportsbook,
runs the three attack campaigns against it, and detects them with an IDS + SIEM
stack — so the baseline vs enhanced security comparison can be reproduced end to
end.

> **Authorised lab use only.** Every script targets the local, isolated lab
> network and synthetic data. Do not point them at systems you do not own.

---

## What's here

```
labs/
├── sportsbook/            # StakeLine — the target application (Flask)
│   ├── app.py             #   login / bet / withdraw, structured event logging
│   ├── auth.py            #   bcrypt passwords + TOTP (RFC 6238) second factor
│   ├── fraud.py           #   baseline threshold vs enhanced anomaly scoring
│   ├── seed_users.py      #   generate the bcrypt/TOTP user store
│   └── requirements.txt
├── attacks/
│   ├── credential_stuffing.py     # Python replay of a breach dump (T1078/T1110)
│   ├── hydra_credential_stuffing.sh
│   ├── network_intrusion.sh       # recon → probe → exploit kill chain (T1595/T1041)
│   └── fraud_injection.py         # payout manipulation & duplicate withdrawals (T1565)
├── detection/
│   ├── snort.rules                # Snort 2.9 ruleset
│   ├── suricata.rules             # Suricata 7.0 ruleset
│   └── elastic/detection_queries.md   # SIEM correlation & MTTD queries
├── crypto/
│   └── validate_tls.sh            # OpenSSL TLS / session-encryption checks
├── metrics/
│   └── analyze_results.py         # aggregate runs into the results table
└── data/                          # breach dump + generated logs/results
```

## Security posture

The same code runs as either build, selected by environment variables:

| Posture  | MFA | IDS/SIEM | Fraud model | Command |
|----------|-----|----------|-------------|---------|
| Baseline | off | off      | threshold   | `MFA_ENABLED=0 FRAUD_MODEL=baseline python app.py` |
| Enhanced | on  | on       | anomaly     | `MFA_ENABLED=1 FRAUD_MODEL=enhanced python app.py` |

## Quick start

```bash
cd labs/sportsbook
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python seed_users.py

# terminal 1 — start the target (baseline)
MFA_ENABLED=0 FRAUD_MODEL=baseline python app.py

# terminal 2 — run the campaigns
cd ../attacks
python credential_stuffing.py --attempts 10000
python fraud_injection.py

# then re-run everything with MFA_ENABLED=1 FRAUD_MODEL=enhanced and compare
cd ../metrics && python analyze_results.py
```

## Lab environment (as run in the capstone)

| VM | OS | Specs | Role |
|----|----|-------|------|
| User Access | Windows 10 | 2 vCPU / 4 GB | Login interface + browser client |
| Application Server | Ubuntu Server 22 | 4 vCPU / 8 GB | Authentication + betting engine |
| Database Server | Ubuntu Server 22 | 4 vCPU / 8 GB | Encrypted credentials + transactions |
| Security Monitoring | Kali Linux | 4 vCPU / 8 GB | IDS, SIEM, attack execution |
| Logging Server | Ubuntu 20 | 2 vCPU / 4 GB | Central log aggregation |

**Toolchain:** Hydra 9.4 · Python 3.11 · OpenSSL 3.0 · Snort 2.9 · Suricata 7.0 · Elastic SIEM 8.x

## Reproduced results

| Metric | Baseline | Enhanced |
|--------|----------|----------|
| Credential takeover rate | ~30% | ~2% |
| IDS detection rate | 54% | 89% |
| Mean time to detect | 14 min | 3 min |
| Fraud detection accuracy | 68% | 92% |

An interactive, no-install version of these three campaigns lives in **The
Sandbox** on the [portfolio site](../index.html).
