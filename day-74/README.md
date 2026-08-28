# Day 74: Make One of Your Programs Call the Other

## Description

Built two programs in one workspace: compose-lab (caller) and counter (callee). The caller program calls the counter's increment instruction via CPI.

## How It Works

1. The counter program creates a Tally account with count = 0
2. The compose-lab program calls counter's increment via CPI
3. The counter's increment executes and count becomes 1

## Key Insight

The test never calls increment directly. It calls bump on compose-lab, which makes a CPI to counter's increment.

## Test Result

counter value set by the caller: 1
✔ the caller bumps the counter through a CPI

## Key Learnings

- anchor new counter adds a second program to an existing workspace
- declare_program!(counter) reads the IDL and generates CPI bindings
- IDL is copied from target/idl/counter.json to idls/ folder
- One program can call another via CPI using the generated bindings
- Programs are composable building blocks
