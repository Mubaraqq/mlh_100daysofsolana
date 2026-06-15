# Day 31: Explore Advanced Token Incentive Design

## Description

Created a token with transfer fee extension using Token-2022 program.

**Token Details:**
- Mint Address: FvR5QHWSBBeMRtcAH8Z9Aw1dTdqYWN8avXQnj2SNmSYx
- Transfer Fee: 100 basis points (1%)
- Maximum Fee: 5000 base units
- Decimals: 9

**Workflow:**
1. Created token with --transfer-fee-basis-points 100 --transfer-fee-maximum-fee 5000
2. Created token account and minted 1000 tokens
3. Created token account for second wallet
4. Transferred 100 tokens with --expected-fee 1
5. Recipient received 99 tokens (1 withheld as fee)
6. Withdrew withheld fee from recipient's account to my balance (900 → 901)

**Commands Used:**
```bash
spl-token create-token \\
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \\
  --transfer-fee-basis-points 100 \\
  --transfer-fee-maximum-fee 5000

spl-token create-account FvR5QHWSBBeMRtcAH8Z9Aw1dTdqYWN8avXQnj2SNmSYx
spl-token mint FvR5QHWSBBeMRtcAH8Z9Aw1dTdqYWN8avXQnj2SNmSYx 1000
spl-token create-account FvR5QHWSBBeMRtcAH8Z9Aw1dTdqYWN8avXQnj2SNmSYx --owner AxMN4hi3kpzCg1Cqi7U4xKqqHz6uAf5Yy2ew5HqESLx5 --fee-payer ~/.config/solana/id.json
spl-token transfer FvR5QHWSBBeMRtcAH8Z9Aw1dTdqYWN8avXQnj2SNmSYx 100 AxMN4hi3kpzCg1Cqi7U4xKqqHz6uAf5Yy2ew5HqESLx5 --expected-fee 1 --allow-unfunded-recipient
spl-token withdraw-withheld-tokens 7UekhwAAiE9ATRSZHbPEkUXNb59mwFmfypSVU4PQWYNs 4ddnj7MLsLGPuCt6m1hinCR7Q9X65rodH8zhEgvZAqyQ
```
