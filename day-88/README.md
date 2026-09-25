# Day 88: Let Users Connect a Wallet and Send a Transaction

## Description

Built a React frontend with create-solana-dapp that connects a browser wallet via the Wallet Standard, reads the balance, and sends a transaction.

## What the Wallet Standard Is

A shared interface every modern Solana wallet implements. The app asks "who is here?" and every installed wallet answers. No Phantom-specific code. No Solflare-specific code. One API for all.

## What I Did

1. Scaffolded a frontend with npx create-solana-dapp
2. Started the dev server with npm run dev
3. Switched Phantom to devnet
4. Connected Phantom to the app
5. Added a balance readout with useBalance
6. Wired a send flow with useSolTransfer

## The Hooks Used

- useWalletConnection: discovers wallets, connects, disconnects, returns wallet and status
- useBalance: reads the connected wallet's balance
- useSolTransfer: sends SOL to a recipient

All from @solana/react-hooks.

## Result

Wallet connected. Balance showing (1.89992 SOL). Send flow works. Phantom approves the transaction.

## Key Learnings

- The Wallet Standard handles wallet discovery. One API for every wallet.
- @solana/react-hooks gives you connection, balance, and sending hooks.
- The identity in the browser is the same keypair you've been using since Arc 1.
- Swapping Phantom for Solflare requires zero code changes.
- The frontend is where a human meets the on-chain identity, RPC reads, and program calls.
