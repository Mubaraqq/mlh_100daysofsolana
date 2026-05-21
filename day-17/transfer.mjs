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
	sendAndConfirmTransactionFactory,     // Creates a function to send + wait for confirmation
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
// process.argv[0] = "node"                    (the program)
// process.argv[1] = "transfer.mjs"            (your script)
// process.argv[2] = "GrAkKfEpTKQuVHG2Y97..."   (first arg: recipient)
// process.argv[3] = "0.1"                     (second arg: amount)

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
	const rpcSubscriptions = createSolanaRpcSubscriptions(WS_URL);
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

	// Exit if insufficient funds (balance < transfer amount)
	if (balance < transferLamports) {
		console.error(
			`\nInsufficient funds. You need at least ${solAmount} SOL plus a small fee.`
		);
		console.error("Get more devnet SOL at https://faucet.solana.com/");
		process.exit(1);
	}

	// 4. Build the transaction using pipe pattern
	// Get latest blockhash (for replay protection)
	const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

	// Pipe chains operations: create → set fee payer → set blockhash → add instruction
	const transactionMessage = pipe(
		createTransactionMessage({ version: 0 }),                    // Start with empty versioned transaction
		(tx) => setTransactionMessageFeePayerSigner(sender, tx),     // Sender pays fee
		(tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx), // Add blockhash
		(tx) =>
			appendTransactionMessageInstruction(
				getTransferSolInstruction({
					source: sender,                    // From address
					destination: recipientAddress,      // To address
					amount: transferLamports,           // Amount in lamports
				}),
				tx
			)
	);

	// 5. Sign the transaction with the sender's private key
	const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
	// Extract signature (which is also the transaction ID)
	const signature = getSignatureFromTransaction(signedTransaction);

	// 6. Send and confirm
	console.log("\nSending transaction...");
	// Factory creates a function that sends and waits for confirmation
	const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
	await sendAndConfirm(signedTransaction, { commitment: "confirmed" });

	console.log("Transaction confirmed!\n");
	console.log("Signature:", signature);
	console.log(`Explorer:  https://explorer.solana.com/tx/${signature}?cluster=devnet`);

	// 7. Show updated balance after transfer
	const { value: newBalance } = await rpc.getBalance(sender.address).send();
	const newBalanceInSol = Number(newBalance) / Number(LAMPORTS_PER_SOL);
	console.log(`\nNew sender balance: ${newBalanceInSol} SOL`);
}

// Run main with error handling
main().catch((err) => {
	console.error("\nTransfer failed:", err.message);
	process.exit(1);
});