// Import file system and path utilities to read keypair from disk
// readFile: Reads files from disk (like your wallet.json from Day 2)
//          Returns a Promise, used with await
import { readFile } from "node:fs/promises";

// resolve: Joins file paths correctly for any OS
//          Windows: C:\Users\hp\.config\solana\id.json
//          Linux:   /home/mubaraqabba/.config/solana/id.json
import { resolve } from "node:path";

// homedir: Returns the current user's home directory
//          Windows: C:\Users\hp
//          Linux:   /home/mubaraqabba
import { homedir } from "node:os";


// Import Solana SDK functions
import {
	address,                              // Validates and converts string to Solana address format
	createKeyPairSignerFromBytes,         // Recreates a signer from secret key bytes (like Day 2)
	createSolanaRpc,                      // Creates HTTP connection to Solana node
	createSolanaRpcSubscriptions,         // Creates WebSocket connection for transaction confirmation
	pipe,                                 // Function chaining utility (like lodash pipe)
	createTransactionMessage,             // Creates empty transaction message
	setTransactionMessageFeePayerSigner,  // Sets who pays the transaction fee
	setTransactionMessageLifetimeUsingBlockhash, // Adds blockhash (replay protection)
	appendTransactionMessageInstruction,  // Adds instruction to transaction
	signTransactionMessageWithSigners,    // Signs with all required signers
	getSignatureFromTransaction,          // Extracts signature from signed transaction
	getBase64EncodedWireTransaction,     // NEW: converts signed tx to base64 for sending
	lamports,                             // Converts SOL to lamports (BigInt)
	devnet,                               // Devnet network configuration
} from "@solana/kit";

// Import transfer instruction builder for System Program
// getTransferSolInstruction: A function that builds a "transfer SOL" instruction
// It returns an instruction object that tells the System Program to move lamports
import { getTransferSolInstruction } from "@solana-program/system";

// --- Configuration ---
const RPC_URL = devnet("https://api.devnet.solana.com");        // HTTP endpoint for queries
const WS_URL = devnet("wss://api.devnet.solana.com");           // WebSocket for real-time updates
const LAMPORTS_PER_SOL = 1_000_000_000n;                        // 1 SOL = 1B lamports (BigInt)

// --- Parse command-line arguments ---
// process.argv: Array of command-line arguments
// Example: node transfer.mjs GrAkKfEpTKQuVHG2Y97Y2FF4i7y7Q5AHLK94JBy7Y5yv 0.1
//
// process.argv[0] = "node"                                  (the program)
// process.argv[1] = "transfer_confirmation_UI.mjs"          (your script)
// process.argv[2] = "GrAkKfEpTKQuVHG2Y97..."                (first arg: recipient)
// process.argv[3] = "0.1"                                   (second arg: amount)

const args = process.argv.slice(2);  // Keeps only [2] and [3]
// args = ["GrAkKfEpTKQuVHG2Y97...", "0.1"]

if (args.length < 2) {  // Need exactly 2 arguments
	console.error("Usage: node transfer.mjs <RECIPIENT_ADDRESS> <AMOUNT_IN_SOL>");
	console.error("Example: node transfer.mjs GrAkKfEpTKQuVHG2Y97Y2FF4i7y7Q5AHLK94JBy7Y5yv 0.1");
	process.exit(1);  // Exit with error code 1
}

// Validate and parse inputs
//
// args[0] = "GrAkKfEpTKQuVHG2Y97Y2FF4i7y7Q5AHLK94JBy7Y5yv" (string)
// address() validates the string format and converts to Solana's internal address type
// Throws error if invalid (wrong length, bad characters, etc.)
const recipientAddress = address(args[0]);

// args[1] = "0.1" (string)
// parseFloat() converts "0.1" → 0.1 (number)
const solAmount = parseFloat(args[1]);

if (isNaN(solAmount) || solAmount <= 0) {
	console.error("Error: Amount must be a positive number.");
	process.exit(1);
}

// Convert SOL to lamports (BigInt for precision)
const transferLamports = lamports(BigInt(Math.round(solAmount * Number(LAMPORTS_PER_SOL))));

