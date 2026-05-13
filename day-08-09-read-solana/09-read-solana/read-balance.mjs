// Import functions from @solana/kit to connect to network and work with addresses
import { createSolanaRpc, devnet, address } from "@solana/kit";

// Create a connection to Solana devnet (test network)
// This is like setting up an API client for a REST endpoint
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

// Replace this with your own wallet address from Day 1 or Day 2
// address() validates and converts the string into Solana's internal address format
const targetAddress = address(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"  // Paste your actual address here as a string
);

// Query the blockchain for the balance of this address
// .send() executes the request, returns a Promise
// The response contains { value: balance_in_lamports }
const { value: balanceInLamports } = await rpc
  .getBalance(targetAddress)
  .send();

// Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
// This math was covered on Day 3
const balanceInSol = Number(balanceInLamports) / 1_000_000_000;

// Print results to terminal
console.log(`Address: ${targetAddress}`);
console.log(`Balance: ${balanceInSol} SOL`);