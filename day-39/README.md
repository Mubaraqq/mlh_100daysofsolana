# Day 39: Inspect and Compare Token Extension Configurations

## Comparison Table

| Mint Address | Extensions Enabled | Account Data Size (bytes) | Rent Cost (SOL) | Key Authorities |
|--------------|-------------------|--------------------------|----------------|-----------------|
| \4SyaJoHiTF7K3CkEtrBsS7EKRxesHPJSLJ3znyWZydGv\ | Interest-bearing | 222 | 0.002436 | **Mint:** 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj |
| \62xfghgMhTWxxyYUYUDvqPek78MTVnhzdqsYs85dKNEw\ | Interest-bearing + Transfer Fee + Metadata | 599 | 0.00505992 | **Mint:** 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj |
| \GuZeNym9cEHR9Nv78rAiJE7gybJ7XY1QXFfRcgNRZLhq\ | Default state: Frozen | 171 | 0.00208104 | **Mint:** 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj |

## Key Observations

| Observation | Detail |
|-------------|--------|
| Smallest account | Frozen only (171 bytes) |
| Largest account | Multi-extension (599 bytes) |
| Extra bytes from extensions | +428 bytes (multi vs frozen base) |
| Rent cost difference | Multi costs 2.4x more than frozen |

## Extensions Breakdown

| Day | Mint | Extensions | Data Length | Rent Cost |
|-----|------|------------|-------------|-----------|
| 36 | Interest-bearing | Interest (15000bps current, 500bps avg) | 222 bytes | 0.002436 SOL |
| 37 | Multi-Extension | Interest (5bps) + Transfer Fee (100bps) + Metadata (ArcCoin/ARC) | 599 bytes | 0.00505992 SOL |
| 38 | Compliance-Gated | Default state: Frozen | 171 bytes | 0.00208104 SOL |

## Authority Summary

| Authority | Controlled by | What it can do |
|-----------|---------------|----------------|
| Mint authority | 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj | Mint new tokens |
| Freeze authority | 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj (Day 38 only) | Freeze/thaw accounts |
| Rate authority | 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj | Update interest rate |
| Withdrawal authority | 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj | Collect withheld fees |
| Update authority | 8CtdyqtzBd597eDz9PTZHuuT62vvLc6YXdXjVkHnboqj | Update metadata |
