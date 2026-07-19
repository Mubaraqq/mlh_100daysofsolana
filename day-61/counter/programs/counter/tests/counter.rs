// Import Anchor's core types needed for working with accounts and instructions
use anchor_lang::{
    prelude::Pubkey,                 // Represents a Solana public key (address)
    solana_program::system_program,  // The System Program (required for creating accounts)
    AccountDeserialize,              // Trait for deserializing account data
    InstructionData,                 // Trait for building instruction data
    ToAccountMetas,                  // Trait for converting accounts to account metas
};

// LiteSVM = local Solana VM for testing (no devnet required)
use litesvm::LiteSVM;

// Solana types for building transactions
use solana_instruction::Instruction;  // Represents a single instruction
use solana_keypair::Keypair;          // Keypair for signing
use solana_signer::Signer;            // Trait for signers
use solana_transaction::Transaction;  // Represents a transaction

// ==========================================================
// HELPERS
// ==========================================================
// WHY HELPERS?
// 
// Day 59 approach: Each test wrote the same boilerplate code:
//   - Create VM, load program, build instruction, build tx
//   - ~20 lines repeated for every test
//
// Day 60 approach: Helpers extract the boilerplate:
//   - setup_svm_with_program() → creates VM + loads program
//   - build_initialize_tx() → builds initialize transaction
//   - build_increment_tx() → builds increment transaction
//
// Benefits:
//   1. Tests are shorter and focus on WHAT they test
//   2. Less duplication = less chance of bugs
//   3. Changes to transaction building only need to be made in one place
//   4. New tests are easy to add
// ==========================================================

// Sets up a fresh LiteSVM instance and loads your compiled program
// Returns: (LiteSVM instance, program_id)
fn setup_svm_with_program() -> (LiteSVM, Pubkey) {
    // Create a new local Solana VM
    let mut svm = LiteSVM::new();
    
    // Get the program ID from your program (from declare_id! in lib.rs)
    let program_id = counter::ID;
    
    // Path to the compiled program file (.so file from anchor build)
    let so_path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../target/deploy/counter.so");
    
    // Load the program into the VM
    svm.add_program_from_file(program_id, so_path).unwrap();
    
    // Return the VM and program ID
    (svm, program_id)
}

// Builds a signed initialize transaction
// Parameters:
//   svm: reference to LiteSVM (for blockhash)
//   program_id: your program's address
//   authority: the wallet that will own the counter (signs the tx)
//   counter_kp: keypair for the new counter account (signs the tx)
// Returns: a signed Transaction ready to send
fn build_initialize_tx(
    svm: &LiteSVM,
    program_id: Pubkey,
    authority: &Keypair,
    counter_kp: &Keypair,
) -> Transaction {
    // Build the instruction
    let ix = Instruction {
        program_id,  // Which program to call
        accounts: counter::accounts::Initialize {
            // The accounts your initialize instruction needs
            counter: counter_kp.pubkey(),          // New counter account to create
            authority: authority.pubkey(),         // The wallet that will own it
            system_program: system_program::ID,    // System Program (required for account creation)
        }
        .to_account_metas(None),  // Convert accounts to Solana's required format
        data: counter::instruction::Initialize {}.data(),  // Instruction data (empty for initialize)
    };
    
    // Build and sign the transaction
    Transaction::new_signed_with_payer(
        &[ix],                     // The instructions to execute
        Some(&authority.pubkey()), // Who pays for the transaction (authority)
        &[authority, counter_kp],  // Signers (both must sign)
        svm.latest_blockhash(),    // Recent blockhash (prevents replay)
    )
}

// Builds a signed increment transaction
// Parameters:
//   svm: reference to LiteSVM (for blockhash)
//   program_id: your program's address
//   authority: the wallet that must match counter.authority (signs the tx)
//   counter: the public key of the counter account to increment
// Returns: a signed Transaction ready to send
fn build_increment_tx(
    svm: &LiteSVM,
    program_id: Pubkey,
    authority: &Keypair,
    counter: Pubkey,
) -> Transaction {
    // Build the instruction
    let ix = Instruction {
        program_id,  // Which program to call
        accounts: counter::accounts::Increment {
            // The accounts your increment instruction needs
            counter,                         // Existing counter account to modify
            authority: authority.pubkey(),   // The wallet that must match counter.authority
        }
        .to_account_metas(None),  // Convert accounts to Solana's required format
        data: counter::instruction::Increment {}.data(),  // Instruction data (empty for increment)
    };
    
    // Build and sign the transaction
    Transaction::new_signed_with_payer(
        &[ix],                     // The instructions to execute
        Some(&authority.pubkey()), // Who pays for the transaction (authority)
        &[authority],              // Signers (only authority needs to sign)
        svm.latest_blockhash(),    // Recent blockhash (prevents replay)
    )
}

