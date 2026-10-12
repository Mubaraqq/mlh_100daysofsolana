// Anchor's TypeScript client. Gives us Program, AnchorProvider,
// web3 (PublicKey, etc.), and workspace.
import * as anchor from "@anchor-lang/core";

// chai is our assertion library. assert.equal, assert.isTrue, etc.
import { assert } from "chai";

// `describe` groups related tests. `it` is a single test.
describe("proof-of-ship", () => {
  // The provider bundles a Connection + a Wallet.
  // .env() reads from the local Anchor environment (the validator + your keypair).
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // `workspace` gives us typed access to programs in this project.
  // Anchor loads the IDL and builds a client for us automatically.
  const program = anchor.workspace.ProofOfShip;

  // TEST 1 — happy path.
  // Call `ship` once. Read the record back. Verify the fields.
  it("records your capstone on chain", async () => {
    // Call the `ship` instruction with two arguments.
    // .rpc() submits the transaction and waits for confirmation.
    await program.methods
      .ship("Proof of Ship", "Built in public, 100 days straight.")
      .rpc();

    // Re-derive the PDA the same way the program does:
    // seeds = [b"ship", builder.key()]
    // The provider's wallet is the builder here.
    const [recordPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("ship"), provider.wallet.publicKey.toBuffer()],
      program.programId,
    );

    // Fetch the account data. Anchor deserializes it using the IDL.
    const record = await program.account.shipRecord.fetch(recordPda);

    // Assert the fields match what we sent.
    assert.equal(record.projectName, "Proof of Ship");
    assert.equal(
      record.builder.toBase58(),
      provider.wallet.publicKey.toBase58(),
    );
  });

  // TEST 2 — failure path.
  // Try to ship again from the same wallet.
  // The PDA already exists, so `init` should refuse.
  it("only lets each wallet ship once", async () => {
    let rejected = false;
    try {
      // Second call from the same wallet. Same PDA.
      // The `init` constraint sees the account already exists → error.
      await program.methods
        .ship("Second try", "This should never land")
        .rpc();
    } catch (_err) {
      // If we reach here, the program rejected the call. That's what we want.
      rejected = true;
    }
    // Assert the call was rejected.
    assert.isTrue(rejected, "second ship should have been rejected");
  });
});