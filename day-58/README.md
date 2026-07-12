# Day 58: Add State to Your Program and Write Your First LiteSVM Test

## Description

Added state to Anchor program with a Counter account storing authority and count.

**Program Structure:**
- Instruction: initialize -- creates a Counter account with count = 0
- Account struct: Initialize -- validates counter, authority, system_program
- Data struct: Counter -- stores authority (Pubkey) and count (u64)

**Test:**
- Uses LiteSVM (local Solana VM)
- Creates payer wallet with 10 SOL
- Loads compiled program from counter.so
- Calls initialize instruction
- Asserts count = 0 and authority = payer
- Test passes in 0.28s

**Key Learnings:**
- #[program] defines instructions
- #[derive(Accounts)] validates accounts
- #[account] defines on-chain data structure
- init creates accounts with rent paid by payer
- LiteSVM enables fast local testing without devnet
