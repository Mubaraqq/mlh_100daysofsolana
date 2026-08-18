# Day 73: Withdraw SOL from a Vault Your Program Signs For

## Description

Built a vault program where users can deposit SOL and the program signs for withdrawals using PDA signing.

**Program Structure:**
- `deposit`: User sends SOL to their vault PDA (plain CPI)
- `withdraw`: Program signs for the vault using `.with_signer()` and seeds + bump

**How PDA Signing Works:**
- The vault has no private key (it's a PDA)
- The program proves control by providing the exact seeds used to derive the vault
- `signer_seeds` = ["vault", user_key, bump]
- `.with_signer(signer_seeds)` tells Anchor to use `invoke_signed`

**Test Results:**
- Deposited: 0.5 SOL → vault balance: 500,000,000 lamports
- Withdrew: 0.5 SOL → vault balance: 0
- Test passed in 1 second

**Key Learnings:**
- PDAs cannot sign for themselves
- Programs can sign for PDAs using seeds + bump
- `.with_signer()` is used for PDA-signed CPIs
- The seeds must match exactly for the runtime to authorize