// Import Anchor's serialization, instruction, and account metadata traits
use anchor_lang::{AccountSerialize, InstructionData, ToAccountMetas};
// Import LiteSVM — the in-process Solana VM for testing
use litesvm::LiteSVM;
// Import Solana SDK types for building and sending transactions
use solana_sdk::{
    instruction::{Instruction, InstructionError},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::{Transaction, TransactionError},
};

// Import the generated types from your vault program
// accounts: the account structs (like Withdraw)
// instruction: the instruction builders (like Withdraw { amount })
// Vault: the on-chain data struct
use vault::{accounts, instruction, Vault};

// Your program's on-chain address
// This is the same as the declare_id! in lib.rs
const PROGRAM_ID: Pubkey = vault::ID;

// ==========================================================
// HELPER: setup
// ==========================================================
// WHAT: Creates a fresh LiteSVM instance with your program loaded
// RETURNS: (LiteSVM instance, funded payer keypair)
// WHY: Each test starts with a clean slate and a funded wallet
// ==========================================================
fn setup() -> (LiteSVM, Keypair) {
    // Create a new local Solana VM
    let mut svm = LiteSVM::new();

    // Load your compiled program into the VM
    // include_bytes! embeds the .so file at compile time
    svm.add_program(
        PROGRAM_ID,
        include_bytes!("../../../target/deploy/vault.so"),
    )
    .unwrap();

    // Create a payer wallet and fund it with 10 SOL (10,000,000,000 lamports)
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();

    (svm, payer)
}

// ==========================================================
// HELPER: seed_vault
// ==========================================================
// WHAT: Creates a vault account at the canonical PDA with a given balance
// WHY: Each test needs a vault in a known state before attacking it
// RETURNS: The vault's PDA address
// ==========================================================
fn seed_vault(svm: &mut LiteSVM, authority: &Pubkey, balance: u64) -> Pubkey {
    // Derive the vault PDA from "vault" + authority's pubkey
    // Same seeds as in the program
    let (vault_pda, _bump) =
        Pubkey::find_program_address(&[b"vault", authority.as_ref()], &PROGRAM_ID);

    // Serialize the Vault struct into bytes
    // try_serialize writes the 8-byte discriminator AND the borsh data
    let mut data = Vec::new();
    Vault { authority: *authority, balance }
        .try_serialize(&mut data)
        .unwrap();

    // Create the account object with lamports, data, and owner
    let mut account = solana_sdk::account::Account {
        lamports: 1_000_000_000, // 1 SOL for rent and storage
        data,
        owner: PROGRAM_ID,        // Owned by your program
        executable: false,
        rent_epoch: 0,
    };

    // Truncate to exactly 8 bytes discriminator + struct size
    account.data.truncate(8 + std::mem::size_of::<Vault>());

    // Store the account in the VM at the PDA address
    svm.set_account(vault_pda, account).unwrap();

    vault_pda
}

// ==========================================================
// HELPER: assert_custom_error
// ==========================================================
// WHAT: Asserts a transaction failed with a specific custom error code
// WHY: Checking only "it failed" is not enough — we need to prove
//      the RIGHT defense caught the attack
// ==========================================================
fn assert_custom_error(
    result: Result<impl std::fmt::Debug, litesvm::types::FailedTransactionMetadata>,
    expected_code: u32,
) {
    // Expect the transaction to fail
    let failure = result.expect_err("expected this transaction to fail, but it succeeded");

    // Check the error type
    match failure.err {
        // If it's a custom program error, check the code matches
        TransactionError::InstructionError(_, InstructionError::Custom(code)) => {
            assert_eq!(
                code, expected_code,
                "failed for the wrong reason: got code {code}, wanted {expected_code}"
            );
        }
        // If it's any other error, panic — we expected a custom error
        other => panic!("expected a custom program error, got {other:?}"),
    }
}

