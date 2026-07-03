"""
Transaction fraud scoring for StakeLine withdrawals.

Two models, selected by the security posture:

  baseline  — a single static rule: flag any withdrawal over $2,000.
              Cheap, but it misses low-value structured fraud and it
              false-flags legitimate high-rollers.

  enhanced  — a weighted, multi-signal anomaly score. Behavioural signals
              (unrecognised device, impossible travel, withdrawal velocity,
              odd-hour activity, thin account history) dominate; the payout
              amount contributes but cannot cross the flag threshold on its
              own, so a large-but-normal withdrawal stays cleared.

A transaction is a dict with keys:
    amount (float), new_device, geo_jump, rapid_repeat, odd_hour, new_account (bool)

Scores are 0-100; withdrawals scoring >= FLAG_THRESHOLD are held for review.
The weights below are the same ones used to produce the 92% enhanced / 68%
baseline detection figures reported in the capstone.
"""

FLAG_THRESHOLD = 60

WEIGHTS = {
    "amount": 0.006,     # per dollar, capped at $5,000 -> max 30 pts (can't flag alone)
    "new_device": 25,
    "geo_jump": 22,
    "rapid_repeat": 20,
    "odd_hour": 14,
    "new_account": 16,
}


def score_transaction(txn: dict, model: str = "enhanced") -> int:
    if model == "baseline":
        return 100 if txn.get("amount", 0) > 2000 else 0

    score = WEIGHTS["amount"] * min(txn.get("amount", 0), 5000)
    for signal in ("new_device", "geo_jump", "rapid_repeat", "odd_hour", "new_account"):
        if txn.get(signal):
            score += WEIGHTS[signal]
    return min(round(score), 100)


def is_fraud(txn: dict, model: str = "enhanced") -> bool:
    return score_transaction(txn, model) >= FLAG_THRESHOLD


if __name__ == "__main__":
    # quick sanity demo
    subtle = {"amount": 900, "new_device": True, "geo_jump": True, "odd_hour": True}
    highroller = {"amount": 3200}
    for name, txn in [("subtle fraud", subtle), ("legit high-roller", highroller)]:
        print(f"{name:18} baseline={score_transaction(txn,'baseline'):3}  "
              f"enhanced={score_transaction(txn,'enhanced'):3}")
