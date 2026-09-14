// Import Anchor's prelude — all the essential types and macros
use anchor_lang::prelude::*;

// Keep YOUR generated program ID from anchor init
declare_id!("7LDmkbYPez3VjC64dToCxBpJgZ6RTaAAQzdQkaPhhwpH");

// ==========================================================
// INSTRUCTION HANDLERS
// ==========================================================

#[program]
pub mod leaky_vault {
    use super::*;

    // ==========================================================
    // INSTRUCTION: withdraw
    // ==========================================================
    // WHAT: Withdraws from the vault (only admin should be allowed)
    // WHO: Anyone who can pass a Config account with their own pubkey as admin
    // VULNERABILITY: The config account is deserialized by hand without
    //                checking its owner. An attacker can forge one.
    // ==========================================================
    /** pub fn withdraw(ctx: Context<Withdraw>, _amount: u64) -> Result<()> {
        // Get the raw bytes from the config account
        // try_borrow_data() returns the account's data field as bytes
        // NOTE: this works on UncheckedAccount because we have raw access
        let data = ctx.accounts.config.try_borrow_data()?;

        // Deserialize the bytes into a Config struct
        // VULNERABLE: this reads the bytes without checking who owns the account
        // An attacker can fill these bytes with anything they want
        let config = Config::try_deserialize(&mut &data[..])?;

        // Check that the admin field in the config matches the signer
        // If the attacker forged the config with their own pubkey as admin,
        // this check passes and the attacker is authorized
        require_keys_eq!(
            config.admin,
            ctx.accounts.signer.key(),
            VaultError::Unauthorized
        );

        // Real withdraw logic would move lamports here. For the experiment,
        // reaching this line at all is the exploit: auth has been bypassed.
        msg!("withdraw authorized for {}", ctx.accounts.signer.key());
        Ok(())
    } */

    pub fn withdraw(ctx: Context<Withdraw>, _amount: u64) -> Result<()> {
    // Account<'info, Config> has already deserialized the account for us
    // No need for try_borrow_data or try_deserialize
    require_keys_eq!(
        ctx.accounts.config.admin,
        ctx.accounts.signer.key(),
        VaultError::Unauthorized
    );

    msg!("withdraw authorized for {}", ctx.accounts.signer.key());
    Ok(())

    }
}

// ==========================================================
// ACCOUNT VALIDATION STRUCTS
// ==========================================================

// ==========================================================
// ACCOUNTS FOR: withdraw
// ==========================================================
// WHAT: Defines the accounts needed to withdraw
// VULNERABILITY: config is UncheckedAccount, meaning Anchor does NOT
//                verify its owner before the handler runs. We must do
//                it manually. We don't.
// ==========================================================
#[derive(Accounts)]
pub struct Withdraw<'info> {
    /**
    /// CHECK: deserialized by hand below, with no owner check. This is the bug.
    // UncheckedAccount tells Anchor: "Don't verify this account's owner."
    // Anchor trusts the developer to do the check themselves.
    // The `/// CHECK:` comment is required by Anchor when using UncheckedAccount.
    pub config: UncheckedAccount<'info>, */

    // Account<T> checks the owner BEFORE deserializing.
    // A System-owned forgery is rejected with AccountOwnedByWrongProgram.
    pub config: Account<'info, Config>,

    // The wallet signing the transaction
    // mut: its lamports may change (in a real withdraw)
    // Signer: must sign the transaction
    #[account(mut)]
    pub signer: Signer<'info>,
}

// ==========================================================
// ON-CHAIN DATA STRUCTURE
// ==========================================================

// The Config account stores the admin pubkey
// When deserialized from a real (non-forged) account, it's owned by
// the leaky_vault program. But UncheckedAccount doesn't verify that.
#[account]
pub struct Config {
    pub admin: Pubkey,  // The wallet authorized to withdraw
}

// ==========================================================
// CUSTOM ERROR CODES
// ==========================================================

#[error_code]
pub enum VaultError {
    #[msg("signer is not the admin")]
    Unauthorized,
}