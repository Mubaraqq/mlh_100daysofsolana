# Day 81: Let a Machine Find the Bug You'd Never Guess

## Description

Added property-based testing with proptest and full-program fuzzing with Trident to the vault program.

## What Was Added

- programs/vault/src/math.rs - pure apply_deposit function using checked_add
- programs/vault/src/lib.rs - added deposit instruction that calls apply_deposit
- programs/vault/src/math.rs - property test: deposit never shrinks a balance
- trident-tests/fuzz_0/test_fuzz.rs - fuzz flow: deposit_never_shrinks

## Test Results

Property test (proptest):
test math::tests::deposit_never_shrinks_a_balance ... ok

Fuzz test (Trident):
| Instruction | Invoked Total | Ix Success | Ix Failed | Instruction Panicked |
| Deposit     | 100000        | 100000     | 0         | 0                    |

100,000 deposit calls. Zero failures. The invariant held.

## Key Learnings

- Property tests check rules that must hold for all inputs
- proptest generates hundreds of random inputs and shrinks failures to minimal cases
- Trident fuzzes the whole program with random instruction sequences
- proptest tests one function. Trident tests the whole program.
- Both are needed: proptest for arithmetic, Trident for state
