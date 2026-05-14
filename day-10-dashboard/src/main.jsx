// Import Solana kit functions: create RPC connection, specify devnet, validate addresses
import { createSolanaRpc, devnet, address } from "@solana/kit";

// Create connection to Solana devnet (same RPC endpoint from Days 8-9)
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

// Get DOM elements for user interaction and display
const addressInput = document.getElementById("addressInput");
const fetchBtn = document.getElementById("fetchBtn");
const resultsDiv = document.getElementById("results");
const errorDiv = document.getElementById("error");
const loadingDiv = document.getElementById("loading");

// Attach click handler to the Fetch button
fetchBtn.addEventListener("click", async () => {
  // Clear previous results and errors, show loading state
  errorDiv.textContent = "";
  resultsDiv.innerHTML = "";
  loadingDiv.textContent = "Fetching...";

  try {
    // Validate and convert input string to Solana address format
    const targetAddress = address(addressInput.value.trim());

    // --- Fetch balance (logic from Day 8) ---
    const { value: balanceInLamports } = await rpc
      .getBalance(targetAddress)
      .send();
    // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
    const balanceInSol = Number(balanceInLamports) / 1_000_000_000;

    // --- Fetch recent transactions (logic from Day 9) ---
    const signatures = await rpc
      .getSignaturesForAddress(targetAddress, { limit: 5 })
      .send();

    // Build HTML output starting with balance
    let html = `<div class="balance">${balanceInSol} SOL</div>`;
    html += `<h3>Recent transactions</h3>`;

    if (signatures.length === 0) {
      html += `<p>No transactions found for this address.</p>`;
    }

    // Loop through each transaction and format its details
    for (const tx of signatures) {
      // Convert Unix timestamp to human-readable date (or "unknown" if missing)
      const time = tx.blockTime
        ? new Date(Number(tx.blockTime) * 1000).toLocaleString()
        : "unknown";
      // Determine CSS class and text based on transaction success/failure
      const statusClass = tx.err ? "status failed" : "status";
      const statusText = tx.err ? "Failed" : "Success";

      // Append transaction card to HTML
      html += `
        <div class="tx">
          <div><strong>Signature:</strong> ${tx.signature}</div>
          <div><strong>Slot:</strong> ${tx.slot}</div>
          <div><strong>Time:</strong> ${time}</div>
          <div class="${statusClass}"><strong>Status:</strong> ${statusText}</div>
        </div>
      `;
    }

    // Inject built HTML into results container
    resultsDiv.innerHTML = html;
  } catch (err) {
    // Display any errors (invalid address, network issues, etc.)
    errorDiv.textContent = `Error: ${err.message}`;
  } finally {
    // Clear loading indicator regardless of success or failure
    loadingDiv.textContent = "";
  }
});