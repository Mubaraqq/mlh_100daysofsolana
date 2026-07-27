// Import the PublicKey type from Solana's web3 library
// This is needed to work with Solana addresses
import { PublicKey } from "@solana/web3.js";

// Your program's on-chain address
// This MUST match the program ID in Anchor.toml and lib.rs
const programId = new PublicKey("75Us8XjhjHDoY6uemCSHt4Qv6S8mo2M2PpPFTi5uDrSN");

// Derive a Program Derived Address (PDA) from seeds and program ID
// Seeds: arbitrary byte strings that make the address deterministic
// Program ID: your program's address (acts as a namespace)
// The function tries bump values 255..0 until it finds an off-curve address
// Returns: [pda_address, bump_seed]
const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("counter")], // The seed: a byte string "counter"
  programId                 // Your program's ID
);

// Print the results to the console
console.log("Seeds:        ", ["counter"]);// The seed(s) used
console.log("Program ID:   ", programId.toBase58()); // Program address
console.log("PDA:          ", pda.toBase58());       // Derived PDA
console.log("Canonical bump:", bump);                // The bump that worked