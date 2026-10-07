import { address } from "@solana/kit";

// Deny by default: only addresses in this set can ever receive funds.
const ALLOWED_RECIPIENTS = new Set([
  "2fUvoSyN1h6zeRCijinqwP2MhbmwYYDMuYNXKBhNeLkf",
]);

// 1 SOL = 1_000_000_000 lamports
const LAMPORTS_PER_SOL = 1_000_000_000n;

const MAX_LAMPORTS_PER_TRANSFER = 100_000_000n;  // 0.1 SOL per transfer
const MAX_LAMPORTS_PER_SESSION = 250_000_000n;   // 0.25 SOL total per run

let sessionSpent = 0n;

// Returns { allowed, reason }. Deny by default: every rule is a reason to say no.
export function checkTransferPolicy(recipient, lamports) {
  // Rule 1: valid base58 address
  let recipientKey;
  try {
    recipientKey = address(recipient);
  } catch {
    return {
      allowed: false,
      reason: `"${recipient}" is not a valid Solana address.`,
    };
  }

  // Rule 2: allowlist
  if (!ALLOWED_RECIPIENTS.has(recipientKey)) {
    return {
      allowed: false,
      reason: `Recipient ${recipientKey} is not on the allowlist. No transfer to an unlisted address will be signed.`,
    };
  }

  // Rule 3: positive whole lamports
  if (typeof lamports !== "bigint" || lamports <= 0n) {
    return {
      allowed: false,
      reason: `Amount must be a positive whole number of lamports, got ${lamports}.`,
    };
  }

  // Rule 4: per-transfer cap
  if (lamports > MAX_LAMPORTS_PER_TRANSFER) {
    return {
      allowed: false,
      reason: `Amount ${Number(lamports) / Number(LAMPORTS_PER_SOL)} SOL exceeds the per-transfer cap of ${Number(MAX_LAMPORTS_PER_TRANSFER) / Number(LAMPORTS_PER_SOL)} SOL.`,
    };
  }

  // Rule 5: session budget
  if (sessionSpent + lamports > MAX_LAMPORTS_PER_SESSION) {
    return {
      allowed: false,
      reason: `This transfer would push session spending past the cap of ${Number(MAX_LAMPORTS_PER_SESSION) / Number(LAMPORTS_PER_SOL)} SOL. Already spent: ${Number(sessionSpent) / Number(LAMPORTS_PER_SOL)} SOL.`,
    };
  }

  return { allowed: true, reason: "Within policy." };
}

export function recordSpend(lamports) {
  sessionSpent += lamports;
}