# Day 65: Build a Per-User Counter with PDA State

## Description

Built a per-user counter program using PDAs (Program Derived Addresses). Each user's counter address is derived deterministically from seeds: 
counter + user's public key.

**Program Structure:**
- Instruction: \init_counter\ — creates a new counter PDA for a user
- Instruction: \increment\ — increases the counter by 1
- Constraint: \seeds = [b\
counter\, user.key().as_ref()]\ — ensures each user has their own counter
- Authorization: Seed derivation replaces \has_one\ — only the correct user can access their counter

**Test Results:**
- Alice initialized counter → incremented 3 times → count = 3
- Bob initialized counter → incremented 1 time → count = 1
- Both counters are independent (different PDAs)

**Key Learnings:**
- PDAs enable deterministic account addresses without keypairs
- Seeds constraint handles authorization automatically
- \ump = counter.bump\ stores and reuses the bump for derivation
- Per-user state without tracking keypairs