// Order of commitment levels from lowest (least confidence) to highest (most confidence)
// processed: Validator included tx in a block (1 validator saw it)
// confirmed: 66%+ of validators voted on the block (network agrees)
// finalized: 31+ blocks built on top (irreversible)
const COMMITMENT_LEVELS = ["processed", "confirmed", "finalized"];
// Polls the network every 500ms until transaction reaches target commitment level
// Throws error if transaction fails on-chain
async function waitForCommitment(rpc, signature, targetCommitment) {
	// Get numeric index of target level (e.g., "confirmed" = 1)
	const targetIndex = COMMITMENT_LEVELS.indexOf(targetCommitment);

	while (true) {
		// Fetch current status of this transaction
		const { value } = await rpc
			.getSignatureStatuses([signature], { searchTransactionHistory: true })
			.send();

		const status = value[0];

		// If transaction failed, throw error with details
		if (status?.err) {
			throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.err)}`);
		}

		// If we have a status, check if we've reached target commitment
		if (status) {
			const currentIndex = COMMITMENT_LEVELS.indexOf(status.confirmationStatus);
			// Exit loop if current level >= target level
			if (currentIndex >= targetIndex) break;
		}

		// Not reached target yet, wait 500ms before checking again
		await new Promise((r) => setTimeout(r, 500));
	}
}

// Builds, sends, and tracks a SOL transfer with real-time status updates
async function transferWithConfirmation(rpc, signer, toAddress, amountInSOL) {
	// Convert recipient string to Solana address format
	const destination = address(toAddress);
	
	// Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
	const lamportAmount = lamports(BigInt(Math.round(amountInSOL * 1_000_000_000)));

	// Get current blockhash (expires ~60-90 sec, prevents replay attacks)
	const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

	// Build transaction using pipe pattern
	const transactionMessage = pipe(
		createTransactionMessage({ version: 0 }),
		(tx) => setTransactionMessageFeePayerSigner(signer, tx),
		(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
		(tx) => appendTransactionMessageInstruction(
			getTransferSolInstruction({
				source: signer,
				destination,
				amount: lamportAmount,
			}),
			tx
		)
	);

	// Sign with sender's private key
	const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
	const signature = getSignatureFromTransaction(signedTransaction);
	const wireTransaction = getBase64EncodedWireTransaction(signedTransaction);

	console.log(`\nSending ${amountInSOL} SOL to ${toAddress}...\n`);

	// Send
	statusUpdate("Status: Sending transaction...");
	await rpc.sendTransaction(wireTransaction, { encoding: "base64" }).send();

	statusUpdate("Status: Processed (included in a block)...");

	// Wait for confirmed
	await waitForCommitment(rpc, signature, "confirmed");
	statusUpdate("Status: Confirmed (supermajority voted)...");

	// Wait for finalized
	await waitForCommitment(rpc, signature, "finalized");
	statusUpdate("Status: Finalized (irreversible)");

	console.log("\n");

	return signature;
}

// This overwrites the current terminal line instead of printing a new one each time, giving you a clean progress indicator.
function statusUpdate(message) {
	process.stdout.clearLine(0);  // Clear current line
	process.stdout.cursorTo(0);   // Move cursor to start
	process.stdout.write(message); // Write new status
}

// --- Load your keypair from the default Solana CLI location ---
async function loadKeypair() {
	// Path: ~/.config/solana/id.json (same file solana-keygen uses)
	const keypairPath = resolve(homedir(), ".config", "solana", "id.json");
	// Read the JSON file (array of 64 numbers)
	const secretKeyJson = await readFile(keypairPath, "utf-8");
	// Parse JSON and convert to Uint8Array (binary format)
	const secretKeyBytes = new Uint8Array(JSON.parse(secretKeyJson));
	// Create a signer object from the bytes (same as Day 2 persistent wallet)
	const keyPair = await createKeyPairSignerFromBytes(secretKeyBytes);
	return keyPair;
}

// --- Main function ---
async function main() {
	console.log("Solana Transfer Tool");
	console.log("====================\n");

	// 1. Connect to devnet (HTTP + WebSocket)
	const rpc = createSolanaRpc(RPC_URL);
	console.log("Connected to Solana devnet.\n");

	// 2. Load the sender keypair from CLI config
	const sender = await loadKeypair();
	console.log("Sender:", sender.address);
	console.log("Recipient:", recipientAddress.toString());
	console.log("Amount:", solAmount, "SOL\n");

	// 3. Check the sender's balance BEFORE sending (avoid paying fee on failed tx)
	const { value: balance } = await rpc.getBalance(sender.address).send();
	const balanceInSol = Number(balance) / Number(LAMPORTS_PER_SOL);
	console.log(`Sender balance: ${balanceInSol} SOL`);

	// Convert SOL to lamports for comparison
	const transferLamportsCheck = lamports(BigInt(Math.round(solAmount * Number(LAMPORTS_PER_SOL))));

	// Exit if insufficient funds
	if (balance < transferLamportsCheck) {
		console.error(
			`\nInsufficient funds. You need at least ${solAmount} SOL plus a small fee.`
		);
		console.error("Get more devnet SOL at https://faucet.solana.com/");
		process.exit(1);
	}

	// 4. Send with confirmation tracking
	try {
		const signature = await transferWithConfirmation(
			rpc, 
			sender, 
			recipientAddress, 
			solAmount
		);
		
		console.log("\n✅ Transaction successful!");
		console.log(`Signature: ${signature}`);
		console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
		
		// Show updated balance
		const { value: newBalance } = await rpc.getBalance(sender.address).send();
		const newBalanceInSol = Number(newBalance) / Number(LAMPORTS_PER_SOL);
		console.log(`\nNew sender balance: ${newBalanceInSol} SOL`);
		
	} catch (error) {
		console.error("\n❌ Transaction failed:", error.message);
		process.exit(1);
	}
}

// Run main with error handling
main().catch((err) => {
	console.error("\nTransfer failed:", err.message);
	process.exit(1);
});