// Import functions from Solana SDK
import {
  createSolanaRpc,      // Creates connection to Solana network
  address,              // Validates and converts string to address format
  getBase64Encoder,     // Converts base64 string → raw bytes
  getBase16Decoder,     // Converts raw bytes → hex string (for display)
  getBase58Decoder,  // Add this
} from "@solana/kit";

// Connect to Solana mainnet (real network, not devnet)
// Wrapped SOL mint only exists on mainnet
const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");

// Wrapped SOL mint address (well-known, like a public landmark)
const mintAddress = address("So11111111111111111111111111111111111111112");

// Fetch account data from the network
// encoding: "base64" means return data as a base64 string
const { value: accountInfo } = await rpc
  .getAccountInfo(mintAddress, { encoding: "base64" })
  .send();

// accountInfo.data is a tuple: [base64String, "base64"]
// Get the base64 string and convert it back to raw bytes (Uint8Array)
const dataBytes = getBase64Encoder().encode(accountInfo.data[0]);

// Display the results
console.log("Owner program:", accountInfo.owner);        // Which program controls this account
console.log("Data length:", dataBytes.length, "bytes");  // Should be 82 bytes
console.log("Raw data (hex):", getBase16Decoder().decode(dataBytes));  // Hex dump of the 82 bytes

import { getMintDecoder } from "@solana-program/token";

// The Mint decoder knows exactly how the Token Program structures mint accounts.
// This is the ergonomic path: one decoder call turns raw bytes into a structured object.
const mintDecoder = getMintDecoder();
const mint = mintDecoder.decode(dataBytes);

console.log("\n--- Decoded Mint Account ---");

console.log(
  "Mint Authority:",
  mint.mintAuthority.__option === "Some" ? mint.mintAuthority.value : "None"
);

console.log("Supply:", mint.supply.toString());
console.log("Decimals:", mint.decimals);
console.log("Is Initialized:", mint.isInitialized);

console.log(
  "Freeze Authority:",
  mint.freezeAuthority.__option === "Some" ? mint.freezeAuthority.value : "None"
);

console.log("\n--- Manual Byte-Level Decode ---");

// DataView lets you read multi-byte values from a Uint8Array.
// The Token Mint account stores u32 and u64 values, so reading one byte at a time is not enough.
const view = new DataView(
  dataBytes.buffer,
  dataBytes.byteOffset,
  dataBytes.byteLength
);

const base58Decoder = getBase58Decoder();

// SPL Token Mint account layout:
// Bytes 0-3:   mintAuthorityOption (u32, 0=None, 1=Some)
// Bytes 4-35:  mintAuthority (32 bytes) - only present if Some
// Bytes 36-43: supply (u64, little-endian)
// Byte 44:     decimals (u8)
// Byte 45:     isInitialized (boolean as u8)
// Bytes 46-49: freezeAuthorityOption (u32)
// Bytes 50-81: freezeAuthority (32 bytes) - only present if Some

const hasMintAuthority = view.getUint32(0, true) === 1;
console.log("Has Mint Authority:", hasMintAuthority);

if (hasMintAuthority) {
  const authorityBytes = dataBytes.slice(4, 36);
  console.log("Mint Authority:", base58Decoder.decode(authorityBytes));
}

const supply = view.getBigUint64(36, true);
console.log("Supply (raw):", supply.toString());

const decimals = view.getUint8(44);
console.log("Decimals:", decimals);

console.log(
  "Human-readable supply:",
  Number(supply) / Math.pow(10, decimals)
);

const isInitialized = view.getUint8(45) === 1;
console.log("Is Initialized:", isInitialized);

const hasFreezeAuthority = view.getUint32(46, true) === 1;
console.log("Has Freeze Authority:", hasFreezeAuthority);

if (hasFreezeAuthority) {
  const freezeBytes = dataBytes.slice(50, 82);
  console.log("Freeze Authority:", base58Decoder.decode(freezeBytes));
}


// --- RPC jsonParsed Result ---
// This uses Solana's built-in JSON parser instead of manual decoding
// The RPC does the decoding server-side for known programs (like Token Program)

console.log("\n--- RPC jsonParsed Result ---");

// Fetch the same account but with "jsonParsed" encoding
// Instead of returning raw base64 bytes, the RPC decodes the data for you
const parsed = await rpc
  .getAccountInfo(mintAddress, { encoding: "jsonParsed" })
  .send();

if (!parsed.value) {
  throw new Error("Account not found from jsonParsed request");
}

// parsed.value.data.parsed contains the decoded account data
// For a mint account, it has: program, type, and info fields
const parsedData = parsed.value.data.parsed;
const mintInfo = parsedData.info;

console.log("Program:", parsedData.program);        // "spl-token" (the token program)
console.log("Account Type:", parsedData.type);      // "mint" (what kind of account)
console.log("Mint Authority:", mintInfo.mintAuthority ?? "None");  // Who can mint new tokens
console.log("Supply:", mintInfo.supply);            // Total supply in lamport units
console.log("Decimals:", mintInfo.decimals);        // Number of decimals
console.log("Is Initialized:", mintInfo.isInitialized);  // Account ready to use
console.log("Freeze Authority:", mintInfo.freezeAuthority ?? "None");  // Who can freeze accounts