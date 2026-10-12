// ==========================================================
// Mint Badge — create a 1-of-1 Token-2022 badge on devnet
// ==========================================================
// This script creates a Token-2022 mint with metadata
// embedded directly in the mint account (MetadataPointer
// extension). The badge commemorates the capstone program.
// ==========================================================

// Node built-ins for reading the wallet file and building its path.
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// @solana/web3.js — connection, keypairs, transactions.
// We import from web3.js directly here (not via @anchor-lang/core)
// because the spl-token libraries expect these types.
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// @solana/spl-token — the Token-2022 program helpers.
// These build the low-level instructions that create and
// configure a Token-2022 mint with extensions.
import {
  TOKEN_2022_PROGRAM_ID,          // the program ID for Token-2022 (vs legacy Token)
  ExtensionType,                  // enum of available extensions (MetadataPointer, etc.)
  createInitializeMintInstruction,// builds the "initialize mint" instruction
  createInitializeMetadataPointerInstruction, // attaches the MetadataPointer extension
  getMintLen,                     // computes byte size of a mint with given extensions
  TYPE_SIZE,                      // byte size of the metadata type field
  LENGTH_SIZE,                    // byte size of the metadata length field
} from "@solana/spl-token";

// @solana/spl-token-metadata — helpers for the metadata extension itself.
import {
  createInitializeInstruction, // builds the "initialize metadata" instruction
  pack,                         // serializes the metadata struct into bytes
} from "@solana/spl-token-metadata";

// ----------------------------------------------------------
// CONFIG
// ----------------------------------------------------------
// Which cluster to talk to. Devnet for the capstone.
const RPC_URL = "https://api.devnet.solana.com";

// The capstone program's on-chain address.
// We'll embed this in the badge metadata so the badge points
// at the thing it commemorates.
const PROGRAM_ID = "6xKXthNFn8YdaPVqdrAJWDfaAxeNeBX5MZuUSaVxd7mL";

// ----------------------------------------------------------
// LOAD WALLET
// ----------------------------------------------------------
// Your CLI wallet. It pays for the mint account and becomes
// the mint authority + update authority.
const walletPath = path.join(os.homedir(), ".config/solana/id.json");
// Read the keypair file (a JSON array of 64 bytes) and rebuild the Keypair.
const secretKey = Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf8")));
const payer = Keypair.fromSecretKey(secretKey);

// ----------------------------------------------------------
// MAIN
// ----------------------------------------------------------
async function main() {
  // Connect to devnet with "confirmed" commitment.
  const connection = new Connection(RPC_URL, "confirmed");
  console.log(`Payer: ${payer.publicKey.toBase58()}`);

  // --------------------------------------------------------
  // 1. Generate a new mint keypair.
  // --------------------------------------------------------
  // Every Token-2022 mint has its own address. We generate a
  // fresh keypair to be that address. It's used once during
  // creation and then never needed again.
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  console.log(`Mint Address: ${mint.toBase58()}`);

  // --------------------------------------------------------
  // 2. Define the badge metadata.
  // --------------------------------------------------------
  // This is what will be embedded in the mint account.
  const metadata = {
    // Who can update this metadata later. Set to us.
    updateAuthority: payer.publicKey,
    // Which mint this metadata describes. Must match.
    mint: mint,
    // The badge's display name.
    name: "Proof of Ship",
    // A short ticker-style symbol. Token-2022 enforces a max length.
    symbol: "SHIP",
    // A URI pointing at more info — here, the program on Explorer.
    uri: `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`,
    // Extra key/value pairs. Anything you want attached.
    // Here: the program ID and the capstone message.
    additionalMetadata: [
      ["program", PROGRAM_ID],
      ["message", "Built in public, 100 days straight."],
    ],
  };

  // --------------------------------------------------------
  // 3. Calculate space and rent.
  // --------------------------------------------------------
  // decimals = 0 means the token is non-fractional (you either
  // have 1 or 0). Right for a 1-of-1 badge.
  const decimals = 0;

  // How many bytes the mint account needs, including the
  // MetadataPointer extension.
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);

  // Additional bytes for the metadata extension's own header
  // (type + length) plus the packed metadata itself.
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

  // How many lamports to lock up as rent for the account.
  // The bigger the account, the more rent. Refundable if you
  // close the account later.
  const lamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen,
  );

  // --------------------------------------------------------
  // 4. Build the transaction.
  // --------------------------------------------------------
  // Four instructions, in this exact order. Order matters:
  // you can't initialize metadata before the pointer exists,
  // and you can't initialize the pointer before the account exists.
  const transaction = new Transaction().add(
    // 4a. Create the account at the new mint address.
    // It's owned by the Token-2022 program, not the System Program.
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey, // who pays
      newAccountPubkey: mint,       // the address being created
      space: mintLen,               // bytes to allocate (extensions only, for now)
      lamports,                     // rent deposit
      programId: TOKEN_2022_PROGRAM_ID, // owner program
    }),

    // 4b. Attach the MetadataPointer extension.
    // This tells the mint "your metadata lives at this address."
    // We point it at the mint itself, so metadata is embedded
    // rather than stored in a separate account.
    createInitializeMetadataPointerInstruction(
      mint,                 // which mint
      payer.publicKey,      // who can update the pointer
      mint,                 // where the metadata lives (the mint itself)
      TOKEN_2022_PROGRAM_ID,
    ),

    // 4c. Initialize the mint.
    // Sets decimals, mint authority, and freeze authority.
    // freezeAuthority = null means nobody can freeze these tokens.
    createInitializeMintInstruction(
      mint,                       // which mint
      decimals,                   // 0
      payer.publicKey,            // mint authority
      null,                       // freeze authority
      TOKEN_2022_PROGRAM_ID,
    ),

    // 4d. Initialize the metadata.
    // Writes the name, symbol, URI, and additional key/values
    // into the extension we pointed at in step 4b.
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint,                   // the mint being described
      metadata: mint,               // where metadata is stored (the mint itself)
      name: metadata.name,          // "Proof of Ship"
      symbol: metadata.symbol,      // "SHIP"
      uri: metadata.uri,            // explorer link
      mintAuthority: payer.publicKey,
      updateAuthority: payer.publicKey,
    }),
  );

  // --------------------------------------------------------
  // 5. Send the transaction.
  // --------------------------------------------------------
  // Two signers: the payer (pays for rent and fees) and the
  // new mint keypair (proves ownership of the new address).
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    payer,
    mintKeypair,
  ]);

  // --------------------------------------------------------
  // 6. Report.
  // --------------------------------------------------------
  console.log(`\n✅ Mint created!`);
  console.log(`Signature: ${signature}`);
  console.log(
    `Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  );
  console.log(
    `Mint:     https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`,
  );
}

// Run it. If anything throws, print and exit non-zero.
main().catch((err) => {
  console.error(err);
  process.exit(1);
});