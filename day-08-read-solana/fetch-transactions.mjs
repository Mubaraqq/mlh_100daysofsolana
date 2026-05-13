// Import required functions from @solana/kit
import { createSolanaRpc, devnet, address } from "@solana/kit";

// Create connection to Solana devnet (same as Day 8)
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

// Token-2022 program address - has constant transaction activity
// You can replace this with any Solana address
const targetAddress = address(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

// Fetch the 5 most recent transaction signatures for this address
// getSignaturesForAddress returns recent transactions involving this address
// { limit: 5 } restricts to 5 results, ordered newest to oldest
const signatures = await rpc
  .getSignaturesForAddress(targetAddress, { limit: 5 })
  .send();

console.log(`\nLast 5 transactions for ${targetAddress}:\n`);

// Loop through each transaction and display its details
for (const tx of signatures) {
  // blockTime is Unix timestamp (seconds since 1970-01-01)
  // Multiply by 1000 to convert to milliseconds for JavaScript Date
  const time = tx.blockTime
    ? new Date(Number(tx.blockTime) * 1000).toLocaleString()
    : "unknown";

  console.log(`Signature : ${tx.signature}`);  // Unique transaction ID (base58 string)
  console.log(`Slot      : ${tx.slot}`);       // Sequence number - higher = more recent
  console.log(`Time      : ${time}`);           // Human-readable timestamp
  console.log(`Status    : ${tx.err ? "Failed" : "Success"}`);  // Did it succeed?
  console.log("---");
}