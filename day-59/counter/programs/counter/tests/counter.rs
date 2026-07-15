// Import Anchor's core types needed for working with accounts and instructions
use anchor_lang::{
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