// Import Anchor's core library for testing
import * as anchor from "@anchor-lang/core";
// Import Program and web3 utilities from Anchor
import { Program, web3 } from "@anchor-lang/core";
// Import the generated types for your vault program
import { Vault } from "../target/types/vault";
// Import assert for test assertions
import { assert } from "chai";

// Destructure PublicKey, SystemProgram, and LAMPORTS_PER_SOL from web3
// PublicKey: for working with Solana addresses
// SystemProgram: the System Program ID (required for CPIs)
// LAMPORTS_PER_SOL: conversion constant (1 SOL = 1,000,000,000 lamports)
const { PublicKey, SystemProgram, LAMPORTS_PER_SOL } = web3;

// Test suite: groups all tests for the vault program
describe("vault", () => {
  // Set up the test environment
  // AnchorProvider.env() uses the local validator running during tests
  const provider = anchor.AnchorProvider.env();
  // Set the global provider so Anchor knows which network to use
  anchor.setProvider(provider);

  // Get the program instance from the workspace
  const program = anchor.workspace.Vault as Program<Vault>;
  // The user is the default wallet from the provider
  const user = provider.wallet.publicKey;

  // Derive the vault PDA address for this user
  // Same seeds as in the program: "vault" + user's pubkey
  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), user.toBuffer()],
    program.programId
  );

  // Individual test: deposits SOL, then withdraws it back
  it("deposits, then the program signs to withdraw", async () => {
    // Amount to deposit and withdraw: 0.5 SOL
    const amount = new anchor.BN(0.5 * LAMPORTS_PER_SOL);

    // --- Step 1: Deposit SOL into the vault ---
    // The user signs the transaction, and the System Program moves SOL
    // from the user's wallet to the vault PDA
    await program.methods
      .deposit(amount)
      .accountsPartial({
        user,                          // The wallet sending SOL
        vault,                         // The vault PDA receiving SOL
        systemProgram: SystemProgram.programId, // System Program for CPI
      })
      .rpc();

    // Log the vault balance after deposit (should be 0.5 SOL)
    console.log("vault after deposit:", await provider.connection.getBalance(vault));

    // --- Step 2: Withdraw SOL from the vault ---
    // The program signs for the vault PDA using seeds + bump
    // This is the key difference: the vault has no private key,
    // so the program uses .with_signer() in the CPI
    await program.methods
      .withdraw(amount)
      .accountsPartial({
        user,                          // The wallet receiving SOL
        vault,                         // The vault PDA sending SOL
        systemProgram: SystemProgram.programId, // System Program for CPI
      })
      .rpc();

    // Log the vault balance after withdraw (should be 0)
    const finalBalance = await provider.connection.getBalance(vault);
    console.log("vault after withdraw:", finalBalance);

    // Assert: the vault balance should be 0 after withdrawal
    assert.equal(finalBalance, 0);
  });
});