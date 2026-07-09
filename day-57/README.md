# Day 57: Install Anchor and Scaffold Your First Program

## Description

Installed Anchor via AVM (Anchor Version Manager) and scaffolded first Anchor program.

**Toolchain:**
- Rust: 1.97.0
- Cargo: 1.97.0
- Anchor: 1.1.2
- Solana CLI: 3.1.15

**Commands Run:**
```bash
cargo install --git https://github.com/solana-foundation/anchor avm --force
avm install latest
avm use latest
anchor init counter
anchor build
```

**Project Structure:**
- Anchor.toml: Project configuration
- programs/counter/src/lib.rs: Program entry point
- tests/: Integration tests
- target/: Compiled artifacts (.so and IDL)
