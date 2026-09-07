# Day 79: Close Every Hole with One Line of Anchor

## Description

Hardened a Withdraw instruction by adding declarative constraints to the accounts struct.

## Insecure Version

```rust
#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}
```

**The problem:** The vault is not checked against the authority. An attacker can sign with their own wallet and pass someone else's vault.

## Secure Version

```rust
#[derive(Accounts)]
pub struct Withdraw<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b\
vault\, authority.key().as_ref()],
        bump = vault.bump,
        has_one = authority,
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}
```

## Key Learnings

- Constraints move validation from the handler to the accounts struct
- Declarative checks cannot be forgotten or bypassed
- seeds + bump ensures the correct PDA
- has_one binds an account to a signer
- One line of Anchor closes a security hole forever
