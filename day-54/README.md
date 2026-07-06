# Day 54: Make a Token That Refuses to Move

## Description

Created a non-transferable (soulbound) token using Token-2022 with --enable-non-transferable.

**Token Details:**
- Mint Address: APendL6d4tGfCgvvoCe4Ady574iYuzWD7YA2XFWULBGg
- Decimals: 9
- Supply: 1 token
- Extension: Non-transferable

**Workflow:**
1. Created mint with --enable-non-transferable
2. Minted 1 token to my wallet
3. Attempted to transfer to recipient → FAILED
4. Error: Transfer is disabled for this mint
5. Confirmed Non-transferable extension on mint via spl-token display

**Error Details:**
- Program: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
- Instruction: TransferChecked
- Error: custom program error: 0x25
- Message: Transfer is disabled for this mint
