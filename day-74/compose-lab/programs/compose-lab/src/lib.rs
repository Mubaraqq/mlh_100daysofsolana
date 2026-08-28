// Import Anchor's prelude — all the essential types and macros
use anchor_lang::prelude::*;

// ==========================================================
// DECLARE PROGRAM (IDL-driven CPI generation)
// ==========================================================
// This macro reads idls/counter.json and generates a CPI module for the counter program
// The generated module is named "counter" and contains:
//   - cpi::increment: function to call the counter's increment instruction
//   - cpi::accounts::Increment: accounts struct the counter expects
//   - program::Counter: type to validate the counter program's address
//   - accounts::Tally: the counter's Tally account type
// ==========================================================
declare_program!(counter);

// Import the generated types from the counter program
// accounts::Tally: the counter's data struct
// cpi: module containing the increment function and its accounts struct
// program::Counter: type for validating the counter program
use counter::{
    accounts::Tally,
    cpi::{self, accounts::Increment},
    program::Counter,
};

// Declare your program's on-chain address
// Keep YOUR generated ID from anchor init compose-lab
declare_id!("Fzvn7beGyYaM1qGQYAmMtfuL5VAasHTtVwffdZPcU6fm");

// ==========================================================
// INSTRUCTION HANDLERS (Caller Program)
// ==========================================================

#[program]
pub mod compose_lab {
    use super::*;

    // ==========================================================
    // INSTRUCTION: bump
    // ==========================================================
    // WHAT: Calls the counter program's increment instruction via CPI
    // WHO: Anyone with a Tally account (created by the counter program)
    // HOW: Builds a CpiContext and calls cpi::increment
    // WHY: Demonstrates one program calling another program
    // RETURNS: Ok(()) on success, error if CPI fails
    // ==========================================================
    pub fn bump(ctx: Context<Bump>) -> Result<()> {
        // Step 1: Build the accounts struct for the counter program's increment
        // Increment is generated from the counter's IDL
        // It expects a single account: tally (the Tally account to increment)
        let cpi_ctx = CpiContext::new(
            ctx.accounts.counter_program.key(), // The counter program's ID (Pubkey)
            Increment {
                tally: ctx.accounts.tally.to_account_info(), // The Tally account
            },
        );
        
        // Step 2: Call the counter program's increment instruction via CPI
        // This pauses this program, runs the counter's increment, then resumes
        // cpi::increment is generated from the counter's IDL
        cpi::increment(cpi_ctx)?;
        Ok(())
    }
}

// ==========================================================
// ACCOUNT VALIDATION STRUCTS
// ==========================================================

// ==========================================================
// ACCOUNTS FOR: bump
// ==========================================================
// WHAT: Defines the accounts needed to call the counter's increment
// ACCOUNTS:
//   tally: The Tally account (owned by the counter program)
//   counter_program: The counter program (validated as Counter type)
// CONSTRAINTS:
//   tally: mut (data will be modified by the counter program)
//   counter_program: Program<'info, Counter> (validates it's the correct program)
// ==========================================================
#[derive(Accounts)]
pub struct Bump<'info> {
    // The Tally account created by the counter program
    // mut: its count field will be incremented
    // Account<'info, Tally> is imported from the counter program
    #[account(mut)]
    pub tally: Account<'info, Tally>,
    
    // The counter program
    // Program<'info, Counter> validates that this is actually the counter program
    // using the program ID stored in the Counter type
    pub counter_program: Program<'info, Counter>,
}