# Day 52: Stack Interest Accrual on Top of Your Fee-Bearing Token

## Description

Created a multi-extension token with both Transfer Fee and Interest-Bearing extensions on a single mint.

**Token Details:**
- Mint Address: 47yKd3EBzL7TmG5UKCnBdP8E1UmkrL9c5JRuWuAHEiCd
- Fee: 100 basis points (1%25)
- Interest Rate: 5000bps (50%25 APR)
- Decimals: 6

**Extensions Active:**
- TransferFeeConfig: 1%25 fee on every transfer
- InterestBearingConfig: 50%25 APR interest accrual

**Workflow:**
1. Created mint with both extensions enabled
2. Created token account and minted 1,000,000 tokens
3. Observed interest accrual: 1000004.21464 → 1000005.894163 (30 sec)
4. Generated recipient wallet and created token account
5. Transferred 1000 tokens with --expected-fee 10
6. Recipient received 990 tokens (10 withheld as fee)
7. Withdrew withheld fees from recipient's account

**Key Insight:**
Extensions compose. One mint, two behaviors. Interest is a view, not a balance change.
