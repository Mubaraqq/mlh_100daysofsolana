// Import the System Program ID
use anchor_lang::solana_program::system_program;
// Import Anchor's Discriminator and InstructionData traits
// Discriminator: gets the 8-byte prefix Anchor adds to account data
// InstructionData: builds instruction data from typed structs
use anchor_lang::{Discriminator, InstructionData};
// Import LiteSVM — the in-process Solana VM
use litesvm::LiteSVM;
// Import Solana SDK types for building and sending transactions
use solana_sdk::{
    account::Account,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};

// Import the Config struct from our program
use leaky_vault::Config;

// ==========================================================
// HELPER: setup
// ==========================================================
// WHAT: Creates a LiteSVM instance with the compiled program loaded
// RETURNS: A LiteSVM instance ready to run transactions
// ==========================================================
fn setup() -> LiteSVM {
    let mut svm = LiteSVM::new();
    // Load the compiled .so file at compile time
    svm.add_program(
        leaky_vault::ID,
        include_bytes!("../../../target/deploy/leaky_vault.so"),
    )
    .unwrap();
    svm
}

// ==========================================================
// TEST: attack_drains_vault
// ==========================================================
// WHAT: Simulates an attacker forging a Config account
// EXPECTED (on vulnerable build): The attack SUCCEEDS
// WHY: The program never checks the owner of the Config account
// ==========================================================
#[test]
fn attack_drains_vault() {
    let mut svm = setup();

    // Create an attacker keypair and fund it with 1 SOL
    let attacker = Keypair::new();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    // ==========================================================
    // FORGE THE CONFIG ACCOUNT
    // ==========================================================
    // Build fake account data that looks like a real Config
    let mut forged_data = Vec::new();

    // 8 bytes: the discriminator Anchor uses to identify a Config account
    // Config::DISCRIMINATOR is public, so anyone can prepend the same bytes
    forged_data.extend_from_slice(Config::DISCRIMINATOR);

    // 32 bytes: the admin pubkey
    // Set it to the ATTACKER's pubkey, so the check inside withdraw passes
    forged_data.extend_from_slice(attacker.pubkey().as_ref());

    // Create an account at a random address owned by the SYSTEM PROGRAM
    // (NOT the leaky_vault program). This is the key: a real Config
    // account would be owned by leaky_vault, but this forgery is not.
    let fake_config = Pubkey::new_unique();
    svm.set_account(
        fake_config,
        Account {
            lamports: 1_000_000,
            data: forged_data,
            owner: system_program::ID,  // ← NOT the vault program
            executable: false,
            rent_epoch: 0,
        },
    )
    .unwrap();

    // ==========================================================
    // BUILD THE WITHDRAW INSTRUCTION
    // ==========================================================
    // Pass the forged config and the attacker as signer
    let ix = Instruction {
        program_id: leaky_vault::ID,
        accounts: vec![
            // The forged config account (read-only, not signer)
            AccountMeta::new_readonly(fake_config, false),
            // The attacker as signer (writable because they pay the fee)
            AccountMeta::new(attacker.pubkey(), true),
        ],
        // The withdraw instruction data (with _amount: 0)
        data: leaky_vault::instruction::Withdraw { _amount: 0 }.data(),
    };

    // Build and sign the transaction
    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&attacker.pubkey()),   // Attacker pays the fee
        &[&attacker],              // Attacker signs
        svm.latest_blockhash(),
    );

    // ==========================================================
    // FIRE THE ATTACK
    // ==========================================================
    // On the vulnerable build, this SUCCEEDS. That green result is the theft.
    let result = svm.send_transaction(tx);
    //assert!(result.is_ok(), "exploit failed to reproduce");
    println!("Result: {:?}", result);
    assert!(result.is_err(), "owner check should reject the forgery");
}