// Import the Anchor prelude — everything you need to write Solana programs with Anchor
use anchor_lang::prelude::*;

// Declare the program's on-chain address.
// This MUST match the address in Anchor.toml
// Replace the placeholder with your actual program ID from Anchor.toml
declare_id!("75Us8XjhjHDoY6uemCSHt4Qv6S8mo2M2PpPFTi5uDrSN");

// #[program] marks this module as the entry point for your program.
// Every function inside becomes an instruction that clients can call.
// A module is a container for related code.
// pub mod counter means: This module is public (accessible outside this file)
// use super::*; = import everything from the parent module. Like in JS: import * from './'
#[program]
pub mod counter {
    use super::*;

    // `initialize` is an instruction handler.
    // It runs when a client calls this instruction.
    // `ctx` contains all the accounts passed to this instruction.
    // Context<Initialize> = the accounts passed to this instruction.
    // Result<()> = return type. () means "nothing" (just success or failure).
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Get a mutable reference to the Counter account
        // The `&mut` means we can modify it
        let counter = &mut ctx.accounts.counter;

        // Set the authority field to the public key of who signed the transaction
        // This locks the counter so only this wallet can modify it later
        counter.authority = ctx.accounts.authority.key();

        // Set the starting count to 0
        counter.count = 0;

        // Return Ok(()) to indicate success
        // Anything else means the instruction failed
        Ok(())
    }

        // ==========================================================
    // INSTRUCTION: increment
    // ==========================================================
    // WHAT: Increases the counter by 1
    // CALLED BY: Only the wallet that created the counter (authority)
    // ACCOUNTS NEEDED: counter (existing account), authority (signer)
    // WHAT HAPPENS: counter.count += 1 (if authority matches)
    // RETURNS: Ok(()) on success, Err if authority doesn't match or overflow
    // ==========================================================
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        // Get a mutable reference to the Counter account
        let counter = &mut ctx.accounts.counter;

        // Add 1 to the count, checking for overflow
        // checked_add returns None if count + 1 would exceed u64 max
        // If overflow, return ArithmeticOverflow error
        counter.count = counter.count
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }
}

// #[derive(Accounts)] tells Anchor to parse and validate the accounts for this instruction.
// Each field represents an account that must be passed to this instruction.
// This struct defines what accounts the `initialize` instruction expects.
#[derive(Accounts)]
pub struct Initialize<'info> {
    // The Counter account we're creating and initializing.
    // `init` tells Anchor to create this account.
    // `payer = authority` means the authority pays for the rent.
    // `space = 8 + Counter::INIT_SPACE` allocates exactly enough bytes:
    //   - 8 bytes for Anchor's discriminator (to identify account type)
    //   - + the actual data size (calculated automatically by InitSpace)
    #[account(
        init,
        payer = authority,
        space = 8 + Counter::INIT_SPACE,
    )]
    pub counter: Account<'info, Counter>,

    // The wallet that pays for the account creation and becomes the authority.
    // `mut` means this account's lamports will change (they'll pay rent).
    // `Signer` means this account must sign the transaction.
    #[account(mut)]
    pub authority: Signer<'info>,

    // The System Program is required for creating new accounts.
    // Anchor uses it to create the counter account.
    pub system_program: Program<'info, System>,
}

// ==========================================================
// ACCOUNTS FOR: increment
// ==========================================================
// WHAT: Defines the accounts needed to increment a counter
// ACCOUNTS:
//   counter: The existing counter account to modify
//   authority: The wallet that must match counter.authority
// CONSTRAINTS:
//   mut: The counter data will be modified
//   has_one = authority: counter.authority must equal authority.key()
//   If they don't match, the transaction fails before the handler runs
// ==========================================================
#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut, has_one = authority)]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

// #[account] defines the data structure stored on-chain.
// Every Counter account has these two fields.
// #[derive(InitSpace)] automatically calculates the byte size of this struct.
// It adds up: Pubkey (32 bytes) + u64 (8 bytes) = 40 bytes.
#[account]
#[derive(InitSpace)]
pub struct Counter {
    // The wallet address that owns this counter.
    // Only this address can increment or modify it.
    pub authority: Pubkey,

    // The actual counter value.
    // Starts at 0 and can be incremented later.
    pub count: u64,
}