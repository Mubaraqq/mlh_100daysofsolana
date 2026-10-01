// ==========================================================
// IMPORTS
// ==========================================================

// Wallet connection hook — discovers wallets, connects, disconnects
import { useWalletConnection } from "@solana/react-hooks";
// Balance hook — reads SOL balance for an address
import { useBalance } from "@solana/react-hooks";
// React state hook
import { useEffect, useState } from "react";
// SOL transfer hook — plain wallet-to-wallet transfers
import { useSolTransfer } from "@solana/react-hooks";
// Generic transaction send hook — sends any instruction through the wallet
import { useSendTransaction } from "@solana/react-hooks";

import {
  appendTransactionMessageInstruction,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  address as toAddress,
  getAddressEncoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
} from "@solana/kit";
import { createWalletTransactionSigner } from "@solana/client";

// Error classifier from Day 89
import { classifyWalletError, type WalletErrorInfo } from "./walletErrors";

// Codama-generated deposit instruction builder.
// The Async version derives the vault PDA from the IDL's seeds automatically.
import { getDepositInstructionAsync } from "../clients/js/src/generated/instructions";

import { getWithdrawInstructionAsync } from "../clients/js/src/generated/instructions";



const rpc = createSolanaRpc("https://api.devnet.solana.com");

function shortAddress(value: string, edge = 4): string {
  if (value.length <= edge * 2 + 3) return value;
  return `${value.slice(0, edge)}…${value.slice(-edge)}`;
}

const VAULT_PROGRAM_ID = toAddress("Ex9Jpn1RF4uUP24anLNrP8XPuTcWF9VPpdftqcQ7dRJX");

// ==========================================================
// COMPONENT
// ==========================================================

