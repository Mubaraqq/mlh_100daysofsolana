// ==========================================================
// PURE MATH FUNCTION
// ==========================================================
// Returns the new balance, or None if the deposit would overflow u64.
// Using checked_add instead of + means we detect overflow instead of
// letting it silently wrap around to a small number.
pub fn apply_deposit(balance: u64, amount: u64) -> Option<u64> {
    balance.checked_add(amount)
}

// ==========================================================
// PROPERTY TEST MODULE
// ==========================================================
// Only compiled during tests (#[cfg(test)])
#[cfg(test)]
mod tests {
    // Import the function we're testing from the parent module
    use super::apply_deposit;
    // Import proptest macros
    use proptest::prelude::*;

    // The proptest! macro generates random inputs for us
    proptest! {
        // ==========================================================
        // PROPERTY: deposit_never_shrinks_a_balance
        // ==========================================================
        // WHAT: For any two random u64 numbers (balance, amount),
        //       a deposit either grows the balance or refuses honestly.
        // WHY: Proves there is no third option where it silently wraps.
        // ==========================================================
        #[test]
        fn deposit_never_shrinks_a_balance(balance in any::<u64>(), amount in any::<u64>()) {
            // Call apply_deposit with the random values
            match apply_deposit(balance, amount) {
                // If it succeeded, the new balance must be at least the old one
                Some(new_balance) => prop_assert!(new_balance >= balance),

                // If it returned None, the real sum must genuinely overflow
                // (i.e., checked_add on the raw values is also None)
                None => prop_assert!(balance.checked_add(amount).is_none()),
            }
        }
    }
}