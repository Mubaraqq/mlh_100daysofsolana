// Import Anchor's core library for testing
import * as anchor from "@anchor-lang/core";
// Import Program and web3 utilities from Anchor
import { Program, web3 } from "@anchor-lang/core";
// Import the generated types for your sol-mover program
import { SolMover } from "../target/types/sol_mover";

// Destructure Keypair and LAMPORTS_PER_SOL from web3
// Keypair: for generating new wallets
// LAMPORTS_PER_SOL: conversion constant (1 SOL = 1,000,000,000 lamports)
const { Keypair, LAMPORTS_PER_SOL } = web3;

// Test suite: groups all tests for the sol-mover program
describe("sol-mover", () => {
  // Set up the test environment
  // AnchorProvider.env() uses the local validator running during tests
  const provider = anchor.AnchorProvider.env();
  // Set the global provider so Anchor knows which network to use
  anchor.setProvider(provider);

  // Get the program instance from the workspace
  // SolMover is the PascalCase version of your program's name
  const program = anchor.workspace.SolMover as Program<SolMover>;
  // The sender is the default wallet from the provider
  const sender = provider.wallet;

  // Individual test: moves SOL with a CPI to the System Program
  it("moves SOL with a CPI to the System Program", async () => {
    // Generate a new random keypair for the recipient
    // This is a fresh wallet that starts with 0 SOL
    const recipient = Keypair.generate();
    
    // Set the amount to transfer: 0.25 SOL
    // LAMPORTS_PER_SOL converts SOL to lamports (1 SOL = 1,000,000,000 lamports)
    // anchor.BN is a big number type for handling large integers on-chain
    const amount = new anchor.BN(0.25 * LAMPORTS_PER_SOL);

    // Record the recipient's balance before the transfer
    // Should be 0 lamports since it's a new wallet
    const before = await provider.connection.getBalance(recipient.publicKey);

    // Call the sol_transfer instruction on your program
    // This instruction uses a CPI to call the System Program's transfer
    // The sender's signature is automatically forwarded to the System Program
    const signature = await program.methods
      .solTransfer(amount)        // The instruction name (sol_transfer in Rust → solTransfer in TS)
      .accounts({
        sender: sender.publicKey,   // The wallet sending SOL
        recipient: recipient.publicKey, // The wallet receiving SOL
        // system_program is not listed here because Anchor recognizes it by name
        // and fills it in automatically
      })
      .rpc(); // Send the transaction

    // Record the recipient's balance after the transfer
    const after = await provider.connection.getBalance(recipient.publicKey);

    // Print the transaction signature and balance change
    console.log("Transaction signature:", signature);
    console.log(`Recipient went from ${before} to ${after} lamports`);

    // Assert: The recipient should have received exactly the amount sent
    // If not, throw an error
    if (after - before !== amount.toNumber()) {
      throw new Error("The recipient did not receive the expected amount of SOL");
    }
  });
});