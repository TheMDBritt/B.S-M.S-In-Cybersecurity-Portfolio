# Elastic SIEM — StakeLine detection & correlation queries

Elastic Stack 8.x. The StakeLine app writes one JSON event per line to
`data/stakeline.log`; Filebeat ships it to the `stakeline-*` index. Snort/Suricata
EVE JSON lands in `logs-suricata-*`. The queries below drive the dashboards and
the mean-time-to-detect (MTTD) calculation used in the capstone.

---

## 1. Credential stuffing — auth failure burst per source IP

Elasticsearch aggregation (Dev Tools console):

```json
POST stakeline-*/_search
{
  "size": 0,
  "query": { "bool": { "filter": [
    { "term":  { "event": "auth_fail" } },
    { "range": { "ts": { "gte": "now-10m" } } }
  ] } },
  "aggs": {
    "by_src": {
      "terms": { "field": "src_ip", "min_doc_count": 30 },
      "aggs": { "fails_per_min": {
        "date_histogram": { "field": "ts", "fixed_interval": "1m" } } }
    }
  }
}
```

Detection rule (KQL) — fires when one source exceeds 30 failures in 10 minutes:

```
event: "auth_fail" and not event: "auth_success"
```
> Threshold rule: group by `src_ip`, threshold 30, window 10m.

---

## 2. Account takeover — success immediately after a failure burst

```
event: "auth_success" and mfa: false
```
Correlate with query 1 on `src_ip`: a success from an IP that just produced a
failure burst is a probable takeover. In the enhanced posture these become
`mfa_challenge` → `mfa_fail` instead, and no `auth_success` follows.

---

## 3. Network intrusion — kill-chain correlation (EQL sequence)

```eql
sequence by source.ip with maxspan=15m
  [ suricata where rule.name : "*RECON port scan*" ]
  [ suricata where rule.name : "*probe*" ]
  [ suricata where rule.name : "*exploit*" ]
```
A full three-stage match from one source is escalated to a **critical** alert.
MTTD = timestamp of the first matching alert − `STAGE recon start` from
`intrusion_timeline.log`.

---

## 4. Transaction fraud — held withdrawals and score distribution

```json
POST stakeline-*/_search
{
  "size": 0,
  "query": { "term": { "event": "withdrawal" } },
  "aggs": {
    "by_model":   { "terms": { "field": "model" },
      "aggs": { "flagged": { "filter": { "term": { "flagged": true } } },
                "avg_score": { "avg": { "field": "fraud_score" } } } }
  }
}
```

---

## 5. MTTD metric (per trial)

For each intrusion trial, MTTD is the delta between the attack stage start
(from `intrusion_timeline.log`) and the first correlated IDS alert. The
`metrics/analyze_results.py` script joins the two sources and reports mean MTTD
across the three trials for both postures.
