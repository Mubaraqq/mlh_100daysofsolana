# Day 97: Write the Missing Manual for Your On-Chain Agent

## What This Is

A Document day. The deliverable is a published article on DEV Community that explains the agent stack built across Days 92–96 — well enough for another developer to understand it, trust it, and rebuild it.

## The Post

[From Prompt to Policy: How I Made a Solana Agent Safe Enough to Run Unattended](https://dev.to/mubaraqabba/from-prompt-to-policy-how-i-made-a-solana-agent-safe-enough-to-run-unattended-1kd2)

## Why This Day Exists

Code tells you what a system does. It rarely tells you why it works that way.

For a normal API, the code is almost self-documenting — same input, same output, every time. An agent isn't like that. The same goal produces different tool-call sequences on different runs. So a single run log can never reveal the one fact that matters most: which invariants hold no matter what the model decides.

Those invariants have to be written down deliberately. That's what this day produced.

## What the Post Covers

- **Inventory** — the five moving parts: agent loop, balance tool, transfer tool, MCP server, policy engine
- **Flow diagram** — goal → agent loop → tool dispatcher → policy engine → Solana devnet
- **Tool reference** — `get_balance` and `transfer_sol`, with inputs, returns, side effects, and whether each is guarded by policy
- **Policy layer** — the three rules, the deny-by-default pattern, the core invariant
- **Annotated runs** — Trial 1 (goal met) and Trial 2 (policy denial), with a comment on every step
- **Lessons learned** — five honest observations from the week
- **Open questions** — where the next version starts


## Files

- `README.md` — this file
