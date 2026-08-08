// Import Anchor's core library for testing
import * as anchor from "@anchor-lang/core";
// Import the Program type for type safety
import { Program } from "@anchor-lang/core";
// Import the generated types for your counter program
import { Counter } from "../target/types/counter";
// Import Solana types for working with public keys
import { PublicKey } from "@solana/web3.js";
// Import assert for test assertions
import { assert } from "chai";

// Test suite: groups all tests for the counter program with config
describe("counter with config", () => {
  // Set up the test environment
  // AnchorProvider.env() uses the local validator running during tests
  const provider = anchor.AnchorProvider.env();
  // Set the global provider so Anchor knows which network to use
  anchor.setProvider(provider);
  // Get the program instance from the workspace
  const program = anchor.workspace.Counter as Program<Counter>;
  // Admin is the default wallet from the provider
  const admin = provider.wallet;

  // Derive the Config PDA address
  // Same seeds as in the program: "config"
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  
  // Derive the Counter PDA for the admin user
  // Same seeds as in the program: "counter" + admin's pubkey
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), admin.publicKey.toBuffer()],
    program.programId
  );

  // Test 1: Happy path — initialize config, create counter, increment
  it("initializes config and a counter, then increments", async () => {
    // 1. Initialize the config PDA (admin becomes the config admin)
    await program.methods.initConfig().rpc();
    
    // 2. Initialize a counter for the admin user
    // The counter PDA is derived from "counter" + admin's pubkey
    await program.methods.initCounter().rpc();
    
    // 3. Increment the counter once
    await program.methods.increment().rpc();

    // 4. Fetch the counter from the blockchain
    const counter = await program.account.counter.fetch(counterPda);
    
    // 5. Assert: count should be 1 (started at 0, incremented once)
    assert.equal(counter.count.toNumber(), 1);
  });

  // Test 2: Sad path — increment should fail when paused
  it("refuses to increment when paused", async () => {
    // 1. Admin pauses the program
    await program.methods.setPaused(true).rpc();
    
    // 2. Try to increment — this should fail
    try {
      await program.methods.increment().rpc();
      // If we reach this line, the test fails because increment should have thrown an error
      assert.fail("expected pause error");
    } catch (err: any) {
      // 3. Verify the error message contains "Paused"
      // This proves the constraint caught the pause state
      assert.include(err.toString(), "Paused");
    }
    
    // 4. Admin unpauses the program (cleanup for future tests)
    await program.methods.setPaused(false).rpc();
  });

    // ==========================================================
  // TEST: close_counter
  // ==========================================================
  // WHAT: Tests that a counter can be closed and rent is refunded
  // SCENARIO:
  //   1. Ensure a counter exists for the user
  //   2. Record the counter's lamports (rent deposit)
  //   3. Record the user's balance before closing
  //   4. Call close_counter instruction
  //   5. Verify the counter account no longer exists
  //   6. Verify the user's balance increased by the rent amount
  // EXPECTED: Account is closed, rent is refunded to user
  // ==========================================================
  it("closes a counter and refunds the rent", async () => {
    // Get the user's public key (the default wallet)
    const user = provider.wallet.publicKey;

    // Derive the counter PDA for this user
    // Same seeds as in the program: "counter" + user's pubkey
    const [counterPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("counter"), user.toBuffer()],
      program.programId,
    );

    // Check if the counter exists
    // If not, initialize one (previous tests may have closed it)
    const existing = await provider.connection.getAccountInfo(counterPda);
    if (existing === null) {
      await program.methods.initCounter().rpc();
    }

    // Get the counter account info to read its lamports (rent deposit)
    const counterAccount = await provider.connection.getAccountInfo(counterPda);
    // The amount of SOL locked in the counter account
    const rentLamports = counterAccount!.lamports;

    // Record the user's balance before closing
    const balanceBefore = await provider.connection.getBalance(user);

    // Call the close_counter instruction
    // This transfers all lamports from the counter to the user
    await program.methods.closeCounter().rpc();

    // Try to fetch the counter account after closing
    // Should return null because the account no longer exists
    const counterAfter = await provider.connection.getAccountInfo(counterPda);

    // Record the user's balance after closing
    const balanceAfter = await provider.connection.getBalance(user);

    // Assert: The counter account should no longer exist
    if (counterAfter !== null) {
      throw new Error("counter account still exists after close");
    }

    // Print the rent amount that was refunded
    console.log("rent refunded (lamports):", rentLamports);

    // Print the net change in the user's wallet
    // Should equal the rent amount (minus transaction fees)
    console.log("net wallet change (lamports):", balanceAfter - balanceBefore);
  });

});