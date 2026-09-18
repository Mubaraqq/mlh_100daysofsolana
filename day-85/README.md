# Day 85: Take an Anchor Program from Staging to Production

## Description

Deployed the vault program from Day 81 to devnet using a dedicated RPC endpoint.

## Deployment Details

- Program ID: Ex9Jpn1RF4uUP24anLNrP8XPuTcWF9VPpdftqcQ7dRJX
- Owner: BPFLoaderUpgradeab1e11111111111111111111111
- ProgramData Address: AhXGo5atPM4tA6TqPUxvScj5x5orugG144nhGnKa5f2P
- Authority: 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj
- Data Length: 151,536 bytes
- Balance: 0.77068172 SOL

## Commands Used

- anchor build
- anchor keys sync
- solana rent <size>
- solana config set --url devnet
- anchor program deploy --provider.cluster <HELIUS_RPC> -- --with-compute-unit-price 50000 --use-rpc
- solana program show <PROGRAM_ID> --url devnet

## Key Learnings

- A deploy is dozens of write transactions, not one
- The free public RPC is rate-limited and fails on deploy
- Dedicated RPC (Helius) is required for reliable deploys
- --use-rpc routes writes over RPC instead of the validator's TPU
- --with-compute-unit-price adds a priority fee for congestion
- The wallet that signs the deploy becomes the upgrade authority
- Rent is locked in the program account, not spent
- Mainnet costs ~1.1 SOL (real money). Devnet is free.
