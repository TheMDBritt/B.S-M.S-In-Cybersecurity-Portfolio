"""
Generate the StakeLine user store with bcrypt-hashed passwords and per-user
TOTP secrets, writing ../data/users.json. Run once before starting the app.

The test population deliberately includes accounts whose passwords also appear
in the breach dump used by the credential-stuffing attack, so the baseline vs
enhanced comparison is meaningful.
"""

import json
from pathlib import Path

import bcrypt
import pyotp

DATA = Path(__file__).resolve().parent.parent / "data"

# (username, password, starting_balance, account_age_days)
SEED = [
    ("mbritt",     "Str0ngPass!",   500,  842),
    ("highroller", "letmein",       9000, 611),
    ("jdoe22",     "summer2023",    250,  73),
    ("ksmith",     "password1",     120,  5),
    ("lchen",      "Wint3r#2024",   400,  310),
]


def main():
    DATA.mkdir(parents=True, exist_ok=True)
    users = {}
    for user, password, balance, age in SEED:
        users[user] = {
            "hash": bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),
            "totp_secret": pyotp.random_base32(),
            "balance": balance,
            "account_age_days": age,
        }
    with (DATA / "users.json").open("w") as fh:
        json.dump(users, fh, indent=2)
    print(f"wrote {len(users)} users to {DATA / 'users.json'}")


if __name__ == "__main__":
    main()
