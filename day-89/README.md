# Day 89: Write Helpful Messages for Failed Wallet Transactions

## Description

Built a classifier that translates raw wallet errors into human-readable messages for the UI.

## The Problem

When a transaction fails in a frontend, users see a scary red stack trace. That tells them nothing. It might be:
- User closed the wallet popup
- Account is short on lamports for the fee
- Blockhash expired while the wallet was open
- Wallet was disconnected mid-flow

## The Solution

A pure function `classifyWalletError` that takes any error and returns:
- kind: machine-readable category
- title: short headline
- message: explanation for the user
- retryable: can the user try again?
- severity: how the UI should style it

## Error Categories

- user-rejected: wallet popup closed. Not a failure. A choice.
- blockhash-expired: transaction took too long. Retry with fresh blockhash.
- blockhash-not-found: same category, different error message.
- insufficient-funds: not enough SOL for amount + fee. Not retryable.
- wallet-disconnected: wallet was disconnected or locked. Retryable.
- unknown: fallback. Log full detail for the developer, calm message for the user.

## The Two Audiences

- Developer: full error + stack trace to the console via console.error
- User: classified title + message + retry button on screen

## The Experiments

1. Reject popup -> user-rejected (worked)
2. Overspend -> insufficient-funds (worked)
3. Disconnect mid-flow -> unknown (found a gap, added wallet-disconnected branch)
4. Force expiry -> blockhash-expired (simulated)

## Key Learnings

- Errors come from two worlds: wallet (inconsistent reports) and network (stable codes)
- The unknown bucket is the most valuable. It catches errors you haven't named yet.
- Real errors teach you which branches are missing. Don't imagine them.
- Split detail: full for you, calm for the user.
