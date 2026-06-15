# Day 32: Review Token Incentive Mechanics

## Description

Created a complete token from scratch in one session: ReinforceCoin (RFC).

**Token Details:**
- Mint Address: DMPDQwTKeMg7G8eJd9gtrVwrqqBT54ysM47YRnQbhR6q
- Name: ReinforceCoin
- Symbol: RFC
- Decimals: 9
- Transfer Fee: 200 basis points (2 percent)
- Maximum Fee: 5,000,000,000,000 base units

**Workflow:**
1. Created token with Token-2022 program (transfer fee + metadata extensions)
2. Initialized metadata (name, symbol, URI)
3. Created token account and minted 1000 supply
4. Created token account for second wallet
5. Transferred 100 tokens with --expected-fee 2
6. Recipient received 98 tokens (2 percent fee withheld)
7. Withdrew withheld fee (2 tokens) from recipient's account
8. Final balance: 902 tokens (900 + 2 fee recovered)

**Commands Used:**
+""+"ash
spl-token create-token \
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  --transfer-fee-basis-points 200 \
  --transfer-fee-maximum-fee 5000 \
  --enable-metadata \
  --decimals 9

spl-token initialize-metadata DMPDQwTKeMg7G8eJd9gtrVwrqqBT54ysM47YRnQbhR6q "ReinforceCoin" "RFC" "<URI>"

spl-token create-account DMPDQwTKeMg7G8eJd9gtrVwrqqBT54ysM47YRnQbhR6q
spl-token mint DMPDQwTKeMg7G8eJd9gtrVwrqqBT54ysM47YRnQbhR6q 1000
spl-token create-account DMPDQwTKeMg7G8eJd9gtrVwrqqBT54ysM47YRnQbhR6q --owner AxMN4hi3kpzCg1Cqi7U4xKqqHz6uAf5Yy2ew5HqESLx5 --fee-payer ~/.config/solana/id.json
spl-token transfer DMPDQwTKeMg7G8eJd9gtrVwrqqBT54ysM47YRnQbhR6q 100 AxMN4hi3kpzCg1Cqi7U4xKqqHz6uAf5Yy2ew5HqESLx5 --expected-fee 2 --allow-unfunded-recipient
spl-token withdraw-withheld-tokens CAioHaPHYrrD8WecqxXf1iXFjUHZf2wnEQWtWKxrJ5LH 55a8ym2DiA6eT9ZGZst12MYLqyeC1G2MWcBFA4bTtpYU
+""+"

## Key Takeaways

- Token-2022 program supports multiple extensions on one mint (transfer fee + metadata)
- Transfer fees are enforced at protocol level — no backend middleware needed
- Fee cap prevents large transfers from paying excessive fees
- --expected-fee flag ensures safety — transfer fails if calculated fee doesn't match
- Withheld fees accumulate in recipient's token account until withdrawn by authority
- Full token lifecycle: create → configure → mint → transfer → collect fees
