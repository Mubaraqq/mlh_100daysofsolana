# Day 36: Create an Interest-Bearing Token

## Description

Created an interest-bearing token using Token-2022 program with --interest-rate 500 (5% annual).

**Token Details:**
- Mint Address: 4SyaJoHiTF7K3CkEtrBsS7EKRxesHPJSLJ3znyWZydGv
- Initial Rate: 500 basis points (5% annual)
- Updated Rate: 15000 basis points (150% annual)
- Initial Balance: 1000
- Balance at 5%: 1000.000278863
- Balance at 150%: 1000.006447139

## Formula

The interest-adjusted amount uses continuous compounding:

**A = P * e^(rt)**

Where:
- A = Final amount (display balance)
- P = Principal (raw balance)
- e = Euler's number (~2.71828)
- r = Rate (0.05 for 5%%, 1.5 for 150%%)
- t = Time elapsed since mint creation

## Key Insight

The raw on-chain balance never changes. Only the display amount changes based on the formula.
No background process needed. The math is computed on read.
