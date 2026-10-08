# Day 96: Hand Your Agent a Goal and Watch the Whole Stack Run Itself

## What This Is

An Experiment, not a Build. This is the observability day — you run the whole stack against three conditions and read the logs.

The goal is one sentence: "Make sure the savings wallet holds at least 0.2 SOL." No recipient, no amount, no steps. The agent has to check balances, do arithmetic, decide whether a transfer is needed, go through the policy layer, verify, and report.

## What's in the stack

- Two read/write tools: `get_balance`, `transfer_sol`
- A deny-by-default policy with per-transfer and per-run caps
- An agent loop with a turn limit (`MAX_TURNS`)
- A structured run log written to `run-log.json`

## The three trials

### Trial 1 — normal run

Goal: savings ≥ 0.2 SOL. Savings started at 0, operating at 4.64 SOL.

The agent read both balances, computed the 0.2 shortfall, made one policy-approved transfer, re-read both balances, and wrote a final report. Six turns, five tool calls, one confirmed transfer.

Ran it a second time without changes. The goal was already satisfied, so the agent made **zero transfers** and said so. Three turns, two reads.

### Trial 2 — policy fights back

Changed the per-transfer cap to 0.05 SOL and raised the goal to 0.4 SOL.

The savings wallet held 0.2 SOL from Trial 1, so the agent needed 0.2 more — but no single transfer over 0.05 would sign.

What happened:
- Turn 3: tried 0.2 in one transfer → **denied**
- Turns 4–7: split into four 0.05 transfers → all confirmed
- Turn 8: read balance, saw 0.35 (one transfer still confirming), panicked
- Turn 10: sent a fifth 0.05
- Turn 12: hit MAX_TURNS before writing a final report

Final savings: 0.45 SOL (overshot by 0.05).

**The finding:** the per-transfer cap did NOT stop the agent. It just slowed it down. Only the per-run cap bounds total spend. A rate limit is not a spend limit.

### Trial 3 — impossible goal

Set the goal to 5 SOL. The operating wallet held ~3.99 SOL.

The agent read both balances, did the arithmetic (needs 4.55 more, only has 3.99), and concluded the goal could not be met. **Made zero transfer attempts.** Three turns, two reads, one honest report.

## Why this matters

Safety comes from the composition of constraints, not any single rule. In Trial 3, three independent limits each could have stopped the agent:

1. The per-transfer cap (0.05 SOL)
2. The per-run cap (0.5 SOL)
3. The turn limit (20)

Any one could fail. All three failing at once is what you protect against.

## The run log

`run-log.json` records every event with a turn number: tool calls, policy verdicts, tool results, and the final report. This is the agent-world equivalent of structured request logging. It's what lets you answer "why did the balance change" with evidence instead of a guess.

## Files

- `agent-workflow.mjs` — the whole stack: tools, policy, loop, log
- `agent-wallet.json` — operating wallet (gitignored)
- `savings-wallet.json` — savings wallet (gitignored)
- `run-log.json` — the structured log from the last run (gitignored)

## Notes

- Model: `openai/gpt-oss-120b` via Groq's OpenAI-compatible API. The lesson uses `claude-sonnet-5` via Anthropic. The agent architecture is identical; only the client layer differs.
- Tool format is OpenAI-style (`type: "function"`, `parameters`), not Anthropic-style (`input_schema`).
- `spentThisRun` is in-memory and resets every run. In production you'd persist it.
