# Day 44: Give Your NFT a Name, an Image, and On-Chain Metadata

## Description

Created an NFT with on-chain metadata using Token-2022 metadata extension. Vanity mint address starting with 'nft'.

**Token Details:**
- Mint Address: nftFY4WDavo1Ke4coHbSdvyQNa2168hRjLLx3kWD1Gs
- Name: First Light
- Symbol: LIGHT
- Supply: 1
- Decimals: 0
- Mint Authority: Disabled

**Commands Used:**
```bash
solana-keygen grind --starts-with nft:1
spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --enable-metadata --decimals 0 nftFY4WDavo1Ke4coHbSdvyQNa2168hRjLLx3kWD1Gs.json
spl-token initialize-metadata nftFY4WDavo1Ke4coHbSdvyQNa2168hRjLLx3kWD1Gs 'First Light' 'LIGHT' 'https://gist.githubusercontent.com/Mubaraqq/802d651b531f227a21e306338240371b/raw/15fe12e4b116f255230ea935915b2bf038ab4e34/metadata.json'
spl-token create-account nftFY4WDavo1Ke4coHbSdvyQNa2168hRjLLx3kWD1Gs
spl-token mint nftFY4WDavo1Ke4coHbSdvyQNa2168hRjLLx3kWD1Gs 1
spl-token authorize nftFY4WDavo1Ke4coHbSdvyQNa2168hRjLLx3kWD1Gs mint --disable
```
