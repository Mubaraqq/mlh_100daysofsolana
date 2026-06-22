# Day 40: Design a Revocable Credential Token

## Description

Created a revocable credential token using Token-2022 extensions. The token is non-transferable (soulbound) and can be revoked by the issuing authority via permanent delegate.

**Token Details:**
- Mint Address: BarZ99fHmoPztMmhu7G3XGeQBxkiyfDtmutuCNfwNLew
- Name: Solana Dev Credential
- Symbol: CRED
- Decimals: 0

**Extensions Enabled:**

| Extension | Purpose |
|-----------|---------|
| Non-transferable | Token cannot be moved between wallets (soulbound) |
| Permanent delegate | Issuer can burn tokens from any wallet (revocation) |
| Metadata | Name, symbol, URI for wallet display |

**Workflow:**
1. Created mint with --enable-non-transferable, --enable-permanent-delegate, --enable-metadata
2. Initialized metadata: Solana Dev Credential (CRED)
3. Created recipient wallet and token account
4. Minted 1 credential to recipient
5. Attempted transfer to third-party → **FAILED** (Transfer is disabled)
6. Burned credential from recipient's account using permanent delegate → **SUCCESS** (revoked)
7. Final balance: 0

**Bonus Experiments:**
1. Minted second credential, burned one → balance updated correctly (2 → 1)
2. Changed permanent delegate to new address → succeeded (mint authority can reassign)
3. Added custom metadata field issued_date: 2026-06-22 → succeeded

**Key Insight:**
"Permanent" delegate means the authority can burn tokens from any wallet — not that the address is immutable. The mint authority can reassign it at any time.

**Commands Used:**
`ash
spl-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb create-token \
  --decimals 0 \
  --enable-non-transferable \
  --enable-permanent-delegate \
  --enable-metadata

spl-token initialize-metadata BarZ99fHmoPztMmhu7G3XGeQBxkiyfDtmutuCNfwNLew "Solana Dev Credential" "CRED" "https://example.com/credential.json"

spl-token mint BarZ99fHmoPztMmhu7G3XGeQBxkiyfDtmutuCNfwNLew 1 --recipient-owner 4TKkUssJ96aRjMrZcdRgWXErg1kbbQLfFvcNfcLfycgA

spl-token transfer BarZ99fHmoPztMmhu7G3XGeQBxkiyfDtmutuCNfwNLew 1 8UFGmbe57hZfm96TBGhhWqo1Xy6h1gUHbxBag2ekAJbs --owner ~/recipient-wallet.json (FAILED)

spl-token burn 7bRQQTWo69JdgXXoNSVGtedmCxkDx3X8eHAjR7mSbuTr 1 (revoked)
