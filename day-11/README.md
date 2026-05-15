# Day 11: Accounts vs Databases

## Comparison Table

| Concept | MongoDB | Solana Accounts |
|---------|---------|-----------------|
| Data location | Rows in tables on a centralized server | Accounts on a distributed ledger across validators |
| Schema | Defined by collection/document structure | Defined by the owning program; stored as raw bytes in account's data field |
| Access control | Application code + database roles | Runtime-enforced: only owning program can modify, only with required signer(s) |
| Storage cost | Monthly cloud bill | One-time rent-exempt deposit (refundable) |
| Identity | ObjectId, UUID | 32-byte public key (Ed25519) |
| Reads | find(), aggregate() | RPC calls (getBalance, getAccountInfo) |
| Writes | insertOne(), updateOne() | Transactions with instructions, signed by authorized keys |
| Code vs data | App code on server, data in database | Both are accounts (executable: true/false) |
| Deletion | deleteOne() removes document | Close account, lamports returned |
| Visibility | Private by default | Public by default |
| Who pays for storage | Developer (server costs) | User (deposits SOL) |
