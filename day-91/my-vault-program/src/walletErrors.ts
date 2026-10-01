// Import Solana error helpers from @solana/kit
// isSolanaError: checks if an error is a Solana error with a specific code
// SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED: the error code for expired blockhash
import {
  isSolanaError,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
} from "@solana/kit";

// The shape of what classifyWalletError returns
// This is what the UI will use to render a message
export type WalletErrorInfo = {
  kind: string;                                    // Machine-readable category
  title: string;                                   // Short headline for the screen
  message: string;                                 // Longer explanation for the user
  retryable: boolean;                              // Can the user try again?
  severity: "info" | "warning" | "error" | "success"; // How to style it
};

// ==========================================================
// classifyWalletError
// ==========================================================
// WHAT: Takes any error thrown during a send and returns a classified object
// WHY: Raw errors are ugly. The UI needs something human-readable.
// HOW: Checks the error against known patterns and returns the matching category
// ==========================================================
export function classifyWalletError(error: unknown): WalletErrorInfo {
  // 1. User closed the wallet popup or clicked "Cancel".
  //    This is a choice, not a failure. Treat it gently.
  if (isUserRejection(error)) {
    return {
      kind: "user-rejected",
      title: "Transaction cancelled",
      message: "You closed the wallet before approving. Nothing was sent.",
      retryable: true,
      severity: "info",
    };
  }

  // 2. Blockhash expired before the transaction confirmed.
  //    @solana/kit has a specific error code for this.
  if (
    unwrap(error).some((e) =>
      isSolanaError(e, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED)
    )
  ) {
    return {
      kind: "blockhash-expired",
      title: "Transaction expired",
      message:
        "It took too long to confirm. Try again to send it with a fresh blockhash.",
      retryable: true,
      severity: "warning",
    };
  }

  // 3. Wallet signed, but the account cannot cover amount + fee.
  if (/insufficient (lamports|funds)/i.test(messageOf(error))) {
    return {
      kind: "insufficient-funds",
      title: "Not enough SOL",
      message:
        "This account does not have enough SOL to cover the amount plus the network fee.",
      retryable: false,
      severity: "error",
    };
  }

  // 4. Blockhash not found — sometimes reported differently than BLOCK_HEIGHT_EXCEEDED
  if (/blockhash not found/i.test(messageOf(error))) {
    return {
      kind: "blockhash-not-found",
      title: "Transaction expired",
      message: "The transaction expired before it could be sent. Try again.",
      retryable: true,
      severity: "warning",
    };
  }

  // 5. Custom program error #1 — usually insufficient funds from the System Program
  if (/custom program error: #1\b/i.test(messageOf(error))) {
    return {
      kind: "insufficient-funds",
      title: "Not enough SOL",
      message:
        "This account does not have enough SOL to cover the amount plus the network fee.",
      retryable: false,
      severity: "error",
    };
  }

  // 6. Wallet is disconnected or locked mid-flow.
  //    Match on messages like "not connected", "disconnected", or "no authority".
  if (
    /not connected|disconnected|no .* account|connect a wallet|supply an .*authority/i.test(
      messageOf(error)
    )
  ) {
    return {
      kind: "wallet-disconnected",
      title: "Wallet disconnected",
      message: "Reconnect your wallet and try again.",
      retryable: true,
      severity: "warning",
    };
  }

  // 7. Anything we did not anticipate.
  //    Log the real thing for the developer, show a calm line for the user.
  return {
    kind: "unknown",
    title: "Something went wrong",
    message:
      messageOf(error) || "An unexpected error occurred. Please try again.",
    retryable: true,
    severity: "error",
  };
}

// ==========================================================
// isUserRejection
// ==========================================================
// WHAT: Detects whether the error was the user closing the wallet
// WHY: Wallets report this inconsistently. Some use code 4001, some use text.
// HOW: Match on multiple signals (code and message)
// ==========================================================
function isUserRejection(error: unknown): boolean {
  // Some wallets set code 4001 (a convention from browser wallet providers)
  if (unwrap(error).some((e) => (e as { code?: number })?.code === 4001)) return true;

  // Some wallets only put the reason in the message
  return /(user rejected|user denied|rejected the request|cancell?ed)/i.test(
    messageOf(error),
  );
}

// ==========================================================
// messageOf
// ==========================================================
// WHAT: Extracts the message string from any error shape
// WHY: Errors can be strings, objects with .message, or nested
// HOW: Unwraps the error chain and joins all message strings with " | "
// ==========================================================
function messageOf(error: unknown): string {
  return unwrap(error)
    .map((e) => (typeof e === "string" ? e : (e as { message?: string })?.message ?? ""))
    .filter(Boolean)
    .join(" | ");
}

// ==========================================================
// unwrap
// ==========================================================
// WHAT: Walks the error's .cause chain to find the real error
// WHY: @solana/kit wraps the real failure in a parent error
// HOW: Follows .cause until there's no more or we've seen it
// ==========================================================
function unwrap(error: unknown): unknown[] {
  const chain: unknown[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current != null && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = typeof current === "object" ? (current as { cause?: unknown }).cause : undefined;
  }
  return chain;
}