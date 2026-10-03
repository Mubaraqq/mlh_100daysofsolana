# Day 92: Ask an AI Agent to Read Devnet for You

## Description

Built an AI agent that reads Solana devnet state through two tools. You ask a question in plain English, the agent decides which RPC calls to make, fetches live state, and answers.

## What an Agent Is

An AI agent is a language model running in a loop with access to tools. You describe tools in plain language. The model decides when to call them. Your code executes the calls. The results go back to the model so it can reason about them.

The model never touches the network. It can only ask your code to run the tools you defined. That makes a read-only agent safe.

## The Two Tools

- get_balance: Returns the SOL balance of an address (in lamports and SOL)
- get_account_info: Returns owner, lamports, executable flag, and data length

Each is a thin wrapper around an RPC call.

## The Agent Loop

1. Send the question + tool descriptions to the model
2. Model returns either a final answer OR a tool call (stop_reason: "tool_use")
3. If it's a tool call, run the tool, append the result
4. Send the updated conversation back
5. Repeat until the model returns a final answer

## What I Used

- Ollama running llama3.2:3b locally (no API key, no cost)
- @anthropic-ai/sdk pointed at http://localhost:11434
- @solana/kit for RPC calls

## What I Learned

- An LLM is the model. Claude, GPT, Qwen are products/families that contain models.
- Open-weight models can run locally. Closed-weight models cannot.
- The @anthropic-ai/sdk is just a client. It can point at any server that speaks its protocol. Ollama does.
- Small models (3B) hallucinate math. Larger models are more reliable.
- The agent loop is just: call model, check stop_reason, run tool if needed, feed result back.

## Files

- agent.js: the full agent
