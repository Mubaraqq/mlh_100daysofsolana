// Import Anchor's prelude — all the essential types and macros
use anchor_lang::prelude::*;

// Declare your program's on-chain address
// Keep YOUR generated ID from anchor init
declare_id!("Ex9Jpn1RF4uUP24anLNrP8XPuTcWF9VPpdftqcQ7dRJX");

// ==========================================================
// INSTRUCTION HANDLERS
// ==========================================================

#[program]
pub mod vault {
    use super::*;

    // ==========================================================
    // INSTRUCTION: withdraw
    // ==========================================================
    // WHAT: Withdraws SOL from the vault
    // WHO: Only the authority (owner) can call this
    // HOW: The withdraw instruction subtracts amount from vault.balance
    // SECURITY: has_one = authority ensures only the owner can withdraw
    // SECURITY: seeds + bump ensures the vault is the correct PDA
    // SECURITY: checked_sub prevents underflow
    // RETURNS: Ok(()) on success, InsufficientFunds error if balance < amount
    // ==========================================================
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        // Get a mutable reference to the vault account
        let vault = &mut ctx.accounts.vault;

        // Subtract the amount from the vault balance
        // checked_sub returns None if vault.balance < amount
        // If underflow would occur, return InsufficientFunds error
        vault.balance = vault
            .balance
            .checked_sub(amount)
            .ok_or(VaultError::InsufficientFunds)?;

        Ok(())
    }
}

// ==========================================================
// ACCOUNT VALIDATION STRUCTS
// ==========================================================

// ==========================================================
// ACCOUNTS FOR: withdraw
// ==========================================================
// WHAT: Defines the accounts needed to withdraw from the vault
// ACCOUNTS:
//   vault: The vault account to withdraw from (PDA)
//   authority: The wallet that owns the vault (signer)
// CONSTRAINTS:
//   mut: The vault balance will be modified
//   seeds: Derive the PDA from "vault" + authority's pubkey
//   bump: Anchor stores and uses the canonical bump
//   has_one = authority: Ensures vault.authority matches the signer
// ==========================================================
#[derive(Accounts)]
pub struct Withdraw<'info> {
    // The vault account
    // mut: its balance will decrease
    // seeds: derived from "vault" + authority's pubkey
    // bump: uses the canonical bump
    // has_one = authority: checks that vault.authority == authority.key()
    #[account(
        mut,
        seeds = [b"vault", authority.key().as_ref()],
        bump,
        has_one = authority,
    )]
    pub vault: Account<'info, Vault>,

    // The wallet that owns the vault and signs the transaction
    // Signer: must sign the outer transaction
    pub authority: Signer<'info>,
}

// ==========================================================
// ON-CHAIN DATA STRUCTURE
// ==========================================================

// The Vault account stores:
// - authority: who owns this vault
// - balance: how much SOL is in the vault
#[account]
pub struct Vault {
    pub authority: Pubkey,  // The wallet that owns this vault
    pub balance: u64,       // The current balance in lamports
}

// ==========================================================
// CUSTOM ERROR CODES
// ==========================================================

// Custom errors for the vault program
// Anchor assigns error code 6000 to the first variant
#[error_code]
pub enum VaultError {
    #[msg("Withdrawal exceeds vault balance")]
    InsufficientFunds,  // Code 6000
}