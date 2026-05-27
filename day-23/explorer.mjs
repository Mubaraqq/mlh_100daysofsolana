// Import functions from Solana SDK:
// createSolanaRpc - creates connection to Solana node
// address - validates and converts string to Solana address format
import { createSolanaRpc, address } from "@solana/kit";

// RPC endpoint for devnet (public Solana test network)
const RPC_URL = "https://api.devnet.solana.com";

// Create the actual connection client
const rpc = createSolanaRpc(RPC_URL);

// Get address from command line (process.argv[2] is the third argument)
// Example: node explorer.mjs TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
const inputAddress = process.argv[2];

// If user forgot to provide an address, show usage instructions and exit
if (!inputAddress) {
  console.error("Usage: node explorer.mjs <SOLANA_ADDRESS>");
  process.exit(1);
}

// Convert the input string to a proper Solana address format
// Throws error if address is invalid (wrong length, bad characters)
const targetAddress = address(inputAddress);

// Fetch balance from the network
// Returns lamports (smallest unit, 1 SOL = 1,000,000,000 lamports)
const { value: balanceLamports } = await rpc.getBalance(targetAddress).send();

// Convert lamports to SOL for human readability
const balanceSol = Number(balanceLamports) / 1_000_000_000;

// Fetch detailed account information
// Includes: owner, data (raw bytes), executable flag, rent epoch
const { value: accountInfo } = await rpc
  .getAccountInfo(targetAddress, { encoding: "base64" })
  .send();

// Map of well-known Solana program addresses to human-readable names
const KNOWN_PROGRAMS = {
  "11111111111111111111111111111111": "System Program",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "Token Program",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": "Token-2022 Program",
  "BPFLoaderUpgradeab1e11111111111111111111111": "BPF Upgradeable Loader",
};

// Helper function: return friendly name if known, otherwise return raw address
function getOwnerLabel(ownerAddress) {
  return KNOWN_PROGRAMS[ownerAddress] || ownerAddress;
}

// Print header
console.log("\n=== Solana Account Explorer ===\n");
console.log(`Address:    ${inputAddress}`);
console.log(`Balance:    ${balanceSol} SOL (${balanceLamports.toString()} lamports)`);

// Check if account exists on-chain
if (!accountInfo) {
  console.log(`Status:     Account not found on-chain`);
} else {
  // Get owner and convert to friendly name
  const owner = accountInfo.owner;
  
  // Calculate data size (accountInfo.data[0] is the base64 encoded data)
  const dataLength = accountInfo.data[0]
    ? Buffer.from(accountInfo.data[0], "base64").length
    : 0;

  console.log(`Owner:      ${getOwnerLabel(owner)} (${owner})`);
  console.log(`Executable: ${accountInfo.executable}`);
  console.log(`Data size:  ${dataLength} bytes`);
  console.log(`Rent epoch: ${accountInfo.rentEpoch}`);

  // Show raw data in hex if it's small enough
  if (dataLength > 0 && dataLength <= 128) {
    const raw = Buffer.from(accountInfo.data[0], "base64");
    console.log(`Data (hex): ${raw.toString("hex")}`);
  } else if (dataLength > 128) {
    // Truncate large data to avoid flooding terminal
    const raw = Buffer.from(accountInfo.data[0], "base64");
    console.log(`Data (hex): ${raw.toString("hex").slice(0, 256)}... (truncated)`);
  }
}

// Print Solana Explorer link for visual inspection
console.log(
  `\nView on explorer: https://explorer.solana.com/address/${inputAddress}?cluster=devnet`
);