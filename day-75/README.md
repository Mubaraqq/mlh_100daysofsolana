# Day 75: Read a CPI Failure Like a Sentence

## Description

Learned to read CPI failure logs by deliberately breaking a working CPI in three ways and capturing the error messages.

## Three Failures

### 1. Wrong Signer Seeds

Changed one byte in the signer seeds. The runtime rejected the transaction with a privilege error because the derived PDA didn't match the expected PDA.

**Error pattern:** Missing signature / privilege escalation on the PDA.

### 2. Missing or Wrong Account

Modified the accounts struct on the callee to expect an account the caller didn't pass. The runtime rejected with a constraint error, naming the specific constraint and account that failed.

**Error pattern:** Anchor constraint failure with account name.

### 3. Wrong Program ID

Changed the program ID passed to CpiContext::new to point at the System Program instead of the counter program. The System Program rejected the instruction because it didn't recognize the instruction data.

**Error pattern:** Foreign program rejected the instruction.

## Key Insight

The three failure categories cover most real CPI failures. The key is reading the Program log: lines in order — they tell you which program was running and which constraint failed.

## Key Learnings

- Wrong signer seeds -> privilege error (PDA doesn't match)
- Missing/mismatched account -> constraint error (Anchor names the constraint)
- Wrong program ID -> foreign error (other program rejects it)
- Read logs top to bottom to trace where the failure happened
- CPI failures are usually on the boundary between two programs
- Treat every CPI as a contract between caller and callee
