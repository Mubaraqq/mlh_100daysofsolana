# Day 71: Move SOL from Inside Your Program with a CPI

## Description

Created a program that moves SOL by calling the System Program via Cross-Program Invocation (CPI).

**Program Structure:**
- Instruction: `sol_transfer` — moves SOL from sender to recipient
- CPI: Calls the System Program's `transfer` instruction
- Accounts: sender (Signer), recipient (SystemAccount), system_program

**How CPI Works:**
- Your program builds a `Transfer` accounts struct
- Wraps it in a `CpiContext` with the System Program ID
- Calls `transfer(cpi_context, amount)`
- The System Program executes the transfer
- Your program resumes after the CPI returns

**Test Results:**
- Sender: 0.25 SOL transferred
- Recipient: 0 → 250,000,000 lamports
- Test passed in 494ms

**Key Learnings:**
- Only the System Program can reduce lamports from a wallet
- CPIs let your program delegate work to other programs
- The sender's signature is forwarded to the CPI automatically
- CPIs are atomic — if the transfer fails, the whole transaction rolls back
