# Day 38: Create a Compliance-Gated Token with Default Frozen Accounts

## Description

Created a token with default frozen accounts using Token-2022 program with --default-account-state frozen flag.

**Token Details:**
- Mint Address: GuZeNym9cEHR9Nv78rAiJE7gybJ7XY1QXFfRcgNRZLhq
- Default State: Frozen
- Freeze Authority: Your wallet

**Workflow:**
| Step | Action | Result |
|------|--------|--------|
| 1 | Create mint with --default-account-state frozen | ✅ |
| 2 | Create two token accounts | Both frozen |
| 3 | Try to mint to frozen account | ❌ Error: Account is frozen |
| 4 | Thaw first account | ✅ |
| 5 | Mint 100 tokens to thawed account | ✅ |
| 6 | Try to transfer to frozen account | ❌ Error: Account is frozen |
| 7 | Thaw second account | ✅ |
| 8 | Transfer 50 tokens | ✅ |
| 9 | Final balances | 50 / 50 |

**Key Insight:**
Both sender and recipient must be thawed for a transfer to succeed.
Enforced at protocol level — no application logic required.

**Use Cases:**
- KYC-gated tokens
- Regulated assets (stablecoins, security tokens)
- Compliance-controlled tokens
- Permissioned loyalty programs

**Commands Used:**
```bash
spl-token create-token \\
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \\
  --enable-freeze \\
  --default-account-state frozen

spl-token create-account GuZeNym9cEHR9Nv78rAiJE7gybJ7XY1QXFfRcgNRZLhq
spl-token thaw 5qC2zQahJ9Dpn9ejw4yWHajHtYLXfh48cjsgt6U4zDiA
spl-token mint GuZeNym9cEHR9Nv78rAiJE7gybJ7XY1QXFfRcgNRZLhq 100
spl-token transfer GuZeNym9cEHR9Nv78rAiJE7gybJ7XY1QXFfRcgNRZLhq 50 3T2QRiHbcb8Nf9CFb9LpBQD53mK1AQ6ii9ok1ysggChe --allow-unfunded-recipient
```
