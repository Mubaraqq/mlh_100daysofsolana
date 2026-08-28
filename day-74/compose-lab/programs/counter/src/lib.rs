// Import Anchor's prelude — all the essential types and macros
use anchor_lang::prelude::*;

// Declare your program's on-chain address
// Keep YOUR generated ID from anchor new counter
declare_id!("2VepApTj8Jwcwe3rWdN2doCTXwCSiXsbsKGsseahoML9");

// ==========================================================
// INSTRUCTION HANDLERS (Callee Program)
// ==========================================================

#[program]
pub mod counter {
    use super::*;

    // ==========================================================
    // INSTRUCTION: initialize
    // ==========================================================
    // WHAT: Creates a new Tally account with count = 0
    // WHO: Anyone with SOL to pay rent
    // WHY: The counter program needs an account to store state
    // RETURNS: Ok(()) on success
    // ==========================================================
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Set the count to 0
        ctx.accounts.tally.count = 0;
        Ok(())
    }

    // ==========================================================
    // INSTRUCTION: increment
    // ==========================================================
    // WHAT: Increases the tally count by 1
    // WHO: Anyone who has a Tally account
    // HOW: Called directly OR via CPI from compose-lab
    // RETURNS: Ok(()) on success
    // ==========================================================
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        // Add 1 to the count
        ctx.accounts.tally.count += 1;
        
        // Log the new count (visible in transaction logs)
        msg!("counter is now {}", ctx.accounts.tally.count);
        Ok(())
    }
}

// ==========================================================
// ACCOUNT VALIDATION STRUCTS
// ==========================================================

// ==========================================================
// ACCOUNTS FOR: initialize
// ==========================================================
// ACCOUNTS:
//   tally: The new account to create (stores the count)
//   payer: The wallet paying rent and signing
//   system_program: Required for account creation
// CONSTRAINTS:
//   init: Create the account
//   payer = payer: payer pays rent
//   space = 8 + Tally::INIT_SPACE: 8 bytes discriminator + data size
// ==========================================================
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = payer, space = 8 + Tally::INIT_SPACE)]
    pub tally: Account<'info, Tally>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ==========================================================
// ACCOUNTS FOR: increment
// ==========================================================
// ACCOUNTS:
//   tally: The existing Tally account to modify
// CONSTRAINTS:
//   mut: The account data will be modified
// ==========================================================
#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub tally: Account<'info, Tally>,
}

// ==========================================================
// ON-CHAIN DATA STRUCTURE
// ==========================================================
// The Tally account stores a single 64-bit counter.
// Account size: 8 bytes discriminator + 8 bytes count = 16 bytes
// ==========================================================
#[account]
#[derive(InitSpace)]
pub struct Tally {
    pub count: u64,
}