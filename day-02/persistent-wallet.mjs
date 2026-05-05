// Import all required functions from @solana/kit
import {
  createSolanaRpc,              // Creates connection to Solana network
  devnet,                       // Specifies devnet (test network)
  generateKeyPair,              // Generates a new keypair (extractable for saving)
  createKeyPairSignerFromBytes, // Recreates a signer from saved secret key bytes
  createSignerFromKeyPair,      // Creates a signer from a keypair
} from "@solana/kit";
import { readFile, writeFile } from "node:fs/promises"; // File system operations

// File where wallet will be saved
const WALLET_FILE = "wallet.json";

// Connection to Solana devnet
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

// Function that either loads existing wallet or creates a new one
async function loadOrCreateWallet() {
  try {
    // Try to read existing wallet file
    const data = JSON.parse(await readFile(WALLET_FILE, "utf-8"));
    // Convert array back to Uint8Array (binary format)
    const secretBytes = new Uint8Array(data.secretKey);
    // Create a signer from the saved secret key bytes
    const wallet = await createKeyPairSignerFromBytes(secretBytes);
    console.log("Loaded existing wallet:", wallet.address);
    return wallet;
  } catch {
    // No wallet file found - create a new one
    // Pass `true` to make keys extractable so we can save them to disk
    const keyPair = await generateKeyPair(true);

    // Export public key as raw bytes (32 bytes)
    const publicKeyBytes = new Uint8Array(
      await crypto.subtle.exportKey("raw", keyPair.publicKey)
    );

    // Export private key using pkcs8 format (Node.js doesn't support "raw" for Ed25519)
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    // Take only the last 32 bytes (the actual private key, PKCS8 adds a 16-byte header)
    const privateKeyBytes = new Uint8Array(pkcs8).slice(-32);

    // Solana keypair format: 64 bytes (32 private + 32 public)
    const keypairBytes = new Uint8Array(64);
    keypairBytes.set(privateKeyBytes, 0);  // First 32 bytes: private key
    keypairBytes.set(publicKeyBytes, 32);  // Last 32 bytes: public key

    // Save to file as JSON array
    await writeFile(
      WALLET_FILE,
      JSON.stringify({ secretKey: Array.from(keypairBytes) })
    );

    // Create a signer from the keypair
    const wallet = await createSignerFromKeyPair(keyPair);
    console.log("Created new wallet:", wallet.address);
    console.log(`Saved to ${WALLET_FILE}`);
    return wallet;
  }
}

// Run the function to get wallet (either loaded or newly created)
const wallet = await loadOrCreateWallet();

// Check balance
const { value: balance } = await rpc.getBalance(wallet.address).send();
// Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
const balanceInSol = Number(balance) / 1_000_000_000;

// Display wallet info
console.log(`\nAddress: ${wallet.address}`);
console.log(`Balance: ${balanceInSol} SOL`);

// Warn if no SOL - prompt user to visit faucet
if (balanceInSol === 0) {
  console.log(
    `\nThis wallet has no SOL. Visit https://faucet.solana.com/ and airdrop some to:`
  );
  console.log(wallet.address);
}