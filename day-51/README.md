# Day 51: Send Your Fee-Bearing Token and Harvest the Withheld Fees

## Description

Transferred fee-bearing token and harvested withheld fees.

**Token Details:**
- Mint Address: BPKGfW7GU1mfcwJG8ANbk8a4BhSKan2PgDutahKnEhDq
- Fee: 100 basis points (1%25)
- Decimals: 6

**Workflow:**
1. Minted fresh supply: 1,000,000 tokens
2. Generated recipient wallet
3. Created recipient token account
4. Transferred 1000 tokens with --expected-fee 10
5. Recipient received 990 tokens (10 withheld as fee)
6. Withdrew withheld fees from recipient's account to my wallet
7. Final balance: 1,000,010 tokens

**Key Insight:**
Fee lifecycle: transfer → withhold → withdraw. Enforced by Token-2022 program.
