# Day 50: Create a Fee-Bearing Token with Token-2022

## Description

Created a fee-bearing fungible token using Token-2022 Transfer Fee extension.

**Token Details:**
- Mint Address: H9nYEyqZNtH6xAR1tXXsv9tnHEJnAa4g2j6DZF1fkn3C
- Fee: 100 basis points (1%25)
- Max Fee: 1,000,000 base units
- Decimals: 6
- Supply: 1000

**Transfer Fee Config:**
| Field | Value |
|-------|-------|
| Current fee | 100bps (1%25) |
| Current maximum | 1,000,000,000,000 base units |
| Config authority | 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj |
| Withdrawal authority | 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj |
| Withheld fees | 0 |

**Commands Used:**
```bash
spl-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb create-token \\
  --transfer-fee-basis-points 100 \\
  --transfer-fee-maximum-fee 1000000 \\
  --decimals 6

spl-token create-account H9nYEyqZNtH6xAR1tXXsv9tnHEJnAa4g2j6DZF1fkn3C
spl-token mint H9nYEyqZNtH6xAR1tXXsv9tnHEJnAa4g2j6DZF1fkn3C 1000
spl-token display H9nYEyqZNtH6xAR1tXXsv9tnHEJnAa4g2j6DZF1fkn3C
```
