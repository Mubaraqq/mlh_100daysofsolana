# Day 37: Build a Multi-Extension Token

## Description

Created a multi-extension token with three protocol-level features using Token-2022 program.

**Token Details:**
- Mint Address: 62xfghgMhTWxxyYUYUDvqPek78MTVnhzdqsYs85dKNEw
- Name: ArcCoin
- Symbol: ARC
- Decimals: 2

**Extensions Enabled:**
| Extension | Configuration |
|-----------|---------------|
| Transfer Fee | 100bps (1%25), max fee: 50000 base units |
| Interest-Bearing | 5bps (0.05%25 annual) |
| Metadata | Name: ArcCoin, Symbol: ARC, URI provided |

**Workflow:**
1. Created mint with all three extensions enabled
2. Initialized metadata (name, symbol, URI)
3. Created token account and minted 1000 tokens
4. Created second wallet and token account
5. Transferred 100 tokens (1%25 fee withheld → recipient got 99)
6. Withdrew withheld fee from recipient's account → balance 901

**Key Insight:**
Extensions cannot be added after mint creation. Plan token capabilities before creating the mint.

**Commands Used:**
```bash
spl-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \\
  create-token \\
  --decimals 2 \\
  --transfer-fee-basis-points 100 \\
  --transfer-fee-maximum-fee 500 \\
  --interest-rate 5 \\
  --enable-metadata

spl-token initialize-metadata 62xfghgMhTWxxyYUYUDvqPek78MTVnhzdqsYs85dKNEw \
ArcCoin\ \ARC\ \<URI>\

spl-token create-account 62xfghgMhTWxxyYUYUDvqPek78MTVnhzdqsYs85dKNEw
spl-token mint 62xfghgMhTWxxyYUYUDvqPek78MTVnhzdqsYs85dKNEw 1000
spl-token transfer 62xfghgMhTWxxyYUYUDvqPek78MTVnhzdqsYs85dKNEw 100 FbH1LArVUPUXQKZecXxW4xZRjiQtfuPu2fkKi7bQAYsS --expected-fee 1 --allow-unfunded-recipient
spl-token withdraw-withheld-tokens kkx5mrHg5jGbNprpa9jm9ssURzi4kGvidxTx2HbcZoL 92GKXr5hsE36tkGdomKVy7JGDzBYPU7VsYnBjziEB72K
```
