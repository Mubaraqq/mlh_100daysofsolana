# Day 59: Add an Increment Instruction and Test Both Calls End to End

## Description

Added increment instruction to counter program. New instruction uses \has_one = authority\ constraint to enforce that only the counter owner can increment.

**Program Structure:**
- Instruction: \initialize\ — creates Counter account with count = 0
- Instruction: \increment\ — increases count by 1 (only owner can call)
- Account validation: \Increment\ struct uses \has_one = authority\ constraint

**Test:**
- Calls \initialize\ → counter created with count = 0
- Calls \increment\ → count changes from 0 to 1
- Asserts count = 1 and authority = payer
- Test passes in 0.31s

**Key Learnings:**
- \has_one = authority\ ensures only the owner can modify the counter
- \checked_add\ prevents overflow safely
- Anchor validates constraints before the handler runs
- State persists across transactions in LiteSVM
