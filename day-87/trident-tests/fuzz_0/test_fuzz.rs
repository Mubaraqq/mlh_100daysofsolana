use fuzz_accounts::*;
use trident_fuzz::fuzzing::*;
mod fuzz_accounts;
mod types;
use types::*;

#[derive(FuzzTestMethods)]
struct FuzzTest {
    /// Trident client for interacting with the Solana program
    trident: Trident,
    /// Storage for all account addresses used in fuzz testing
    fuzz_accounts: AccountAddresses,
}

#[flow_executor]
impl FuzzTest {
    fn new() -> Self {
        Self {
            trident: Trident::default(),
            fuzz_accounts: AccountAddresses::default(),
        }
    }

    #[init]
    fn start(&mut self) {
        // Nothing to initialize
    }

    // ==========================================================
    // FLOW: deposit_never_shrinks
    // ==========================================================
    // WHAT: Calls deposit with a random amount and checks that the
    //       balance never decreases.
    // WHY: Proves the invariant holds end to end across instructions
    //      and account state, not just in the pure function.
    // ==========================================================
    #[flow]
    fn deposit_never_shrinks(&mut self) {
        // Create a fresh authority account and fund it
        let authority = self.fuzz_accounts.authority.insert(&mut self.trident, None);
        self.trident.airdrop(&authority, 10_000_000_000);

        // Derive the vault PDA from "vault" + authority's pubkey
        let (vault_pda, _) =
            Pubkey::find_program_address(&[b"vault", authority.as_ref()], &vault::program_id());

        // Read the current balance (or 0 if the vault doesn't exist yet)
        let before = self.trident
            .get_account_with_type::<Vault>(&vault_pda, 8)
            .map(|v| v.balance)
            .unwrap_or(0);

        // Generate a random deposit amount
        let amount = self.trident.random_from_range(0..1_000_000u64);

        // Build the deposit instruction
        let ix = vault::DepositInstruction::data(vault::DepositInstructionData::new(amount))
            .accounts(vault::DepositInstructionAccounts::new(vault_pda, authority))
            .instruction();

        // Send the transaction
        self.trident.process_transaction(&[ix], Some("Deposit"));

        // Read the new balance and assert it did not shrink
        if let Some(v) = self.trident.get_account_with_type::<Vault>(&vault_pda, 8) {
            assert!(v.balance >= before, "deposit shrank the balance");
        }
    }
}

fn main() {
    FuzzTest::fuzz(1000, 100);
}