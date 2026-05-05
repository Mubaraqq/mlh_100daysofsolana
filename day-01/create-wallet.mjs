// Import all required functions from @solana/kit
import {
  generateKeyPairSigner,  // Creates a new wallet (keypair) that can sign transactions
  createSolanaRpc,        // Establishes a connection to a Solana network node
  devnet,                 // Specifies we want to use Solana's test network (not real money)
} from "@solana/kit";

// Create a connection to Solana devnet using a public RPC endpoint
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

// Generate a brand new random wallet (creates a new address each time you run this)
const wallet = await generateKeyPairSigner();

// Print the wallet address so you can copy it to the faucet website
console.log("Wallet address:", wallet.address);

// Instructions telling user to go get free test SOL from faucet
console.log("\n--- Go to https://faucet.solana.com/ and airdrop SOL to this address ---");
console.log("--- Then run this script again with the same address to check the balance ---\n");

// Commented instruction for checking a previously funded address (Day 1 workaround)
// To check a balance of a wallet you already funded, replace wallet.address with your actual address string
// const { value: balance } = await rpc.getBalance(address("YOUR_ADDRESS_HERE")).send();

// Get the balance of the newly generated wallet (will be 0 until funded)
const { value: balance } = await rpc.getBalance("9XnL5nVJ3gwNfsTySPVHNuHpoxqogGTEPEBtoZtwZ8j4").send();

// Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
const balanceInSol = Number(balance) / 1_000_000_000;

// Print the balance
console.log(`Balance: ${balanceInSol} SOL`);