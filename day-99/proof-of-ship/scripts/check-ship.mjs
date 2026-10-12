// ==========================================================
// Ship Record Reader — a read-only agent tool
// ==========================================================
// Given a wallet address, this tool derives that wallet's
// ShipRecord PDA on devnet and reports what it finds.
//
// It signs nothing. It sends nothing. It only reads.
// ==========================================================

import { web3 } from "@anchor-lang/core";

const { Connection, PublicKey } = web3;

// ----------------------------------------------------------
// CONFIG
// ----------------------------------------------------------
const PROGRAM_ID = "6xKXthNFn8YdaPVqdrAJWDfaAxeNeBX5MZuUSaVxd7mL";

// ----------------------------------------------------------
// Connect to devnet
// ----------------------------------------------------------
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// ----------------------------------------------------------
// Main
// ----------------------------------------------------------
async function main() {
  const walletArg = process.argv[2];
  if (!walletArg) {
    console.error("Usage: node scripts/check-ship.mjs <WALLET_ADDRESS>");
    process.exit(1);
  }

  let walletKey;
  try {
    walletKey = new PublicKey(walletArg);
  } catch {
    console.error(`"${walletArg}" is not a valid Solana address.`);
    process.exit(1);
  }

  const programKey = new PublicKey(PROGRAM_ID);

  console.log(`Checking ship record for ${walletKey.toBase58()}...`);
  console.log(`Program: ${PROGRAM_ID}`);

  // Derive the PDA. Same seeds the program uses.
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("ship"), walletKey.toBuffer()],
    programKey,
  );

  console.log(`Derived PDA: ${pda.toBase58()}`);

  // Fetch the account.
  const accountInfo = await connection.getAccountInfo(pda);

  if (!accountInfo) {
    console.log(`\nNo ship record found for ${walletKey.toBase58()}.`);
    console.log("This wallet has not shipped a capstone.");
    return;
  }

  // Decode the account data.
  const raw = accountInfo.data;
  console.log(`\nAccount found. Data length: ${raw.length} bytes`);

  let offset = 8; // skip Anchor discriminator

  // builder: 32 bytes
  const builder = new PublicKey(raw.subarray(offset, offset + 32));
  offset += 32;

  // project_name: 4-byte length prefix + content
  const nameLen = raw.readUInt32LE(offset);
  offset += 4;
  const projectName = raw.subarray(offset, offset + nameLen).toString("utf8");
  offset += nameLen;

  // message: 4-byte length prefix + content
  const msgLen = raw.readUInt32LE(offset);
  offset += 4;
  const message = raw.subarray(offset, offset + msgLen).toString("utf8");
  offset += msgLen;

  // shipped_at: 8 bytes i64
  const shippedAt = raw.readBigInt64LE(offset);
  offset += 8;

  // bump: 1 byte
  const bump = raw.readUInt8(offset);

  console.log("\n=== SHIP RECORD ===");
  console.log(`Wallet:       ${builder.toBase58()}`);
  console.log(`PDA:          ${pda.toBase58()}`);
  console.log(`Project name: ${projectName}`);
  console.log(`Message:      ${message}`);
  console.log(`Shipped at:   ${new Date(Number(shippedAt) * 1000).toISOString()}`);
  console.log(`Bump:         ${bump}`);
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});