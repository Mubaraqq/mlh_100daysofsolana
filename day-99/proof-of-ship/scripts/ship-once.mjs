// ==========================================================
// Ship Once — call the `ship` instruction on devnet
// ==========================================================
// Takes a project name and a message, sends one transaction
// to devnet, and creates the ShipRecord PDA for your wallet.
//
// After this runs, the reader (check-ship.mjs) can find the
// record and report it back.
// ==========================================================

import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as anchor from "@anchor-lang/core";

// ----------------------------------------------------------
// CONFIG
// ----------------------------------------------------------
const PROGRAM_ID = "6xKXthNFn8YdaPVqdrAJWDfaAxeNeBX5MZuUSaVxd7mL";

// ----------------------------------------------------------
// Parse arguments
// ----------------------------------------------------------
const projectName = process.argv[2];
const message = process.argv[3];

if (!projectName || !message) {
  console.error('Usage: node ship-once.mjs "<project name>" "<message>"');
  process.exit(1);
}

// ----------------------------------------------------------
// Load the wallet
// ----------------------------------------------------------
// Same wallet the rest of your tooling uses.
const walletPath = path.join(os.homedir(), ".config/solana/id.json");
const secretKey = Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf8")));
const walletKeypair = anchor.web3.Keypair.fromSecretKey(secretKey);

console.log(`Wallet: ${walletKeypair.publicKey.toBase58()}`);

// ----------------------------------------------------------
// Connect to devnet and build a provider
// ----------------------------------------------------------
const connection = new anchor.web3.Connection(
  "https://api.devnet.solana.com",
  "confirmed",
);

const wallet = new anchor.Wallet(walletKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

// ----------------------------------------------------------
// Load the IDL and build the program client
// ----------------------------------------------------------
const idl = JSON.parse(
  readFileSync(
    new URL("../target/idl/proof_of_ship.json", import.meta.url),
    "utf8",
  ),
);

const program = new anchor.Program(idl, provider);

// ----------------------------------------------------------
// Derive the PDA
// ----------------------------------------------------------
// Same seeds the program uses: [b"ship", wallet pubkey]
const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("ship"), walletKeypair.publicKey.toBuffer()],
  new anchor.web3.PublicKey(PROGRAM_ID),
);

console.log(`PDA:    ${pda.toBase58()}`);

// ----------------------------------------------------------
// Check if the record already exists
// ----------------------------------------------------------
// If it does, this wallet already shipped. Don't try again —
// the init constraint would reject it anyway, and we want a
// clear error message instead of a cryptic one.
const existing = await connection.getAccountInfo(pda);
if (existing) {
  console.error(
    `\nThis wallet already has a ship record at ${pda.toBase58()}.`,
  );
  console.error("Each wallet can only ship once. Nothing was sent.");
  process.exit(1);
}

// ----------------------------------------------------------
// Call ship
// ----------------------------------------------------------
console.log(`\nCalling ship("${projectName}", "${message}")...`);

const signature = await program.methods
  .ship(projectName, message)
  .accounts({
    builder: walletKeypair.publicKey,
  })
  .rpc();

console.log(`\nConfirmed.`);
console.log(`Signature: ${signature}`);
console.log(
  `Explorer:  https://explorer.solana.com/tx/${signature}?cluster=devnet`,
);
console.log(
  `Account:   https://explorer.solana.com/address/${pda.toBase58()}?cluster=devnet`,
);