// ==========================================================
// TEST 1: Wrong Signer
// ==========================================================
// ATTACK: Attacker signs with their own wallet, not the vault owner's
// DEFENSE: seeds constraint derives PDA from signer's key → mismatch → ConstraintSeeds (2006)
// EXPECTED: Transaction fails with error code 2006 (ConstraintSeeds)
// ==========================================================
#[test]
fn attacker_cannot_withdraw_with_wrong_authority() {
    // Set up the VM and load the program
    let (mut svm, _payer) = setup();

    // Create two keypairs: real_owner (owns the vault) and attacker (tries to steal)
    let real_owner = Keypair::new();
    let attacker = Keypair::new();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    // Create a vault owned by real_owner with balance 500
    let vault_pda = seed_vault(&mut svm, &real_owner.pubkey(), 500);

    // Build the withdraw instruction
    // The attacker claims to be the authority (points authority to their own key)
    let ix = Instruction {
        program_id: PROGRAM_ID,
        accounts: accounts::Withdraw {
            vault: vault_pda,
            authority: attacker.pubkey(), // ← WRONG! Should be real_owner
        }
        .to_account_metas(None),
        data: instruction::Withdraw { amount: 500 }.data(),
    };

    // The attacker signs the transaction
    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&attacker.pubkey()),
        &[&attacker],
        svm.latest_blockhash(),
    );

    // Assert: transaction fails with ConstraintSeeds (2006)
    // The PDA is derived from authority.key(), so a different signer
    // derives a different address and the seeds check rejects it
    assert_custom_error(svm.send_transaction(tx), 2006);
}

// ==========================================================
// TEST 2: Look-alike Account
// ==========================================================
// ATTACK: Attacker passes a fake vault account (not the canonical PDA)
// DEFENSE: seeds + bump constraint re-derives and compares → mismatch → ConstraintSeeds (2006)
// EXPECTED: Transaction fails with error code 2006 (ConstraintSeeds)
// ==========================================================
#[test]
fn substituted_account_is_rejected_by_seeds() {
    // Set up the VM and load the program
    let (mut svm, _payer) = setup();

    // Create an owner and fund them
    let owner = Keypair::new();
    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();

    // Create a real vault owned by the owner
    let _real_vault = seed_vault(&mut svm, &owner.pubkey(), 500);

    // Create a decoy account (looks like a vault but is NOT the canonical PDA)
    let decoy = Keypair::new();
    let mut data = Vec::new();
    Vault { authority: owner.pubkey(), balance: 999 }
        .try_serialize(&mut data)
        .unwrap();
    data.truncate(8 + std::mem::size_of::<Vault>());

    // Store the decoy in the VM at a random address (not the PDA)
    svm.set_account(
        decoy.pubkey(),
        solana_sdk::account::Account {
            lamports: 1_000_000_000,
            data,
            owner: PROGRAM_ID,
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();

    // Build the withdraw instruction, but point to the decoy account instead of the real PDA
    let ix = Instruction {
        program_id: PROGRAM_ID,
        accounts: accounts::Withdraw {
            vault: decoy.pubkey(), // ← NOT the canonical PDA!
            authority: owner.pubkey(),
        }
        .to_account_metas(None),
        data: instruction::Withdraw { amount: 999 }.data(),
    };

    // The owner signs (they are legitimate, but the account is wrong)
    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&owner.pubkey()),
        &[&owner],
        svm.latest_blockhash(),
    );

    // Assert: transaction fails with ConstraintSeeds (2006)
    // The passed account is not the PDA derived from the seeds
    assert_custom_error(svm.send_transaction(tx), 2006);
}

// ==========================================================
// TEST 3: Overdraw
// ==========================================================
// ATTACK: Legitimate owner tries to withdraw more than the balance
// DEFENSE: checked_sub prevents underflow → returns InsufficientFunds error (6000)
// EXPECTED: Transaction fails with error code 6000 (VaultError::InsufficientFunds)
// ==========================================================
#[test]
fn overdraw_underflows_safely() {
    // Set up the VM and load the program
    let (mut svm, _payer) = setup();

    // Create an owner and fund them
    let owner = Keypair::new();
    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();

    // Create a vault with balance 100
    let vault_pda = seed_vault(&mut svm, &owner.pubkey(), 100);

    // Build the withdraw instruction with amount 1,000 (more than the 100 balance)
    let ix = Instruction {
        program_id: PROGRAM_ID,
        accounts: accounts::Withdraw {
            vault: vault_pda,
            authority: owner.pubkey(),
        }
        .to_account_metas(None),
        data: instruction::Withdraw { amount: 1_000 }.data(),
    };

    // The owner signs (they are legitimate, just greedy)
    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&owner.pubkey()),
        &[&owner],
        svm.latest_blockhash(),
    );

    // Assert: transaction fails with InsufficientFunds (6000)
    // checked_sub returned None because 100 - 1000 would underflow
    assert_custom_error(svm.send_transaction(tx), 6000);
}