# Day 60: Add Failure Tests So Green Checks Actually Mean Something

## Description

Added two failure tests to the counter program to verify constraints actually work.

**Tests:**
1. \initialize_then_increment\ — happy path (Day 59)
2. \increment_fails_when_wrong_authority_signs\ — has_one constraint prevents unauthorized access
3. \initialize_fails_when_counter_already_exists\ — init prevents overwriting existing accounts

**Helpers Added:**
- \setup_svm_with_program\ — creates VM and loads program
- \uild_initialize_tx\ — builds initialize transaction
- \uild_increment_tx\ — builds increment transaction

**Key Learnings:**
- Negative tests prove constraints are real
- Helpers reduce boilerplate and make tests focus on intent
- \has_one\ prevents unauthorized access
- \init\ prevents duplicate account creation
