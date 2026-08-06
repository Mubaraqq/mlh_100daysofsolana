# Day 66: Add a Config PDA and Constraints That Hold Two Accounts Together

## Description

Added a Config PDA (singleton) to the counter program. The Config stores global settings: admin, paused state, and total_counters.

**New Instructions:**
- \init_config\: Creates the Config PDA (admin becomes the first caller)
- \set_paused\: Toggles paused state (only admin can call)

**Updated Instructions:**
- \init_counter\: Now requires Config to exist and updates total_counters
- \increment\: Now checks Config for paused state and has_one for ownership

**Constraints Added:**
- \seeds = [b\
config\]\: Ensures Config PDA is canonical
- \has_one = admin\: Only admin can call set_paused
- \constraint = !config.paused\: Blocks increments when paused
- \has_one = user\: Only counter owner can increment

**Test Results:**
- Test 1: Config initialized → counter created → increment succeeded (count = 1)
- Test 2: Paused → increment failed with 'Paused' error

**Key Learnings:**
- Singleton PDA pattern for global configuration
- \constraint\ for arbitrary checks on account state
- \has_one\ for foreign key relationships between accounts
- Constraints run before handlers — cheaper and cleaner
