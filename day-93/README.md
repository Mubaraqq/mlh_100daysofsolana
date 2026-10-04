# Day 93: Hand Your Agent a Wallet and Let It Send SOL on Devnet

## Description

Gave the Day 92 agent its own wallet and the ability to send SOL. Added a code-enforced spending cap the model cannot override.

## The Core Idea

The model decides. The code authorizes.

The model picks the recipient and amount based on plain English. The authority to sign lives in code, behind a hard cap.

A prompt is a suggestion. A cap in code is a law.

## What Was Added

- setup-wallet.mjs: generates the agent's own wallet and requests an airdrop
- agent.mjs: two tools (get_balance, send_sol) with a MAX_SOL_PER_SEND guardrail

## The Guardrail

MAX_SOL_PER_SEND = 0.1

Enforced inside the runTool function. If the model asks to send more, the tool returns an error. The model cannot override it.

The private key never enters the model's context. The model only sees tool names, inputs, and results.

## Three Test Runs

1. Balance check: agent reads its own wallet
2. Legitimate send: 0.058 SOL, confirmed with a real signature
3. Rejected send: 1 SOL, rejected by the code cap, agent reports honestly

## Why This Matters

A model's behavior is not fully predictable. It might misread an amount, get confused, or someday be manipulated by text it encounters. The guardrail means the blast radius is bounded.

This is the same pattern as Web2: an automated service gets a scoped credential, and the scope is enforced by the system, not by asking the automation to behave.

## Files

- setup-wallet.mjs: create and fund the agent's wallet
- agent.mjs: the full agent with wallet and guardrail
- agent-wallet.json: the agent's private key (gitignored)
