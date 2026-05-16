// Import functions: create RPC client, specify devnet/mainnet networks, validate addresses
import { createSolanaRpc, devnet, mainnet, address } from "@solana/kit";

// Create two separate RPC connections: one pointing to devnet, one to mainnet
// Same code pattern, different network endpoints
const devnetRpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
const mainnetRpc = createSolanaRpc(
  mainnet("https://api.mainnet-beta.solana.com")
);

// Token-2022 program address - exists on both networks
// Same address, different data on each network
const targetAddress = address(
  "DDFy83Rg1fnf26CiE44vpgFe7LM3NW5xG9t8VTsQXPkp"
);

// Function that queries balance and recent transactions for a given network
// Takes: RPC connection object + network name string
// Returns: nothing (logs to console)
async function getNetworkData(rpc, networkName) {
  // Fetch balance in lamports (same as Day 8)
  const { value: balanceInLamports } = await rpc
    .getBalance(targetAddress)
    .send();
  // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
  const balanceInSol = Number(balanceInLamports) / 1_000_000_000;

  // Fetch 3 most recent transactions (same as Day 9)
  const signatures = await rpc
    .getSignaturesForAddress(targetAddress, { limit: 3 })
    .send();

  // Display network header
  console.log(`\n--- ${networkName} ---`);
  console.log(`Address : ${targetAddress}`);
  console.log(`Balance : ${balanceInSol} SOL`);
  console.log(`Recent transactions: ${signatures.length}`);

  // Loop through each transaction and display truncated signature, slot, and timestamp
  for (const tx of signatures) {
    // Convert Unix timestamp to human-readable date
    const time = tx.blockTime
      ? new Date(Number(tx.blockTime) * 1000).toLocaleString()
      : "unknown";
    // Show first 20 characters of signature (signatures are long base58 strings)
    console.log(`  ${tx.signature.slice(0, 20)}...  slot ${tx.slot}  ${time}`);
  }
}

// Query devnet first
await getNetworkData(devnetRpc, "Devnet");

// Then query mainnet
await getNetworkData(mainnetRpc, "Mainnet");

// Summary explaining the key takeaway
console.log("\n--- Summary ---");
console.log(
  "Same address, same RPC calls, different networks, different data."
);