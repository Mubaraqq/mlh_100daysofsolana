# Day 33: Test Token Distribution Strategies

## Description

Created a non-transferable (soulbound) token using Token-2022 program with --enable-non-transferable flag.

**Token Details:**
- Mint Address: GCD6k7UhMmxAEJMnAnYX9X3ZEw6AGUpj3KwdN1SMnG9U
- Decimals: 9
- Type: Non-transferable

**Workflow:**
1. Created token with --enable-non-transferable
2. Minted 10 tokens
3. Attempted transfer to second wallet -> FAILED
4. Error: Transfer is disabled for this mint
5. Burned 3 tokens -> SUCCESS
6. Final balance: 7

**Key Insight:**
Non-transferable tokens cannot be moved but can be burned.
Use cases: credentials, badges, KYC, certifications.
