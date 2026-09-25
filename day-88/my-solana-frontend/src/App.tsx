// Import the wallet connection hook from Solana's React hooks library
// This hook discovers installed wallets, connects to one, disconnects, and returns the current state
import { useWalletConnection } from "@solana/react-hooks";
// Import the balance hook — reads the SOL balance of an address
import { useBalance } from '@solana/react-hooks';
// Import useState from React — needed for the recipient input field
import { useState } from 'react';
// Import the SOL transfer hook — sends SOL to a recipient
import { useSolTransfer } from '@solana/react-hooks';


export default function App() {
  // useWalletConnection returns:
  //   connectors: array of every Wallet Standard wallet detected in the browser
  //   connect: function to connect to a wallet by its id
  //   disconnect: function to disconnect the current wallet
  //   wallet: the currently connected wallet object (has .account.address and .connector)
  //   status: "connected" | "connecting" | "disconnected"
  const { connectors, connect, disconnect, wallet, status } =
    useWalletConnection();
  
  // useBalance reads the SOL balance (in lamports) for the given address
  // If wallet is null, the address is undefined and lamports stays null
  const { lamports } = useBalance(wallet?.account.address);

  // useSolTransfer returns:
  //   send: function to send SOL ({ amount, destination })
  //   isSending: boolean that's true while the transaction is in flight
  const { send, isSending } = useSolTransfer();

  // Local state for the recipient address input field
  const [destination, setDestination] = useState("");
    

  // Convert the connected wallet's address to a string for display
  const address = wallet?.account.address.toString();

  return (
    // Page container — full height, dark theme, horizontal overflow clipped
    <div className="relative min-h-screen overflow-x-clip bg-bg1 text-foreground">
      {/* Main content area — centered, with a border and padding */}
      <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-10 border-x border-border-low px-6 py-16">
        {/* Wallet connection panel */}
        <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
          {/* Panel header — title and connection status badge */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold">Wallet connection</p>
              <p className="text-sm text-muted">
                Pick any discovered connector and manage connect / disconnect in
                one spot.
              </p>
            </div>
            {/* Status badge — green when connected, plain when not */}
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
              {status === "connected" ? "Connected" : "Not connected"}
            </span>
          </div>

          {/* Wallet grid — one button per detected wallet */}
          <div className="grid gap-3 sm:grid-cols-2">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect(connector.id)}
                disabled={status === "connecting"}
                className="group flex items-center justify-between rounded-xl border border-border-low bg-card px-4 py-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex flex-col">
                  {/* Wallet name (Phantom, Solflare, etc.) */}
                  <span className="text-base">{connector.name}</span>
                  {/* Sub-text — "Tap to connect", "Active", or "Connecting…" */}
                  <span className="text-xs text-muted">
                    {status === "connecting"
                      ? "Connecting…"
                      : status === "connected" &&
                          wallet?.connector.id === connector.id
                        ? "Active"
                        : "Tap to connect"}
                  </span>
                </span>
                {/* Small dot indicator that lights up on hover */}
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full bg-border-low transition group-hover:bg-primary/80"
                />
              </button>
            ))}
          </div>

          {/* Footer row — address, balance, disconnect button */}
          <div className="flex flex-col gap-3 border-t border-border-low pt-4 text-sm">
            {/* Address on top */}
            <span className="rounded-lg border border-border-low bg-cream px-3 py-2 font-mono text-xs w-fit">
              {address ?? "No wallet connected"}
            </span>

            {/* Balance below the address */}
            <span className="font-mono text-xs text-muted">
              Balance:{" "}
              {lamports != null ? `${Number(lamports) / 1e9} SOL` : "—"}
            </span>

            {/* Disconnect button */}
            <button
              onClick={() => disconnect()}
              disabled={status !== "connected"}
              className="inline-flex items-center gap-2 rounded-lg border border-border-low bg-card px-3 py-2 font-medium transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 w-fit"
            >
              Disconnect
            </button>
          </div>

          {/* Send flow — recipient input + send button */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            {/* Recipient address input */}
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Recipient address"
              className="rounded-lg border border-border-low bg-cream px-3 py-2 font-mono text-xs"
            />
            {/* Send button — disabled while sending or if no destination */}
            <button
              onClick={() => send({ amount: 1_000_000n, destination })}
              disabled={isSending || !destination}
              className="rounded-lg border border-border-low bg-card px-3 py-2 font-medium"
            >
              {isSending ? "Sending…" : "Send 0.001 SOL"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}