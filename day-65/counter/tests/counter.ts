// Import Anchor's core library for testing
import * as anchor from "@anchor-lang/core";
// Import the Program type for type safety
import { Program } from "@anchor-lang/core";
// Import the generated types for your counter program
import { Counter } from "../target/types/counter";
// Import Solana types for working with public keys, keypairs, and SOL
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
// Import assert for test assertions
import { assert } from "chai";

// Test suite: groups all tests for the counter program
describe("counter", () => {
  // Set up the test environment
  // AnchorProvider.env() uses the local validator running during tests
  const provider = anchor.AnchorProvider.env();
  // Set the global provider so Anchor knows which network to use
  anchor.setProvider(provider);
  // Get the program instance from the workspace
  const program = anchor.workspace.Counter as Program<Counter>;

  // Helper function: derives the counter PDA for a given user
  // Same seeds as in the program: "counter" + user's public key
  // Returns the PDA address (the first element of the tuple)
  const counterPda = (user: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("counter"), user.toBuffer()], // Seeds must match the program
      program.programId // Program ID is part of the derivation
    )[0];

  // Individual test: creates a counter per user and increments independently
  it("creates a counter per user and increments independently", async () => {
    // Alice is the default wallet from the test provider
    // She is a regular wallet with a private key (not a PDA)
    const alice = provider.wallet.publicKey;
    // Bob is a new keypair generated for this test
    // He is also a regular wallet with a private key (not a PDA)
    const bob = Keypair.generate();

    // Fund Bob with 2 SOL so he can pay rent for his counter account
    // requestAirdrop sends SOL to Bob's public key
    const sig = await provider.connection.requestAirdrop(
      bob.publicKey,
      2 * LAMPORTS_PER_SOL // 2 SOL in lamports
    );
    // Confirm the transaction so Bob has SOL available
    const latest = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");

    // 1. Alice initializes her counter
    // The counter PDA is derived from "counter" + alice's pubkey
    // Alice signs as the user and pays rent for her counter account
    await program.methods
      .initCounter() // Call the init_counter instruction
      .accounts({ user: alice }) // Pass Alice's wallet as the user (signer)
      .rpc(); // Alice signs automatically (she is the provider wallet)

    // 2. Bob initializes his counter
    // The counter PDA is derived from "counter" + bob's pubkey
    // Bob signs because he is the one paying rent for his counter
    await program.methods
      .initCounter() // Call the init_counter instruction
      .accounts({ user: bob.publicKey }) // Pass Bob's pubkey as the user
      .signers([bob]) // Bob explicitly signs the transaction
      .rpc();

    // 3. Alice increments her counter three times
    // Each call uses Alice's counter PDA (derived from "counter" + alice)
    await program.methods.increment().accounts({ user: alice }).rpc();
    await program.methods.increment().accounts({ user: alice }).rpc();
    await program.methods.increment().accounts({ user: alice }).rpc();

    // 4. Bob increments his counter once
    // Bob's counter PDA is different (derived from "counter" + bob)
    await program.methods.increment().accounts({ user: bob.publicKey }).signers([bob]).rpc();

    // 5. Fetch both counters from the blockchain
    // counterPda(alice) derives Alice's counter PDA address
    const aliceState = await program.account.counter.fetch(counterPda(alice));
    // counterPda(bob.publicKey) derives Bob's counter PDA address
    const bobState = await program.account.counter.fetch(counterPda(bob.publicKey));

    // 6. Assert the counters are correct
    // Alice incremented 3 times: 0 + 3 = 3
    // Bob incremented 1 time: 0 + 1 = 1
    assert.equal(aliceState.count.toNumber(), 3);
    assert.equal(bobState.count.toNumber(), 1);
    // Verify the user field matches the correct wallet
    assert.ok(aliceState.user.equals(alice));
    assert.ok(bobState.user.equals(bob.publicKey));
  });
});