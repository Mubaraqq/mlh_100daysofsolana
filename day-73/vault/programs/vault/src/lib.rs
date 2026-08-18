// Import Anchor's prelude — all the essential types and macros
use anchor_lang::prelude::*;
// Import the System Program's transfer helper and Transfer struct
use anchor_lang::system_program::{transfer, Transfer};

// Declare your program's on-chain address
// Keep YOUR generated ID from anchor init
declare_id!("AuExPWHwxJPRSjGVJT1h9nCsD3HpueqntoDjKXq4UZhQ");

// ==========================================================
// INSTRUCTION HANDLERS
// ==========================================================

#[program]
pub mod vault {
    use super::*;

    // ==========================================================
    // INSTRUCTION: deposit
    // ==========================================================
    // WHAT: User sends SOL to their vault PDA
    // WHO: User (real wallet) signs the transaction
    // HOW: Plain CPI to the System Program
    // WHY: The user's signature is forwarded automatically
    // RETURNS: Ok(()) on success
    // ==========================================================
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Build the accounts struct for the System Program's transfer
        // from: user (sending SOL)
        // to: vault (receiving SOL)
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        
        // Fire the CPI to the System Program
        // The user's signature from the outer transaction flows through
        transfer(cpi_ctx, amount)?;
        Ok(())
    }

    // ==========================================================
    // INSTRUCTION: withdraw
    // ==========================================================
    // WHAT: Vault sends SOL back to the user
    // WHO: Program signs on behalf of the vault PDA
    // HOW: CPI with .with_signer() using seeds + bump
    // WHY: The vault has no private key, so the program signs for it
    // RETURNS: Ok(()) on success
    // ==========================================================
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        // Get the user's public key
        let user_key = ctx.accounts.user.key();
        
        // Get the bump seed from the account constraint
        // ctx.bumps.vault gives you the canonical bump for free
        let bump = ctx.bumps.vault;

        // Build the signer seeds recipe for the vault PDA
        // The vault is derived from: ["vault", user_key, bump]
        // This is the exact recipe the runtime needs to verify the PDA
        let signer_seeds: &[&[&[u8]]] = &[&[b"vault", user_key.as_ref(), &[bump]]];

        // Build the CPI context with the signer seeds
        // .with_signer() tells Anchor to use invoke_signed instead of plain invoke
        // The runtime re-derives the vault address from the seeds
        // If it matches the vault account, the transfer is authorized
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user.to_account_info(),
            },
        )
        .with_signer(signer_seeds);

        // Fire the CPI to the System Program
        // The vault is treated as a signer for this CPI only
        transfer(cpi_ctx, amount)?;
        Ok(())
    }
}

// ==========================================================
// ACCOUNT VALIDATION STRUCTS
// ==========================================================

// ==========================================================
// ACCOUNTS FOR: deposit
// ==========================================================
// WHAT: Defines the accounts needed to deposit SOL
// ACCOUNTS:
//   user: The wallet depositing SOL (signs, pays)
//   vault: The PDA vault receiving SOL (derived from "vault" + user)
//   system_program: The System Program (required for CPI)
// CONSTRAINTS:
//   user: mut, Signer
//   vault: mut, seeds = ["vault", user.key().as_ref()], bump
// ==========================================================
#[derive(Accounts)]
pub struct Deposit<'info> {
    // The wallet depositing SOL
    // mut: its balance decreases
    // Signer: must sign the outer transaction
    #[account(mut)]
    pub user: Signer<'info>,

    // The vault PDA receiving SOL
    // mut: its balance increases
    // seeds: derived from "vault" + user's pubkey
    // bump: Anchor stores the canonical bump
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    // The System Program (required for CPI)
    pub system_program: Program<'info, System>,
}

// ==========================================================
// ACCOUNTS FOR: withdraw
// ==========================================================
// WHAT: Defines the accounts needed to withdraw SOL
// ACCOUNTS:
//   user: The wallet receiving SOL
//   vault: The PDA vault sending SOL (derived from "vault" + user)
//   system_program: The System Program (required for CPI)
// CONSTRAINTS:
//   user: mut, Signer
//   vault: mut, seeds = ["vault", user.key().as_ref()], bump
// ==========================================================
#[derive(Accounts)]
pub struct Withdraw<'info> {
    // The wallet receiving SOL
    // mut: its balance increases
    // Signer: must sign to authorize the withdrawal
    #[account(mut)]
    pub user: Signer<'info>,

    // The vault PDA sending SOL
    // mut: its balance decreases
    // seeds: derived from "vault" + user's pubkey
    // bump: Anchor validates this matches the stored bump
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    // The System Program (required for CPI)
    pub system_program: Program<'info, System>,
}