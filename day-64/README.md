# Day 64: Derive Your First PDA from Seeds

## Description

Derived Program Derived Addresses (PDAs) using findProgramAddressSync.

**Seeds Tested:**
- [\
counter\] → 81uZUrrrNjTP6WTRWDcETdhudkKSDMFycXiA9XK4yb5v (bump: 255)
- [\
counter\, \alice\] → BjegqGk1BZEjKCYbvzEb4trsG2Bd3Kec2JDZFWQzxTvw (bump: 255)
- [\
counter\, \bob\] → 48pAM7tz8E169Je1BP7ziWkcQVYj3E6tVjHCkLibFxdw (bump: 252)

**Key Insights:**
- Same seeds → same PDA (deterministic)
- Different seeds → different PDA
- PDAs are off-curve addresses
- No private key exists for PDAs
- Program can sign for PDAs using seeds + bump
