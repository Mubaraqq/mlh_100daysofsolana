# Day 98: Record Your Agent Running Solo

## What This Is

An Amplify day. Recorded a live demo of the Day 96 autonomous agent running on devnet, then published it.

## The Video

[https://x.com/mubaraqabba/status/2109327937644138560]

## What the Demo Shows

Two runs, same command shape, different goals.

**Run 1 — success.** Goal: "Make sure the savings wallet holds at least 0.2 SOL." The agent reads both balances, computes the shortfall, sends exactly 0.2 SOL through the policy, verifies, and reports back. One confirmed transfer.

**Run 2 — denial.** Goal: "Make sure the savings wallet holds at least 1 SOL." The agent tries 0.8 SOL in one transfer — denied by the per-transfer cap. Splits into two 0.25 SOL transfers — both confirmed. Tries a third — denied by the per-run cap. Reports honestly that the goal cannot be met.

## Why It Matters

Anyone can wire a model to a wallet. The interesting frame is the refusal. The policy engine sits between the model and the money and says no when the rules say no.

Deny-by-default means the agent can't talk its way past a rule. The demo shows both sides: approval and refusal, side by side.

## Files

- `README.md` — this file
- Video published to X with the #100DaysOfSolana tag
