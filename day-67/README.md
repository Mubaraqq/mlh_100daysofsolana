# Day 67: Close a PDA Account and Reclaim Rent

## Description

Added close_counter instruction to close a counter PDA and refund the rent deposit to the owner.

**New Instruction:**
- close_counter: Closes the counter account and returns lamports to the user

**CloseCounter Accounts Struct:**
- close = user: Transfers all lamports from counter to user
- seeds = [b
counter, user.key().as_ref()]: Derives the PDA
- bump = counter.bump: Uses the stored bump
- has_one = user: Only the owner can close the counter

**Test Results:**
- Rent refunded: 1,231,920 lamports (0.00123192 SOL)
- Net wallet change: 1,226,944 lamports (0.001226944 SOL)
- Difference: 4,976 lamports (transaction fee)

**Key Learnings:**
- close = user drains lamports and closes the account
- Rent deposits are refundable when accounts are closed
- has_one = user prevents strangers from closing your accounts
- Transaction fees are deducted from the refund
