# Day 87: Give Other Developers a Typed Client for Your Program

## Description

Published the vault program's IDL on-chain and generated a typed TypeScript client with Codama.

## What an IDL Is

The IDL (Interface Definition Language) is a JSON file Anchor generates on every build. It describes the program's instructions, accounts, types, and errors. Like an OpenAPI spec for a Solana program.

## What I Did

1. Rebuilt the program to get a fresh IDL
2. Published the IDL on-chain with anchor idl init
3. Fetched it back with anchor idl fetch to verify
4. Installed Codama and @codama/renderers-js
5. Created codama.json
6. Ran npx codama run js to generate the TypeScript client

## Commands Used

anchor build
anchor idl init -f target/idl/vault.json <PROGRAM_ID> --provider.cluster "<RPC>"
anchor idl fetch <PROGRAM_ID> --provider.cluster "<RPC>" -o fetched-idl.json
npm install --save-dev codama @codama/renderers-js @codama/nodes-from-anchor
npx codama run js

## What the Client Gives You

- DEPOSIT_DISCRIMINATOR: the 8-byte prefix for the instruction
- getDepositInstructionDataEncoder: encodes args into bytes
- getDepositInstruction: builds a ready-to-send instruction
- getDepositInstructionAsync: derives PDAs for you
- parseDepositInstruction: turns an instruction back into a structured object

## Why This Matters

Without a generated client, calling the program means hand-packing byte buffers, ordering accounts correctly, and hoping the layout matches. With a generated client, the program's IDL is the source of truth. A wrong field name fails at compile time instead of in production.

## Key Learnings

- Anchor emits an IDL on every build
- The IDL can be published on-chain at a deterministic address
- Anyone with the program ID can fetch the IDL
- Codama reads the IDL and generates a typed client
- The client mirrors the program: instruction names, account names, error codes all match
- The generated client is the bridge to a frontend or an AI agent
