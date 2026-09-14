# Day 82: Rebuild the $326M Wormhole Bug Yourself

## Description

Reproduced the class of bug that cost the Solana ecosystem hundreds of millions of dollars: a program trusting an account without checking its owner.

## The Vulnerable Program

leaky_vault deserializes a Config account by hand using UncheckedAccount, without ever verifying the account is owned by the program.

## The Attack

The attacker forges a Config account:
- Owned by the System Program (not the leaky_vault program)
- Filled with bytes that look like a real Config
- The admin field set to the attacker's own pubkey

The program deserializes it, reads admin, and authorizes the withdraw.

## The Fix

Change UncheckedAccount to Account<'info, Config>. Account<'info, Config> checks the owner before deserializing. A System-owned forgery is rejected with AccountOwnedByWrongProgram (3007).

## Test Results

Vulnerable build: Result Ok, attack succeeds.
Fixed build: Result Err Custom 3007 AccountOwnedByWrongProgram, attack rejected.

## Key Learnings

- Never read an account's contents until you have confirmed its identity
- UncheckedAccount means you must verify the owner yourself
- Account<'info, T> checks the owner before the handler runs
- Wormhole trusted a forged sysvar, Cashio trusted unvalidated collateral, this vault trusted a forged Config
- Same shape, three times over
- The fix is a type change, not new logic
