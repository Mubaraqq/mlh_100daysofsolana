# Day 30: Design Sustainable Token Incentive Systems

## Description

Created a new token using Token Extensions Program (Token-2022) with metadata enabled. Token name: 100daysofsol, symbol: 100DSOL, decimals: 6. Created associated token account, minted 1000 supply, transferred 250 to a second wallet. Learned that --fund-recipient automatically creates token accounts for recipients and covers rent. Metadata URI points to on-chain JSON for wallet display.

## Token Details
- Mint Address: EeNFC6M9KzyV9EPenSJxpMiHPdw8vjZdbRwCUA5WLP55
- Token Name: 100daysofsol
- Symbol: 100DSOL
- Decimals: 6
- Supply: 1000 (750 held by main wallet, 250 transferred)

## Commands Used
\\\ash
spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --enable-metadata --decimals 6
spl-token initialize-metadata EeNFC6M9KzyV9EPenSJxpMiHPdw8vjZdbRwCUA5WLP55 '100daysofsol' '100DSOL' '<URI>'
spl-token create-account EeNFC6M9KzyV9EPenSJxpMiHPdw8vjZdbRwCUA5WLP55
spl-token mint EeNFC6M9KzyV9EPenSJxpMiHPdw8vjZdbRwCUA5WLP55 1000
spl-token transfer EeNFC6M9KzyV9EPenSJxpMiHPdw8vjZdbRwCUA5WLP55 250 <RECIPIENT> --fund-recipient --allow-unfunded-recipient
