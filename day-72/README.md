# Day 72: Mint Token-2022 Tokens from Inside Your Program

## Description

Created a program that mints Token-2022 tokens by calling the Token-2022 program via CPI.

**Program Structure:**
- Instruction: `mint_tokens` — mints tokens by calling Token-2022 via CPI
- CPI: Calls the Token-2022 program's `mint_to` instruction
- Accounts: signer (mint authority), mint (Token-2022 mint), token_account (destination), token_program (Token-2022)

**How the CPI Works:**
- Your program builds a `MintTo` accounts struct (mint, token_account, authority)
- Wraps it in a `CpiContext` with the Token-2022 program ID
- Calls `token_interface::mint_to(cpi_ctx, amount)`
- Token-2022 executes the mint
- Your program resumes after the CPI returns

**Test Results:**
- Minted: 1,000,000,000 base units (1 token with 9 decimals)
- Token account balance verified on-chain
- Test passed in 2 seconds

**Key Learnings:**
- Your program cannot mint tokens directly — only the Token Program can
- CPIs let your program delegate work to other programs
- The mint authority's signature is forwarded to the CPI automatically
- InterfaceAccount and Interface work with both Token and Token-2022