export default function App() {
  // --------------------------------------------------------
  // WALLET CONNECTION
  // --------------------------------------------------------
  // connectors: every Wallet Standard wallet detected in the browser
  // connect(id): connect to a specific wallet
  // disconnect(): disconnect the current wallet
  // wallet: the connected wallet object (account.address, signTransaction, etc.)
  // status: "connected" | "connecting" | "disconnected"
  // --------------------------------------------------------
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();

  // --------------------------------------------------------
  // BALANCE
  // --------------------------------------------------------
  // Reads the SOL balance (in lamports) for the connected wallet's address.
  // If wallet is null, address is undefined and lamports stays null.
  // --------------------------------------------------------
  const { lamports } = useBalance(wallet?.account.address);


  // --------------------------------------------------------
  // PLAIN SOL TRANSFER (wallet-to-wallet)
  // --------------------------------------------------------
  const { send, isSending } = useSolTransfer();

  // --------------------------------------------------------
  // GENERIC TRANSACTION SEND (for program instructions)
  // --------------------------------------------------------
  // send(request, options) — compiles instructions into a transaction,
  // detects the connected wallet as the signer, and sends it.
  // request = { instructions: Instruction[], feePayer: Address }
  // --------------------------------------------------------
  const { send: sendTx, isSending: isVaultSending } = useSendTransaction();

  // --------------------------------------------------------
  // LOCAL STATE
  // --------------------------------------------------------
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [sendStatus, setSendStatus] = useState<WalletErrorInfo | null>(null);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [vaultLamports, setVaultLamports] = useState<bigint | null>(null);

  // Wallet address as a display string
  const address = wallet?.account.address.toString();

  useEffect(() => {
  const owner = wallet?.account.address.toString();
  if (!owner) {
    setVaultAddress(null);
    return;
  }

  let cancelled = false;

  (async () => {
    const [pda] = await getProgramDerivedAddress({
      programAddress: VAULT_PROGRAM_ID,
      seeds: [
        getUtf8Encoder().encode("vault"),
        getAddressEncoder().encode(toAddress(owner)),
      ],
    });
    if (!cancelled) setVaultAddress(pda);
  })();

  return () => {
    cancelled = true;
  };
}, [wallet?.account.address]);


async function refreshVaultBalance() {
  if (!vaultAddress) {
    setVaultLamports(null);
    return;
  }
  try {
    const { value } = await rpc.getBalance(toAddress(vaultAddress)).send();
    setVaultLamports(value);
  } catch (error) {
    console.error("Failed to read vault balance", error);
  }
}

useEffect(() => {
  refreshVaultBalance();
}, [vaultAddress]);

  console.log("WALLET DEBUG:", wallet, Object.keys(wallet ?? {}), wallet?.account);


  // ==========================================================
  // handleSend
  // ==========================================================
  // WHAT: Plain wallet-to-wallet SOL transfer.
  // USES: useSolTransfer from @solana/react-hooks.
  // WHY: No program involved. Just moving SOL.
  // ==========================================================
  async function handleSend() {
    setSendStatus(null);
    try {
      const lamports = BigInt(Math.round(parseFloat(amount) * 1_000_000_000));
      const signature = await send({ amount: lamports, destination });
      setSendStatus({
        kind: "success",
        severity: "success",
        title: "Sent",
        message: `Confirmed: ${signature}`,
        retryable: false,
      });
    } catch (error) {
      const info = classifyWalletError(error);
      console.error(`[wallet:${info.kind}]`, error);
      setSendStatus(info);
    }
  }


  // ==========================================================
  // handleDeposit — FIXED
  // ==========================================================
  // WHAT: Calls the vault program's deposit instruction.
  // USES: Codama client + createNoopSigner + useSendTransaction.
  // WHY: The Codama client needs a TransactionSigner to build the instruction
  //      (for PDA derivation and type checking). We give it a noop signer —
  //      a placeholder that holds the address but doesn't sign. The REAL
  //      signature is added by useSendTransaction when it compiles and sends
  //      the transaction through the connected wallet.
  // ==========================================================
  async function handleDeposit() {
  setSendStatus(null);

  try {
    if (!wallet) throw new Error("Connect a wallet first");

    const depositLamports = BigInt(Math.round(parseFloat(amount) * 1_000_000_000));

    // ONE real signer, built from the connected wallet.
    const { signer } = createWalletTransactionSigner(wallet);

    // Same signer object as authority...
    const ix = await getDepositInstructionAsync({
      authority: signer,
      amount: depositLamports,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const message = pipe(
      createTransactionMessage({ version: 0 }),
      // ...and the same signer object as fee payer.
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) => appendTransactionMessageInstruction(ix, m)
    );

    // Phantom signs here.
    const signedTx = await signTransactionMessageWithSigners(message);

    // Send it ourselves.
    await rpc
      .sendTransaction(getBase64EncodedWireTransaction(signedTx), {
        encoding: "base64",
        preflightCommitment: "confirmed",
      })
      .send();

    const signature = getSignatureFromTransaction(signedTx);

    setSendStatus({
      kind: "success",
      severity: "success",
      title: "Deposit submitted",
      message: `Signature: ${signature}`,
      retryable: false,
    });
        setTimeout(refreshVaultBalance, 2500);
  } catch (error) {
    const info = classifyWalletError(error);
    console.error(`[wallet:${info.kind}]`, error);
    setSendStatus(info);
  }
}


async function handleWithdraw() {
  setSendStatus(null);

  try {
    if (!wallet) throw new Error("Connect a wallet first");

    const withdrawLamports = BigInt(Math.round(parseFloat(amount) * 1_000_000_000));

    const { signer } = createWalletTransactionSigner(wallet);

    const ix = await getWithdrawInstructionAsync({
      authority: signer,
      amount: withdrawLamports,
    });

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) => appendTransactionMessageInstruction(ix, m)
    );

    const signedTx = await signTransactionMessageWithSigners(message);

    await rpc
      .sendTransaction(getBase64EncodedWireTransaction(signedTx), {
        encoding: "base64",
        preflightCommitment: "confirmed",
      })
      .send();

    setSendStatus({
      kind: "success",
      severity: "success",
      title: "Withdraw submitted",
      message: `Signature: ${getSignatureFromTransaction(signedTx)}`,
      retryable: false,
    });
        setTimeout(refreshVaultBalance, 2500);
  } catch (error) {
    const info = classifyWalletError(error);
    console.error(`[wallet:${info.kind}]`, error);
    setSendStatus(info);
  }
}

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-bg1 text-foreground">
      <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Solana Wallet
            </h1>
            <p className="mt-1 text-sm text-muted">
              Manage your wallet and vault
            </p>
          </div>

          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              status === "connected"
                ? "border-green-500/20 bg-green-500/10 text-green-400"
                : "border-border-low bg-card text-muted"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === "connected" ? "bg-green-400" : "bg-border-low"
              }`}
            />
            {status === "connected" ? "Connected" : "Disconnected"}
          </div>
        </header>

        {/* Wallet connectors */}
        <section className="mb-6 rounded-2xl border border-border-low bg-card p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Connect wallet</h2>
            <p className="mt-1 text-xs text-muted">
              Choose a wallet to access your account.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {connectors.map((connector) => {
              const isActive =
                status === "connected" && wallet?.connector.id === connector.id;

              return (
                <button
                  key={connector.id}
                  onClick={() => connect(connector.id)}
                  disabled={status === "connecting"}
                  className={`group flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? "border-primary/40 bg-primary/5"
                      : "border-border-low bg-bg1 hover:border-border-low/80 hover:bg-card"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-low bg-card text-xs font-semibold">
                      {connector.name.charAt(0)}
                    </div>

                    <div>
                      <p className="text-sm font-medium">{connector.name}</p>

                      <p className="mt-0.5 text-xs text-muted">
                        {status === "connecting"
                          ? "Connecting..."
                          : isActive
                            ? "Active wallet"
                            : "Connect wallet"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`h-2 w-2 rounded-full ${
                      isActive
                        ? "bg-green-400"
                        : "bg-border-low group-hover:bg-primary"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {wallet && (
          <>
            {/* Account overview */}
            <section className="mb-6 grid gap-4 md:grid-cols-2">
              {/* Wallet */}
              <div className="rounded-2xl border border-border-low bg-card p-5">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      Wallet balance
                    </p>

                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {lamports != null
                        ? `${(Number(lamports) / 1e9).toLocaleString(
                            undefined,
                            {
                              maximumFractionDigits: 4,
                            }
                          )}`
                        : "—"}
                      <span className="ml-2 text-base font-medium text-muted">
                        SOL
                      </span>
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-low bg-bg1">
                    ◎
                  </div>
                </div>

                <div className="rounded-xl border border-border-low bg-bg1 p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">
                    Wallet address
                  </p>

                  <p className="break-all font-mono text-xs leading-5">
                    {address ? shortAddress(address) : ""}
                  </p>
                </div>

                <button
                  onClick={() => disconnect()}
                  className="mt-4 w-full rounded-xl border border-border-low bg-bg1 px-4 py-2.5 text-sm font-medium transition hover:bg-card"
                >
                  Disconnect wallet
                </button>
              </div>

              {/* Vault */}
              <div className="rounded-2xl border border-border-low bg-card p-5">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      Vault balance
                    </p>

                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {vaultLamports != null
                        ? `${(Number(vaultLamports) / 1e9).toLocaleString(
                            undefined,
                            {
                              maximumFractionDigits: 4,
                            }
                          )}`
                        : "—"}
                      <span className="ml-2 text-base font-medium text-muted">
                        SOL
                      </span>
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-low bg-bg1">
                    ◈
                  </div>
                </div>

                <div className="rounded-xl border border-border-low bg-bg1 p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">
                    Vault address
                  </p>

                  <p className="break-all font-mono text-xs leading-5">
                    {vaultAddress
                      ? shortAddress(vaultAddress)
                      : "Loading vault..."}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted">Program vault</span>

                  <span
                    className={`rounded-full px-2.5 py-1 font-medium ${
                      vaultLamports != null && vaultLamports > 0n
                        ? "bg-green-500/10 text-green-400"
                        : "bg-border-low text-muted"
                    }`}
                  >
                    {vaultLamports != null && vaultLamports > 0n
                      ? "Active"
                      : "Not created yet"}
                  </span>
                </div>
              </div>
            </section>

            {/* Transfer */}
            <section className="mb-6 rounded-2xl border border-border-low bg-card p-5">
              <div className="mb-5">
                <h2 className="text-sm font-semibold">Send SOL</h2>

                <p className="mt-1 text-xs text-muted">
                  Transfer SOL directly from your connected wallet.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted">
                    Recipient address
                  </label>

                  <input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Enter Solana address"
                    className="w-full rounded-xl border border-border-low bg-bg1 px-4 py-3 font-mono text-xs outline-none transition placeholder:text-muted/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted">
                    Amount
                  </label>

                  <div className="relative">
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      step="0.0001"
                      min="0"
                      className="w-full rounded-xl border border-border-low bg-bg1 px-4 py-3 pr-14 font-mono text-sm outline-none transition placeholder:text-muted/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
                      SOL
                    </span>
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleSend}
                    disabled={isSending || !destination || !amount}
                    className="w-full rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-bg1 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 lg:w-auto"
                  >
                    {isSending ? "Sending..." : "Send SOL"}
                  </button>
                </div>
              </div>
            </section>

            {/* Vault actions */}
            <section className="mb-6 rounded-2xl border border-border-low bg-card p-5">
              <div className="mb-5">
                <h2 className="text-sm font-semibold">Vault actions</h2>

                <p className="mt-1 text-xs text-muted">
                  Move SOL between your wallet and the program vault.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Deposit */}
                <button
                  onClick={handleDeposit}
                  disabled={isVaultSending || !amount}
                  className="group rounded-2xl border border-border-low bg-bg1 p-5 text-left transition-all hover:border-primary/30 hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-low bg-card text-lg">
                      ↓
                    </div>

                    <span className="text-muted transition group-hover:translate-x-1">
                      →
                    </span>
                  </div>

                  <p className="text-sm font-semibold">
                    {isVaultSending ? "Depositing..." : "Deposit to vault"}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted">
                    Move SOL from your connected wallet into the vault.
                  </p>
                </button>

                {/* Withdraw */}
                <button
                  onClick={handleWithdraw}
                  disabled={isVaultSending || !amount}
                  className="group rounded-2xl border border-border-low bg-bg1 p-5 text-left transition-all hover:border-primary/30 hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-low bg-card text-lg">
                      ↑
                    </div>

                    <span className="text-muted transition group-hover:translate-x-1">
                      →
                    </span>
                  </div>

                  <p className="text-sm font-semibold">Withdraw from vault</p>

                  <p className="mt-1 text-xs leading-5 text-muted">
                    Transfer SOL from the vault back to your wallet.
                  </p>
                </button>
              </div>
            </section>

            {/* Transaction status */}
            {sendStatus && (
              <div
                className={`rounded-2xl border p-4 ${
                  sendStatus.severity === "success"
                    ? "border-green-500/20 bg-green-500/5"
                    : "border-red-500/20 bg-red-500/5"
                }`}
                role="status"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-current" />

                  <div>
                    <p className="text-sm font-semibold">{sendStatus.title}</p>

                    <p className="mt-1 break-all text-xs leading-5 text-muted">
                      {sendStatus.message}
                    </p>

                    {sendStatus.retryable &&
                      sendStatus.severity !== "success" && (
                        <button
                          onClick={handleSend}
                          className="mt-3 text-xs font-semibold underline underline-offset-4"
                        >
                          Try again
                        </button>
                      )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!wallet && (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-border-low bg-card/40">
            <div className="max-w-sm px-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border-low bg-card text-xl">
                ◎
              </div>

              <h2 className="text-base font-semibold">Connect your wallet</h2>

              <p className="mt-2 text-sm leading-6 text-muted">
                Connect a Solana wallet above to view your balance, manage your
                vault and send SOL.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}