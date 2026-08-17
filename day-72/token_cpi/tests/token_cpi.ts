// Import Anchor's core library for testing
import * as anchor from "@anchor-lang/core";
// Import the Program type for type safety
import { Program } from "@anchor-lang/core";
// Import the generated types for your token_cpi program
import { TokenCpi } from "../target/types/token_cpi";
// Import strict assert for test assertions
import { strict as assert } from "assert";
// Import Token-2022 helpers from @solana/spl-token
// TOKEN_2022_PROGRAM_ID: the Token-2022 program address
// createMint: creates a new Token-2022 mint
// getOrCreateAssociatedTokenAccount: creates an ATA for the mint
// getAccount: fetches a token account's data
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAccount,
} from "@solana/spl-token";

// Test suite: groups all tests for the token_cpi program
describe("token_cpi", () => {
  // Set up the test environment
  // AnchorProvider.env() uses the local validator running during tests
  const provider = anchor.AnchorProvider.env();
  // Set the global provider so Anchor knows which network to use
  anchor.setProvider(provider);

  // Get the program instance from the workspace
  const program = anchor.workspace.TokenCpi as Program<TokenCpi>;

  // Individual test: mints Token-2022 tokens through the program via CPI
  it("mints Token-2022 tokens through the program", async () => {
    // Get the payer wallet (the wallet that pays for transactions)
    const payer = (provider.wallet as anchor.Wallet).payer;
    const connection = provider.connection;

    // --- Step 1: Create a Token-2022 mint ---
    // createMint creates a new mint account on-chain
    // Parameters:
    //   - connection: Solana RPC connection
    //   - payer: wallet paying for the transaction
    //   - mint authority: who can mint new tokens (payer's wallet)
    //   - freeze authority: who can freeze accounts (null = no one)
    //   - decimals: 9 (like SOL)
    //   - TOKEN_2022_PROGRAM_ID: use Token-2022 program instead of original Token Program
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey, // mint authority
      null,            // no freeze authority
      9,               // decimals
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    // --- Step 2: Create the destination token account ---
    // getOrCreateAssociatedTokenAccount creates an Associated Token Account (ATA)
    // The ATA is a deterministic address derived from the wallet and mint
    // Parameters:
    //   - connection: Solana RPC connection
    //   - payer: wallet paying for the transaction
    //   - mint: the mint address
    //   - owner: the wallet that will own the token account
    //   - false: don't create if it already exists
    //   - TOKEN_2022_PROGRAM_ID: use Token-2022 program
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      payer.publicKey,
      false,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    // --- Step 3: Ask YOUR program to mint tokens ---
    // This is the CPI: your program calls the Token-2022 program
    // amount is in base units (1,000,000,000 = 1 token with 9 decimals)
    const amount = new anchor.BN(1_000_000_000);

    // Call the mint_tokens instruction on your program
    // accountsPartial specifies the accounts your program needs:
    //   - signer: the mint authority (payer's wallet)
    //   - mint: the mint account
    //   - tokenAccount: the destination token account
    //   - tokenProgram: the Token-2022 program (used for the CPI)
    await program.methods
      .mintTokens(amount)
      .accountsPartial({
        signer: payer.publicKey,
        mint,
        tokenAccount: ata.address,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    // --- Step 4: Read the balance from the chain ---
    // getAccount fetches the token account data
    // account.amount is the balance in base units
    const account = await getAccount(connection, ata.address, undefined, TOKEN_2022_PROGRAM_ID);

    // Print the balance (should be 1,000,000,000 base units = 1 token)
    console.log("Minted base units:", account.amount.toString());

    // Assert: the minted amount matches what we requested
    assert.equal(account.amount.toString(), amount.toString());
  });
});