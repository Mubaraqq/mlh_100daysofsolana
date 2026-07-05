# Day 53: Audit Your Three Token-2022 Mints and Map Every Extension You Have Shipped

## Description

Audited two Token-2022 mints using spl-token display.

**Day 50 Mint (Fee-only):**
- Address: BPKGfW7GU1mfcwJG8ANbk8a4BhSKan2PgDutahKnEhDq
- TransferFeeConfig: 100bps (1%)

**Day 52 Mint (Fee + Interest):**
- Address: 47yKd3EBzL7TmG5UKCnBdP8E1UmkrL9c5JRuWuAHEiCd
- TransferFeeConfig: 100bps (1%)
- InterestBearingConfig: 5000bps (50% APR)

**Reflection:**
- Transfer Fee extension: Withholds 1% on every transfer, stored in recipient's account until collected.
- Interest-Bearing extension: Increases UI display balance over time based on 50%25 APR without changing raw on-chain balance.
