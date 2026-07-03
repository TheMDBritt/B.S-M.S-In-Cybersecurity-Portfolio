#!/usr/bin/env python3
"""
Aggregate the raw lab outputs into the comparison table reported in the
capstone. Reads the JSON result files produced by the attack scripts (baseline
vs enhanced runs) plus the intrusion timeline / IDS alerts, and prints the
metric table: detection rate, MTTD, fraud accuracy, takeover rate.

Usage:
    python analyze_results.py --baseline ../data/baseline --enhanced ../data/enhanced

Each posture directory is expected to contain:
    credential_results.json   (from credential_stuffing.py)
    fraud_results.json        (from fraud_injection.py)
    ids_alerts.json           (exported from the SIEM: [{"stage","detected","mttd_min"}...])
"""

import argparse
import json
from pathlib import Path


def load(path):
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else {}


def summarize(posture_dir):
    d = Path(posture_dir)
    cred = load(d / "credential_results.json")
    fraud = load(d / "fraud_results.json")
    alerts = load(d / "ids_alerts.json") or []

    detected = [a for a in alerts if a.get("detected")]
    detection_rate = round(len(detected) / len(alerts) * 100, 1) if alerts else None
    mttd_vals = [a["mttd_min"] for a in detected if a.get("mttd_min") is not None]
    mttd = round(sum(mttd_vals) / len(mttd_vals), 1) if mttd_vals else None

    return {
        "takeover_rate_pct": cred.get("success_rate"),
        "blocked_by_mfa": cred.get("blocked_by_mfa"),
        "ids_detection_pct": detection_rate,
        "mttd_min": mttd,
        "fraud_accuracy_pct": fraud.get("accuracy_pct"),
    }


def fmt(v):
    return "—" if v is None else v


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline", default="../data/baseline")
    ap.add_argument("--enhanced", default="../data/enhanced")
    args = ap.parse_args()

    base = summarize(args.baseline)
    enh = summarize(args.enhanced)

    rows = [
        ("Credential takeover rate", "takeover_rate_pct", "%"),
        ("Blocked by MFA",           "blocked_by_mfa",    ""),
        ("IDS detection rate",       "ids_detection_pct", "%"),
        ("Mean time to detect",      "mttd_min",          " min"),
        ("Fraud detection accuracy", "fraud_accuracy_pct","%"),
    ]

    print(f"{'Metric':28} {'Baseline':>12} {'Enhanced':>12}")
    print("-" * 54)
    for label, key, unit in rows:
        b = f"{fmt(base[key])}{unit if base[key] is not None else ''}"
        e = f"{fmt(enh[key])}{unit if enh[key] is not None else ''}"
        print(f"{label:28} {b:>12} {e:>12}")


if __name__ == "__main__":
    main()
