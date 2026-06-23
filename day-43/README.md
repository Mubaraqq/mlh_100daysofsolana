# Day 43: Mint a 1-of-1 SPL Token and Meet Your First NFT

## Description

Created my first NFT on Solana by minting a token with zero decimals, supply of 1, and mint authority disabled.

**Token Details:**
- Mint Address: AnvSrGqLkgqCUBBgduPAyqmxUTDd4HV27JhXztXkPSSq
- Decimals: 0 (cannot be split)
- Supply: 1 (only one exists)
- Mint Authority: Disabled (cannot mint more)

**What Makes This an NFT:**

| Property | Why it matters |
|----------|----------------|
| Decimals: 0 | Token cannot be subdivided into fractions |
| Supply: 1 | Only one unit exists |
| Mint authority disabled | No one can create another copy |

**Commands Used:**

```bash
spl-token create-token --decimals 0
spl-token create-account AnvSrGqLkgqCUBBgduPAyqmxUTDd4HV27JhXztXkPSSq
spl-token mint AnvSrGqLkgqCUBBgduPAyqmxUTDd4HV27JhXztXkPSSq 1
spl-token authorize AnvSrGqLkgqCUBBgduPAyqmxUTDd4HV27JhXztXkPSSq mint --disable
spl-token supply AnvSrGqLkgqCUBBgduPAyqmxUTDd4HV27JhXztXkPSSq