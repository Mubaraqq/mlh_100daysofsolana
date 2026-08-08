# Day 68: Try to Make Two PDAs Share an Address

## Description

Explored PDA derivation by running a script that derives addresses from different seed combinations.

**What the script tested:**
- Per-user counter PDAs: \[\
counter\, wallet_pubkey]\ → different addresses for different wallets
- Global counter PDA: \[\
counter\]\ → same address for every caller
- Near-miss seed variants: single character changes → completely different PDAs
- Spoof attempt: Wallet A trying to increment Wallet B's PDA → rejected with ConstraintSeeds

**Key Learnings:**
- Same seeds + same program ID = same PDA address (deterministic)
- Different seeds = different PDA addresses
- A single byte difference in seeds gives a wildly different address
- seeds constraint re-derives the address from the signer and verifies it matches the passed account
- Spoof attempts fail at the seed constraint before any business logic runs
