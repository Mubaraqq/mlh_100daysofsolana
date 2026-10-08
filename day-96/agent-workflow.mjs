// ==========================================================
// DAY 96 — Goal-driven workflow agent
// Translated from the lesson's Anthropic SDK format to
// OpenAI SDK format, pointed at Hugging Face's router.
// ==========================================================

import OpenAI from "openai";
import { readFileSync, writeFileSync } from "node:fs";
import {
  createSolanaRpc,
  devnet,
  address,
  createKeyPairSignerFromBytes,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  getBase64EncodedWireTransaction,
  lamports,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";

// ----------------------------------------------------------
// CLIENT — OpenAI SDK pointed at Hugging Face
// ----------------------------------------------------------
const client = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = "openai/gpt-oss-120b";

// ----------------------------------------------------------
// SOLANA SETUP
// ----------------------------------------------------------
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

async function loadWallet(path) {
  const secret = new Uint8Array(JSON.parse(readFileSync(path, "utf8")));
  return await createKeyPairSignerFromBytes(secret);
}

const operating = await loadWallet("agent-wallet.json");
const savings = await loadWallet("savings-wallet.json");

// ----------------------------------------------------------
// THE GOAL — the only instruction the agent gets
// ----------------------------------------------------------
const GOAL =
  `Make sure the savings wallet (${savings.address}) holds at least 5 SOL. ` +
  `Check balances before moving anything, move only what is needed from the ` +
  `operating wallet, and verify the final balances before you finish.`;

// ----------------------------------------------------------
// THE POLICY — deny by default, hard numeric caps
// ----------------------------------------------------------
const LAMPORTS_PER_SOL = 1_000_000_000n;

const POLICY = {
  allowedRecipients: [savings.address],
  maxLamportsPerTransfer: 50_000_000n, // 0.05 SOL
  maxLamportsPerRun: 500_000_000n,      // 0.5 SOL
};
let spentThisRun = 0n;

function checkPolicy(to, lamportsAmount) {
  if (!POLICY.allowedRecipients.includes(to)) {
    return {
      allowed: false,
      reason: `recipient ${to} is not on the allowlist`,
    };
  }
  if (lamportsAmount > POLICY.maxLamportsPerTransfer) {
    return {
      allowed: false,
      reason: `${lamportsAmount} lamports exceeds the per-transfer cap of ${POLICY.maxLamportsPerTransfer}`,
    };
  }
  if (spentThisRun + lamportsAmount > POLICY.maxLamportsPerRun) {
    return {
      allowed: false,
      reason: `this transfer would push total spend past the per-run cap of ${POLICY.maxLamportsPerRun} lamports`,
    };
  }
  return { allowed: true, reason: "within policy" };
}

// ----------------------------------------------------------
// THE RUN LOG — every decision, on disk
// ----------------------------------------------------------
let currentTurn = 0;
const runLog = [];

function logEvent(event, detail) {
  runLog.push({ turn: currentTurn, event, detail });
  const short = JSON.stringify(detail);
  console.log(`[turn ${currentTurn}] ${event.padEnd(14)} ${short}`);
}

// ----------------------------------------------------------
// THE TOOLS — OpenAI format (parameters inside function)
// ----------------------------------------------------------
const tools = [
  {
    type: "function",
    function: {
      name: "get_balance",
      description:
        "Get the current balance of a Solana devnet account in lamports.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Base58 account address",
          },
        },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_sol",
      description:
        "Transfer lamports from the operating wallet to a recipient. " +
        "Every transfer is checked against a policy before signing. " +
        "A denial is not an error: adjust your plan or stop.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Base58 recipient address",
          },
          lamports: {
            type: "number",
            description: "Amount in lamports",
          },
        },
        required: ["to", "lamports"],
      },
    },
  },
];

// ----------------------------------------------------------
// TOOL EXECUTOR
// ----------------------------------------------------------
async function runTool(name, input) {
  if (name === "get_balance") {
    const { value: balance } = await rpc
      .getBalance(address(input.address))
      .send();
    return { address: input.address, lamports: Number(balance) };
  }

  if (name === "transfer_sol") {
    const amount = BigInt(input.lamports);
    const verdict = checkPolicy(input.to, amount);
    logEvent("policy_check", { ...input, ...verdict });

    if (!verdict.allowed) {
      return { status: "denied", reason: verdict.reason };
    }

    try {
      const { value: latestBlockhash } = await rpc
        .getLatestBlockhash()
        .send();

      const txMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(operating, tx),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) =>
          appendTransactionMessageInstruction(
            getTransferSolInstruction({
              source: operating,
              destination: address(input.to),
              amount: lamports(amount),
            }),
            tx,
          ),
      );

      const signedTx = await signTransactionMessageWithSigners(txMessage);
      const signature = getSignatureFromTransaction(signedTx);

      await rpc
        .sendTransaction(getBase64EncodedWireTransaction(signedTx), {
          encoding: "base64",
          preflightCommitment: "confirmed",
        })
        .send();

      spentThisRun += amount;
      return { status: "confirmed", signature };
    } catch (err) {
      const reason = err?.message ?? String(err);
      logEvent("transfer_failed", { reason });
      return { status: "failed", reason };
    }
  }

  return { error: `unknown tool: ${name}` };
}

// ----------------------------------------------------------
// THE AGENT LOOP
// ----------------------------------------------------------
const MAX_TURNS = 20;

const SYSTEM = `You are a workflow agent managing Solana devnet wallets.
Operating wallet: ${operating.address}
Savings wallet: ${savings.address}
Amounts are in lamports; 1 SOL = ${LAMPORTS_PER_SOL} lamports.
Use your tools to accomplish the goal. A policy denial means the action is not allowed; adjust your plan or stop. When the goal is met, or you conclude it cannot be met, stop and give a short honest report of what you did.`;

async function main() {
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: GOAL },
  ];

  for (currentTurn = 1; currentTurn <= MAX_TURNS; currentTurn++) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages,
      tools,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    messages.push(choice.message);

    if (choice.finish_reason !== "tool_calls") {
      const report = choice.message.content ?? "";
      logEvent("final_report", report);
      break;
    }

    for (const toolCall of choice.message.tool_calls) {
      const name = toolCall.function.name;
      const input = JSON.parse(toolCall.function.arguments);
      logEvent("tool_call", { tool: name, input });
      const output = await runTool(name, input);
      logEvent("tool_result", output);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(output),
      });
    }
  }

  writeFileSync("run-log.json", JSON.stringify(runLog, null, 2));
  console.log(`Run complete. ${runLog.length} events written to run-log.json`);
}

main();