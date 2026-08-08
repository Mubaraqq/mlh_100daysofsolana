// Import Anchor core library for working with Solana programs
import * as anchor from "@anchor-lang/core";
// Import Solana types: Keypair (for generating wallets), PublicKey, and LAMPORTS_PER_SOL constant
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
// Import the generated TypeScript types for your counter program
import { Counter } from "../target/types/counter";

// Main function — async because we need to await transactions
// The script uses async function main() because CommonJS (default Anchor tsconfig)
// does not support top-level await (you can't use `await` outside a function)
async function main() {
  // Set up the Anchor provider from environment variables
  // Reads ANCHOR_PROVIDER_URL and ANCHOR_WALLET from the command line
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Get the program instance from the workspace
  const program = anchor.workspace.Counter as anchor.Program<Counter>;
  
  // Wallet A: the default wallet from the provider (your funded wallet)
  const walletA = provider.wallet.publicKey;
  
  // Wallet B: a brand new random keypair (generated for this script)
  const walletB = Keypair.generate();

  // Print the program ID and both wallet addresses
  console.log("Program ID:", program.programId.toBase58());
  console.log("Wallet A:  ", walletA.toBase58());
  console.log("Wallet B:  ", walletB.publicKey.toBase58());

  // ==========================================================
  // Fund Wallet B and initialize its counter
  // ==========================================================
  // Wallet B needs SOL to pay for rent when creating its counter
  // Without this, the script would fail with "insufficient funds"
  
  // Request 2 SOL airdrop to Wallet B
  const sig = await provider.connection.requestAirdrop(
    walletB.publicKey,
    2 * LAMPORTS_PER_SOL  // 2 SOL in lamports
  );
  // Get the latest blockhash to confirm the transaction
  const latest = await provider.connection.getLatestBlockhash();
  // Wait for the airdrop transaction to be confirmed
  await provider.connection.confirmTransaction(
    { signature: sig, ...latest },
    "confirmed"
  );
  
  // Initialize a counter for Wallet B
  // This creates Wallet B's counter PDA on-chain so we can reference it later
  await program.methods
    .initCounter()
    .accounts({ user: walletB.publicKey })
    .signers([walletB])  // Wallet B signs because it's paying rent
    .rpc();

  // The rest of the code will go here (PDA derivations and spoof attempt)

  // ==========================================================
  // Per-user counter PDAs
  // ==========================================================
  // Derive the counter PDA for each wallet using the program's seed scheme:
  // seeds = ["counter", user_pubkey]
  // These should be different addresses because the seeds are different.
  // ==========================================================

  const [pdaA] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), walletA.toBuffer()],
    program.programId
  );
  const [pdaB] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), walletB.publicKey.toBuffer()],
    program.programId
  );

  console.log("\nPer-user counter PDAs");
  console.log("  Wallet A PDA:", pdaA.toBase58());
  console.log("  Wallet B PDA:", pdaB.toBase58());
  console.log("  Same address?", pdaA.equals(pdaB));

  // ==========================================================
  // Global counter PDA (no wallet in seeds)
  // ==========================================================
  // Derive a PDA using only the static seed "counter"
  // No user pubkey is mixed in, so this address is the SAME for everyone.
  // If your program used this seed scheme, only the first user would
  // be able to create a counter — everyone else would hit "already in use".
  // ==========================================================

  const [pdaGlobalFromA] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    program.programId
  );
  const [pdaGlobalFromB] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    program.programId
  );

  console.log("\nGlobal counter PDA (no wallet in seeds)");
  console.log("  Derived from A's perspective:", pdaGlobalFromA.toBase58());
  console.log("  Derived from B's perspective:", pdaGlobalFromB.toBase58());
  console.log("  Same address?", pdaGlobalFromA.equals(pdaGlobalFromB));

  // ==========================================================
  // Near-miss seed variants
  // ==========================================================
  // PDAs are deterministic hashes. A single byte difference in the seeds
  // gives a completely different address. There is no "close enough."
  // ==========================================================

  const variants: [string, Buffer[]][] = [
    ['["counter", walletA]',     [Buffer.from("counter"),   walletA.toBuffer()]],
    ['["counters", walletA]',    [Buffer.from("counters"),  walletA.toBuffer()]],
    ['["counter\\0", walletA]',  [Buffer.from("counter\0"), walletA.toBuffer()]],
    ['["Counter", walletA]',     [Buffer.from("Counter"),   walletA.toBuffer()]],
  ];

  console.log("\nNear-miss seed variants");
  for (const [label, seeds] of variants) {
    const [pda] = PublicKey.findProgramAddressSync(seeds, program.programId);
    console.log(`  ${label.padEnd(28)} -> ${pda.toBase58()}`);
  }

  // ==========================================================
  // Spoof attempt
  // ==========================================================
  // Try to spoof a PDA: Wallet A tries to increment Wallet B's counter.
  // The program's seed constraint re-derives the address from Wallet A's signer
  // and checks it against the counter account you passed.
  // Since Wallet A's pubkey doesn't match, the transaction fails with
  // "ConstraintSeeds" error.
  // ==========================================================

  console.log("\nAttempting to spoof a PDA...");
  try {
    await program.methods
      .increment()
      .accounts({
        counter: pdaB,      // Wallet B's PDA
        user: walletA,      // But Wallet A is signing!
      })
      .rpc();
    console.log("  Spoof succeeded (this should NOT happen)");
  } catch (err) {
    console.log("  Spoof rejected:", (err as Error).message.split("\n")[0]);
  }
}

// Run the main function and catch any errors
main().catch((err) => {
  console.error(err);
  process.exit(1);
});