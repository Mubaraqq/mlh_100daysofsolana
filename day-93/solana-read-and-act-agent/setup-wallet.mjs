// Import the signer helpers and network functions from @solana/kit
import {
  generateKeyPairSigner,
  writeKeyPairSigner,
  createSolanaRpc,
  devnet,
  lamports,
} from "@solana/kit";

// Connect to Solana devnet
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

// Generate a brand new keypair for the agent.
// 'true' makes the keys extractable so we can save them to disk.
const wallet = await generateKeyPairSigner(true);

// Print the wallet address
console.log("Agent wallet address:", wallet.address);

// Save the keypair to agent-wallet.json.
// The format matches the Solana CLI (64 bytes: 32 private + 32 public).
await writeKeyPairSigner(wallet, "agent-wallet.json");
console.log("Saved to agent-wallet.json");

// Request an airdrop of 2 SOL from devnet
try {
  const signature = await rpc
    .requestAirdrop(wallet.address, lamports(2_000_000_000n))
    .send();
  console.log("Airdrop signature:", signature);

  // Wait a moment for the airdrop to land
  await new Promise((r) => setTimeout(r, 3000));

  // Check the balance
  const { value: balance } = await rpc.getBalance(wallet.address).send();
  const balanceInSol = Number(balance) / 1_000_000_000;
  console.log("Funded with", balanceInSol, "SOL on devnet");
} catch (error) {
  // Devnet airdrops are often rate-limited. Don't crash. Send the user to the faucet.
  console.error("Airdrop failed:", error.message);
  console.log(
    "Fund the wallet manually at https://faucet.solana.com/ — paste this address:"
  );
  console.log(wallet.address);
}