// This is a test function. The #[test] attribute tells Rust to run it during testing.
#[test]
fn initialize_then_increment() {
    // 1. Create a new local Solana VM (LiteSVM)
    // This is like a mini blockchain running on your computer
    let mut svm = LiteSVM::new();

    // 2. Set the program ID from your program (from declare_id! in lib.rs)
    let program_id = counter::ID;

    // 3. Load your compiled program into the VM
    // The path to the compiled program file (.so file from anchor build)
    let so_path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../target/deploy/counter.so");
    svm.add_program_from_file(program_id, so_path).unwrap();

    // 4. Create a fake wallet (authority) and give it 1 SOL
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 1_000_000_000).unwrap();

    // 5. Create a new keypair for the counter account
    // This address will be where the counter data is stored
    let counter_kp = Keypair::new();

    // --- STEP 1: Call initialize instruction ---

    // 6. Build the initialize instruction
    let init_ix = Instruction {
        program_id,  // Which program to call (your counter program)
        accounts: counter::accounts::Initialize {
            // These are the accounts your initialize instruction expects
            counter: counter_kp.pubkey(),          // The counter account to create
            authority: authority.pubkey(),         // The wallet that will own the counter
            system_program: system_program::ID,    // System Program (required for account creation)
        }
        .to_account_metas(None),  // Convert accounts to the format Solana expects
        data: counter::instruction::Initialize {}.data(),  // The instruction data (empty for initialize)
    };

    // 7. Get the latest blockhash (prevents replay attacks)
    let bh = svm.latest_blockhash();

    // 8. Build and sign the transaction
    let tx = Transaction::new_signed_with_payer(
        &[init_ix],                     // The instructions to execute
        Some(&authority.pubkey()),     // Who pays for the transaction
        &[&authority, &counter_kp],    // Signers (authority + counter keypair)
        bh,                            // Recent blockhash
    );

    // 9. Send the transaction to the VM
    // This executes your initialize instruction
    svm.send_transaction(tx).unwrap();

    // --- STEP 2: Call increment instruction ---

    // 10. Build the increment instruction
    let inc_ix = Instruction {
        program_id,  // Same program
        accounts: counter::accounts::Increment {
            // These are the accounts your increment instruction expects
            counter: counter_kp.pubkey(),   // The existing counter account to modify
            authority: authority.pubkey(),  // The wallet that must match counter.authority
        }
        .to_account_metas(None),  // Convert accounts to the format Solana expects
        data: counter::instruction::Increment {}.data(),  // The instruction data (empty for increment)
    };

    // 11. Get the latest blockhash again (for the second transaction)
    let bh = svm.latest_blockhash();

    // 12. Build and sign the second transaction
    let tx = Transaction::new_signed_with_payer(
        &[inc_ix],                         // The instructions to execute
        Some(&authority.pubkey()),         // Who pays for the transaction
        &[&authority],                     // Signers (only authority this time)
        bh,                                // Recent blockhash
    );

    // 13. Send the second transaction to the VM
    svm.send_transaction(tx).unwrap();

    // --- STEP 3: Read and verify the counter ---

    // 14. Fetch the counter account from the VM
    let account = svm.get_account(&counter_kp.pubkey()).unwrap();

    // 15. Deserialize the raw bytes into a Counter struct
    let parsed = counter::Counter::try_deserialize(&mut account.data.as_slice()).unwrap();

    // 16. Assert the state is what we expect
    assert_eq!(parsed.count, 1);                      // count should be 1 (was 0, incremented once)
    assert_eq!(parsed.authority, authority.pubkey()); // authority should still be the original payer
}

// ==========================================================
// TEST: increment fails when wrong authority signs
// ==========================================================
// WHAT: Tests that has_one = authority prevents unauthorized access
// SCENARIO:
//   1. authority_a creates the counter (succeeds)
//   2. authority_b tries to increment it (fails)
// EXPECTED: Transaction fails because authority_b != counter.authority
// ==========================================================
#[test]
fn increment_fails_when_wrong_authority_signs() {
    // 1. Set up the VM and load the program
    let (mut svm, program_id) = setup_svm_with_program();

    // 2. Create two different authorities
    let authority_a = Keypair::new();  // The real owner
    let authority_b = Keypair::new();  // The imposter
    svm.airdrop(&authority_a.pubkey(), 1_000_000_000).unwrap();
    svm.airdrop(&authority_b.pubkey(), 1_000_000_000).unwrap();

    // 3. Create a keypair for the counter account
    let counter = Keypair::new();

    // 4. authority_a creates the counter (should succeed)
    let init_tx = build_initialize_tx(
        &svm,
        program_id,
        &authority_a,
        &counter,
    );
    svm.send_transaction(init_tx).expect("initialize should succeed");

    // 5. authority_b tries to increment it (should fail)
    let bad_tx = build_increment_tx(
        &svm,
        program_id,
        &authority_b,
        counter.pubkey(),
    );

    let result = svm.send_transaction(bad_tx);
    
    // 6. The transaction should fail
    assert!(
        result.is_err(),
        "increment should fail when signed by the wrong authority"
    );
}

// ==========================================================
// TEST: initialize fails when counter already exists
// ==========================================================
// WHAT: Tests that init constraint prevents overwriting existing accounts
// SCENARIO:
//   1. Create a counter (succeeds)
//   2. Try to create another counter at the SAME address (fails)
// EXPECTED: Transaction fails because account already exists
// ==========================================================
#[test]
fn initialize_fails_when_counter_already_exists() {
    // 1. Set up the VM and load the program
    let (mut svm, program_id) = setup_svm_with_program();

    // 2. Create an authority and fund it
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 1_000_000_000).unwrap();

    // 3. Create a keypair for the counter account
    let counter = Keypair::new();

    // 4. First initialize succeeds
    let first_tx = build_initialize_tx(
        &svm,
        program_id,
        &authority,
        &counter,
    );
    svm.send_transaction(first_tx).expect("first initialize should succeed");

    // 5. Advance the blockhash so the second transaction is not a duplicate
    // Without this, both transactions would be identical (same instruction, same payer, same blockhash)
    // LiteSVM would reject the duplicate signature before your program even runs
    svm.expire_blockhash();

    // 6. Second initialize with the SAME counter keypair fails
    let second_tx = build_initialize_tx(
        &svm,
        program_id,
        &authority,
        &counter,
    );

    let result = svm.send_transaction(second_tx);
    
    // 7. The transaction should fail
    assert!(
        result.is_err(),
        "initializing the same counter twice should fail"
    );
}

