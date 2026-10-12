// Anchor's prelude. Brings in all the macros and types we need:
// #[program], #[derive(Accounts)], #[account], Context, Signer, Pubkey, etc.
use anchor_lang::prelude::*;

// The program's on-chain address.
declare_id!("6xKXthNFn8YdaPVqdrAJWDfaAxeNeBX5MZuUSaVxd7mL");

// The program module. Everything inside `pub mod proof_of_ship` becomes
// a callable instruction. Right now there's exactly one: `ship`.
#[program]
pub mod proof_of_ship {
    use super::*;

    // The only instruction. Any wallet can call it once to permanently
    // record that they shipped a capstone.
    //
    // Inputs:
    //   - project_name: what you built (max 64 chars)
    //   - message: a short note about it (max 256 chars)
    //
    // The account `ship_record` is created by this call. Its address is
    // derived from the builder's wallet, so the same wallet can never
    // create a second record.
    pub fn ship(ctx: Context<Ship>, project_name: String, message: String) -> Result<()> {
        // Enforce the name length limit. If it fails, throw NameTooLong.
        require!(project_name.len() <= 64, CapstoneError::NameTooLong);

        // Enforce the message length limit. If it fails, throw MessageTooLong.
        require!(message.len() <= 256, CapstoneError::MessageTooLong);

        // Write to the account. `&mut` because we're mutating it.
        let record = &mut ctx.accounts.ship_record;

        // Store the wallet that called this. It's the signer.
        record.builder = ctx.accounts.builder.key();

        // Store the two strings passed in.
        record.project_name = project_name;
        record.message = message;

        // Store the current Unix timestamp.
        // Clock is Solana's built-in clock sysvar — every program can read it.
        record.shipped_at = Clock::get()?.unix_timestamp;

        // Store the bump seed Anchor found for this PDA.
        // Useful if you ever need to re-derive the address off-chain.
        record.bump = ctx.bumps.ship_record;

        Ok(())
    }
}

// Describes the accounts that the `ship` instruction expects.
// Anchor uses this to validate accounts at runtime.
#[derive(Accounts)]
pub struct Ship<'info> {
    // The PDA that will hold this wallet's ship record.
    //
    // `init` tells Anchor to create the account if it doesn't exist.
    // If it DOES exist, init fails — that's how we enforce "one record per wallet."
    //
    // `payer = builder` — the builder pays the rent to create the account.
    //
    // `space = 8 + ShipRecord::INIT_SPACE` — 8 bytes for Anchor's account
    // discriminator, plus whatever INIT_SPACE computes for our fields.
    //
    // `seeds = [b"ship", builder.key().as_ref()]` — the PDA is derived from
    // the literal string "ship" and the builder's public key. That means
    // the address is deterministic: same wallet = same PDA, every time.
    //
    // `bump` — Anchor finds the canonical bump and stores it.
    #[account(
        init,
        payer = builder,
        space = 8 + ShipRecord::INIT_SPACE,
        seeds = [b"ship", builder.key().as_ref()],
        bump
    )]
    pub ship_record: Account<'info, ShipRecord>,

    // The wallet calling this instruction. Must sign the transaction.
    // `mut` because they're paying for the account (their balance changes).
    #[account(mut)]
    pub builder: Signer<'info>,

    // The System Program. Required because we're creating a new account.
    pub system_program: Program<'info, System>,
}

// The data stored in each ship record.
//
// #[account] marks this as an Anchor account type.
// #[derive(InitSpace)] auto-computes how many bytes it needs, so we can
// use `ShipRecord::INIT_SPACE` in the space calculation above.
#[account]
#[derive(InitSpace)]
pub struct ShipRecord {
    // 32 bytes — the wallet that shipped.
    pub builder: Pubkey,

    // A string up to 64 chars. #[max_len(64)] tells InitSpace to reserve
    // 4 bytes for the length prefix + 64 bytes for the content.
    #[max_len(64)]
    pub project_name: String,

    // A string up to 256 chars. Same pattern.
    #[max_len(256)]
    pub message: String,

    // 8 bytes — Unix timestamp from Clock.
    pub shipped_at: i64,

    // 1 byte — the PDA bump seed.
    pub bump: u8,
}

// Custom errors. Each one is a named, human-readable failure.
//
// #[error_code] turns this enum into a Solana program error type.
// #[msg("...")] is the message the caller sees when this error fires.
#[error_code]
pub enum CapstoneError {
    #[msg("Project name must be 64 characters or fewer")]
    NameTooLong,
    #[msg("Message must be 256 characters or fewer")]
    MessageTooLong,
}