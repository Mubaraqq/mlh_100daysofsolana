# Day 61: Break Your Program on Purpose and Watch the Tests Catch It

## Description

Ran mutation testing experiments on counter program. Broke three things deliberately to verify the test suite catches regressions.

**Experiment 1: Remove has_one constraint**
- Removed has_one = authority from Increment accounts struct
- Test caught it: increment_fails_when_wrong_authority_signs failed

**Experiment 2: Break arithmetic**
- Changed checked_add(1) to checked_add(2)
- Test caught it: initialize_then_increment failed (expected 1, got 2)

**Experiment 3: Break initialization**
- Commented out the authority assignment in initialize
- Test caught it: initialize_then_increment failed (ConstraintHasOne error)

**Key Learnings:**
- Every assertion in the suite is load-bearing
- Failure tests catch missing authorization checks
- Happy-path tests catch logic errors
- Tests prove constraints are actually enforced
