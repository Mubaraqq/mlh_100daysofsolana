# Day 99: Capstone — Proof of Ship

## What It Is

A capstone project deployed to devnet. An Anchor program that lets any wallet permanently record on-chain that it shipped a capstone.

**Program ID:** `6xKXthNFn8YdaPVqdrAJWDfaAxeNeBX5MZuUSaVxd7mL`

**Explorer:** https://explorer.solana.com/address/6xKXthNFn8YdaPVqdrAJWDfaAxeNeBX5MZuUSaVxd7mL?cluster=devnet

## The Design

One instruction: `ship(project_name, message)`.

It creates a PDA with seeds `[b"ship", builder.key()]`. That means **each wallet gets exactly one record, forever**. The address itself enforces the rule — a second `ship` call from the same wallet fails because the account already exists.

The record stores:
- `builder` — the wallet that shipped
- `project_name` — what they built
- `message` — a short note
- `shipped_at` — Unix timestamp
- `bump` — the PDA bump seed

## Capstone Requirements

- ✅ Anchor program with a PDA account (seeds: `[b"ship", builder]`)
- ✅ Custom errors (`NameTooLong`, `MessageTooLong`) + runtime constraint (one record per wallet)
- ✅ Happy-path test: ship once, read it back
- ✅ Failure-path test: try to ship twice, expect rejection
- ✅ Deployed to devnet
- ✅ Integrated with agent and token

## Tests

Run locally:

\`\`\`
anchor test
\`\`\`

Two tests, both passing:
- `records your capstone on chain` — happy path
- `only lets each wallet ship once` — failure path

## Live on Devnet

The program is deployed and a record exists:

- **Program:** `6xKXthNFn8YdaPVqdrAJWDfaAxeNeBX5MZuUSaVxd7mL`
- **Ship record PDA:** `H28Rm6XztvRhKvyTWXYvV32GmfV2wepuZyvsb9Us8zz4`
- **Ship transaction:** `5f1Y8apiBmGfw5mkAAg7UwuZM9kStp2neXEscYoSNye5GR1dPzUdzq8P3TnYWybuHNDJ329xWdzxMQSwQHudYnxZ`

## Integrations

**1. Agent reader** (`scripts/check-ship.mjs`)

A read-only tool that takes a wallet address, derives its ShipRecord PDA, fetches it from devnet, and decodes the fields. Proves the capstone connects to the agent work from Days 92–96.

\`\`\`
node scripts/check-ship.mjs 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj
\`\`\`

**2. Token-2022 badge** (`scripts/mint-badge.mjs`)

A 1-of-1 Token-2022 mint with metadata embedded in the mint account (MetadataPointer extension). Commemorates the capstone.

- **Mint:** `CiyHzugX2vFbvaBEsNDueykV2m25WQHxMT59pWdf35Df`
- **Mint transaction:** `3Z8qfbHg81PYKDaZe6FoWsxX8xLKDdu51EzdrtKVdJUAcNVsLJ3wtR6Mur26dMKABd3C9Uk8u5fbhJ9Zdi8HQuLz`

## How to Ship

\`\`\`
node scripts/ship-once.mjs "Project Name" "Your message"
\`\`\`

Each wallet can only call this once.

## Files

- `programs/proof-of-ship/src/lib.rs` — the program
- `tests/proof-of-ship.ts` — the TypeScript tests
- `scripts/ship-once.mjs` — calls `ship` on devnet
- `scripts/check-ship.mjs` — reads a ShipRecord
- `scripts/mint-badge.mjs` — mints the Token-2022 badge