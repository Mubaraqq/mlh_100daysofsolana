// Import Solana SDK functions
import {
  createSolanaRpc,                      // HTTP connection to Solana
  createKeyPairSignerFromBytes,         // Create signer from secret key bytes
  createTransactionMessage,             // Create empty transaction
  pipe,                                 // Function chaining utility
  setTransactionMessageFeePayer,        // Set who pays fee (non-signer version)
  setTransactionMessageLifetimeUsingBlockhash, // Add blockhash for replay protection
  appendTransactionMessageInstruction,  // Add instruction to transaction
  signTransactionMessageWithSigners,    // Sign with private keys
  getSignatureFromTransaction,          // Extract signature from signed tx
  getBase64EncodedWireTransaction,      // Convert to base64 for sending
  lamports,                             // Convert SOL to lamports (BigInt)
} from "@solana/kit";

// Import transfer instruction builder
import { getTransferSolInstruction } from "@solana-program/system";

// File system utilities
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// Connect to devnet
const rpc = createSolanaRpc("https://api.devnet.solana.com");

// Load your funded devnet wallet (the fee payer)
const senderBytes = new Uint8Array(
  JSON.parse(await readFile(join(homedir(), ".config/solana/id.json"), "utf-8"))
);
const sender = await createKeyPairSignerFromBytes(senderBytes);

// Load the broke wallet's address (as recipient, not signer)
const brokeBytes = new Uint8Array(
  JSON.parse(await readFile("broke-wallet.json", "utf-8"))
);
const recipient = (await createKeyPairSignerFromBytes(brokeBytes)).address;

// Build a transfer of 500 SOL — far more than your funded wallet has
const transferIx = getTransferSolInstruction({
  source: sender,
  destination: recipient,
  amount: lamports(500_000_000_000n),  // 500 SOL = 500 * 1e9 lamports
});

// Get current blockhash for replay protection
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

// Build transaction using pipe pattern
const message = pipe(
  createTransactionMessage({ version: 0 }),
  (tx) => setTransactionMessageFeePayer(sender.address, tx),  // Sender pays fee
  (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  (tx) => appendTransactionMessageInstruction(transferIx, tx)
);

// Sign the transaction
const signedTx = await signTransactionMessageWithSigners(message);
const signature = getSignatureFromTransaction(signedTx);

// Send with skipPreflight = true
// This bypasses local balance check, forcing the transaction to reach the network
// and fail on-chain (where validators will reject it due to insufficient funds)
await rpc
  .sendTransaction(getBase64EncodedWireTransaction(signedTx), {
    skipPreflight: true,      // CRITICAL: Skips local balance simulation
    encoding: "base64",
  })
  .send();

console.log("Failed transaction signature:", signature);
console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);