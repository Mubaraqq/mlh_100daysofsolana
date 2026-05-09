// Import function to create Solana RPC connection and specify devnet network
import { createSolanaRpc, devnet } from "@solana/kit";
// Import function to discover all installed Wallet Standard compatible wallets
import { getWallets } from "@wallet-standard/app";

// Create connection to Solana devnet to query balances
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));
// Get DOM elements for displaying wallet list, connected UI, status, and errors
const walletListDiv = document.getElementById("wallet-list");
const connectedDiv = document.getElementById("connected");
const statusDiv = document.getElementById("status");
const errorDiv = document.getElementById("error");

// Store the currently connected wallet object
let connectedWallet = null;

// Check if a wallet supports Solana by looking at its chains array
function isSolanaWallet(wallet) {
  return wallet.chains?.some((chain) => chain.startsWith("solana:"));
}

// Display all detected Solana wallets as clickable buttons
function renderWalletList(wallets) {
  // Filter only Solana-compatible wallets
  const solanaWallets = wallets.filter(isSolanaWallet);

  // If no Solana wallets found, show installation instructions
  if (solanaWallets.length === 0) {
    walletListDiv.innerHTML = `
      <div class="no-wallets">
        No Solana wallets found.<br>
        Install <a href="https://phantom.app" target="_blank">Phantom</a>
        or another Solana wallet to continue.
      </div>`;
    statusDiv.textContent = "";
    return;
  }

  // Show how many wallets were found
  statusDiv.textContent = `Found ${solanaWallets.length} wallet(s):`;
  walletListDiv.innerHTML = "";

  // Create a button for each wallet with its icon and name
  for (const wallet of solanaWallets) {
    const btn = document.createElement("button");
    btn.className = "wallet-btn";
    const icon = wallet.icon;
    btn.innerHTML = icon
      ? `<img src="${icon}" alt="" /> ${wallet.name}`
      : wallet.name;
    // When clicked, attempt to connect to that wallet
    btn.addEventListener("click", () => connectWallet(wallet));
    walletListDiv.appendChild(btn);
  }
}

// Request connection to a selected wallet
async function connectWallet(wallet) {
  errorDiv.textContent = "";
  // Check if wallet supports the "standard:connect" feature (required for dApp connection)
  const connectFeature = wallet.features["standard:connect"];
  if (!connectFeature) {
    errorDiv.textContent = "This wallet doesn't support connecting.";
    return;
  }

  try {
    statusDiv.textContent = "Requesting connection...";
    // Trigger the wallet's connection popup - user approves or rejects
    const { accounts } = await connectFeature.connect();

    // If no accounts returned, user likely rejected the request
    if (accounts.length === 0) {
      errorDiv.textContent = "No accounts returned. Did you reject the request?";
      statusDiv.textContent = "";
      return;
    }

    // Store connected wallet reference and get the first account (user's public key)
    connectedWallet = wallet;
    const account = accounts[0];
    const address = account.address;

    // Query the blockchain for this address's balance (returns lamports)
    const { value: balanceInLamports } = await rpc.getBalance(address).send();
    // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports), show 9 decimal places
    const balanceInSol = (Number(balanceInLamports) / 1_000_000_000).toFixed(9);

    // Hide wallet list, show connected UI
    walletListDiv.style.display = "none";
    statusDiv.textContent = "";
    connectedDiv.style.display = "block";
    // Display wallet name, address, and balance with a disconnect button
    connectedDiv.innerHTML = `
      <h3>Connected to ${wallet.name}</h3>
      <div class="address">${address}</div>
      <div class="balance">${balanceInSol} SOL</div>
      <button class="disconnect-btn" id="disconnectBtn">Disconnect</button>`;

    // Attach disconnect functionality to the disconnect button
    document
      .getElementById("disconnectBtn")
      .addEventListener("click", () => disconnectWallet(wallet));
  } catch (err) {
    errorDiv.textContent = `Connection failed: ${err.message}`;
    statusDiv.textContent = "";
  }
}

// Disconnect from the currently connected wallet
async function disconnectWallet(wallet) {
  // If wallet supports disconnect feature, call it
  const disconnectFeature = wallet.features["standard:disconnect"];
  if (disconnectFeature) {
    await disconnectFeature.disconnect();
  }
  // Reset UI to show wallet list again
  connectedWallet = null;
  connectedDiv.style.display = "none";
  walletListDiv.style.display = "block";
  statusDiv.textContent = "Disconnected. Choose a wallet to reconnect:";
}

// Get wallets that are already registered and listen for new ones appearing
const { get, on } = getWallets();
// Initial render of discovered wallets
renderWalletList(get());
// If a new wallet extension registers after page load (e.g., user installs one),
// re-render the list as long as no wallet is currently connected
on("register", () => {
  if (!connectedWallet) {
    renderWalletList(get());
  }
});