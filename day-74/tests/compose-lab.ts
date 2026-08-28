// Import Anchor's core library for testing
import * as anchor from "@anchor-lang/core";
// Import Program and web3 utilities from Anchor
import { Program, web3 } from "@anchor-lang/core";
// Import assert for test assertions
import { assert } from "chai";
// Import the generated types for the counter program (callee)
import { Counter } from "../target/types/counter";
// Import the generated types for the compose-lab program (caller)
import { ComposeLab } from "../target/types/compose_lab";

// Destructure Keypair and SystemProgram from web3
// Keypair: for generating new keypairs
// SystemProgram: the System Program ID (required for account creation)
const { Keypair, SystemProgram } = web3;

// Test suite: groups all tests for the compose-lab program
describe("compose-lab", () => {
  // Set up the test environment
  // AnchorProvider.env() uses the local validator running during tests
  const provider = anchor.AnchorProvider.env();
  // Set the global provider so Anchor knows which network to use
  anchor.setProvider(provider);

  // Get both program instances from the workspace
  // counter: the callee program (the one being called)
  // caller: the compose-lab program (the one making the CPI)
  const counter = anchor.workspace.Counter as Program<Counter>;
  const caller = anchor.workspace.ComposeLab as Program<ComposeLab>;

  // Individual test: the caller program increments the counter via CPI
  it("the caller bumps the counter through a CPI", async () => {
    // Step 1: Create a new keypair for the tally account
    // This account will store the counter value
    const tally = Keypair.generate();

    // Step 2: Initialize the counter directly
    // This creates the tally account with count = 0
    // The counter program's initialize instruction is called directly
    await counter.methods
      .initialize()
      .accounts({
        tally: tally.publicKey,              // The new tally account
        payer: provider.wallet.publicKey,    // Who pays rent
        systemProgram: SystemProgram.programId, // System Program for account creation
      })
      .signers([tally])                      // tally signs because it's a new account
      .rpc();

    // Step 3: Call the caller program's bump instruction
    // This does NOT call increment directly on the counter
    // Instead, it calls bump on compose-lab, which makes a CPI to counter's increment
    await caller.methods
      .bump()
      .accounts({
        tally: tally.publicKey,              // The tally account to increment
        counterProgram: counter.programId,   // The counter program address
      })
      .rpc();

    // Step 4: Fetch the tally account from the counter program
    // This reads the current state of the counter
    const state = await counter.account.tally.fetch(tally.publicKey);

    // Step 5: Assert that the count is now 1
    // The caller program incremented it via CPI, not the test directly
    assert.equal(state.count.toNumber(), 1);
    
    // Step 6: Log the result
    console.log("counter value set by the caller:", state.count.toNumber());
  });
});