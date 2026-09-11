# Day 80: Write Tests That Try to Rob You

## Description

Built a vault program with a withdraw instruction and wrote three adversarial tests that simulate attacks.

## The Three Attacks

1. Wrong signer -> ConstraintSeeds (2006)
2. Look-alike account -> ConstraintSeeds (2006)
3. Overdraw -> InsufficientFunds (6000)

## Test Results

running 3 tests
test substituted_account_is_rejected_by_seeds ... ok
test overdraw_underflows_safely ... ok
test attacker_cannot_withdraw_with_wrong_authority ... ok

test result: ok. 3 passed, 0 failed

## Key Learnings

- Adversarial tests prove your defenses actually work
- Assert the exact error code, not just that it failed
- ConstraintSeeds catches wrong signers and fake accounts
- Custom errors catch arithmetic issues
