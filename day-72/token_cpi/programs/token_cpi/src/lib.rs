// Import Anchor's prelude — all the essential types and macros
use anchor_lang::prelude::*;
// Import Token-2022 interface types for minting tokens via CPI
// token_interface: contains the mint_to function
// Mint: represents a token mint account
// MintTo: accounts struct for the mint_to instruction
// TokenAccount: represents a token account holding tokens
// TokenInterface: trait for interacting with token programs
use anchor_spl::token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface};

// Declare your program's on-chain address
// This MUST match the program ID in Anchor.toml
// Keep YOUR generated ID from anchor init
declare_id!("2dAE1n877XSFpridMhW2npNSEaVghbQD5zLqbcothVvP");

// ==========================================================
// INSTRUCTION HANDLERS
// ==========================================================

#[program]
pub mod token_cpi {
    use super::*;

    // ==========================================================
    // INSTRUCTION: mint_tokens
    // ==========================================================
    // WHAT: Mints new tokens by calling the Token-2022 program via CPI
    // WHO: The signer must be the mint authority (the wallet that created the mint)
    // HOW: Builds a MintTo accounts struct, wraps it in CpiContext, calls mint_to
    // WHY: Your program cannot mint tokens directly — only the Token Program can
    // RETURNS: Ok(()) on success, error if CPI fails
    // ==========================================================
    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        // Step 1: Build the accounts struct for the Token-2022 program's mint_to instruction
        // The Token-2022 program expects:
        //   - mint: the mint account (supply increases)
        //   - to: the token account receiving the new tokens (balance increases)
        //   - authority: the mint authority (must be a signer)
        // to_account_info() converts Anchor accounts to the generic AccountInfo type
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };

        // Step 2: Build the CPI context
        // CpiContext bundles the program we're calling and the accounts it needs
        // ctx.accounts.token_program.key() is the Token-2022 program ID
        // In Anchor 1.0, the first argument to CpiContext::new is a Pubkey (.key())
        let cpi_program = ctx.accounts.token_program.key();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Step 3: Fire the cross-program invocation
        // token_interface::mint_to() is the Token-2022 mint instruction
        // amount is in base units (e.g., with 9 decimals, 1,000,000,000 = 1 token)
        // If the CPI fails, the entire transaction rolls back
        token_interface::mint_to(cpi_ctx, amount)?;

        Ok(())
    }
}

// ==========================================================
// ACCOUNT VALIDATION STRUCTS
// ==========================================================

// ==========================================================
// ACCOUNTS FOR: mint_tokens
// ==========================================================
// WHAT: Defines the accounts needed to mint tokens
// ACCOUNTS:
//   signer: The wallet signing as mint authority (must own the mint authority)
//   mint: The Token-2022 mint account (supply will increase)
//   token_account: The token account receiving the new tokens (balance increases)
//   token_program: The Token-2022 program (required for CPI)
// CONSTRAINTS:
//   mut: mint, token_account, and signer balances change
//   Signer: signer must sign the outer transaction
//   InterfaceAccount: Token-2022 aware account type (works with both Token and Token-2022)
//   Interface: Token-2022 aware program type
// ==========================================================
#[derive(Accounts)]
pub struct MintTokens<'info> {
    // The wallet signing as mint authority
    // mut: its lamports don't change, but it signs the transaction
    // Signer: must sign the outer transaction
    // The signature is forwarded to the Token-2022 program via CPI
    #[account(mut)]
    pub signer: Signer<'info>,

    // The Token-2022 mint account
    // mut: its supply will increase
    // InterfaceAccount<Mint> is Token-2022 aware (works with original Token Program too)
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    // The token account receiving the new tokens
    // mut: its balance will increase
    // InterfaceAccount<TokenAccount> is Token-2022 aware
    #[account(mut)]
    pub token_account: InterfaceAccount<'info, TokenAccount>,

    // The Token-2022 program
    // Interface<TokenInterface> is Token-2022 aware
    // This is the program we're calling via CPI
    pub token_program: Interface<'info, TokenInterface>,
}