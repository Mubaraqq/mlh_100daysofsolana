# Day 86: Decide Who Is Allowed to Upgrade the Program

## Description

Practiced the upgrade authority lifecycle on devnet.

## What the Upgrade Authority Is

The wallet that signs the deploy becomes the program's upgrade authority. That wallet can replace the program's bytecode with new code at any time. It's the most powerful key in the system.

## Commands Used

**Read who holds the authority:**
solana program show <PROGRAM_ID>

**Upgrade the program (only authority can do this):**
anchor program upgrade <PROGRAM_ID> --program-filepath target/deploy/vault.so --provider.cluster <RPC>

**Create a throwaway key:**
solana-keygen new --no-bip39-passphrase --outfile new-authority.json

**Transfer authority:**
solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority new-authority.json

**Transfer it back (both keys must sign):**
solana program set-upgrade-authority <PROGRAM_ID> --upgrade-authority new-authority.json --new-upgrade-authority ~/.config/solana/id.json

**Freeze forever (irreversible):**
solana program set-upgrade-authority <PROGRAM_ID> --final

## What I Did

1. Read the authority (was my wallet)
2. Upgraded the program to prove the mechanism works
3. Created a throwaway key
4. Transferred authority to it
5. Confirmed the authority moved
6. Transferred it back to my wallet
7. Confirmed it moved back

## Key Learnings

- Upgrade authority is separate from program upgrade
- Only the authority can deploy new bytecode
- Transferring authority requires the recipient to sign
- --final makes the program permanently immutable. No undo.
- Production programs move authority to a multisig (Squads)
- One key compromise = full program control
- One key loss = program can never be upgraded
