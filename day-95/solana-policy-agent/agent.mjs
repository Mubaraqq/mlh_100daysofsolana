// Read the wallet file from disk and import the Anthropic SDK and Solana kit
import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
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
import { checkTransferPolicy, recordSpend } from "./policy.mjs";

// Connect to devnet
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

// Load the agent's wallet from agent-wallet.json
// The file contains the 64-byte secret key in the same format as the Solana CLI
const secretKey = new Uint8Array(
  JSON.parse(await readFile("agent-wallet.json", "utf-8")),
);
const wallet = await createKeyPairSignerFromBytes(secretKey);

// ==========================================================
// TOOL DEFINITIONS
// ==========================================================
const tools = [
  {
    name: "get_balance",
    description:
      "Get the current balance of the agent's own devnet wallet, in SOL.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "send_sol",
      description:
    "Sends SOL on devnet. Transfers are limited to allowlisted recipients, " +
    "0.1 SOL per transfer, and 0.25 SOL per session.",
    input_schema: {
      type: "object",
      properties: {
        recipient: {
          type: "string",
          description: "Base58 Solana address to send to",
        },
        amount_sol: {
          type: "number",
          description: "Amount to send, in SOL",
        },
      },
      required: ["recipient", "amount_sol"],
    },
  },
];

// ==========================================================
// TOOL EXECUTOR
// ==========================================================
async function runTool(name, input) {
  // Tool: get_balance
  if (name === "get_balance") {
    const { value: lamportsBalance } = await rpc
      .getBalance(wallet.address)
      .send();
    return { balance_sol: Number(lamportsBalance) / 1_000_000_000 };
  }

   // Tool: send_sol
  if (name === "send_sol") {
    const lamportsAmount = lamports(
      BigInt(Math.round(input.amount_sol * 1_000_000_000)),
    );

    const decision = checkTransferPolicy(input.recipient, lamportsAmount);
    if (!decision.allowed) {
      return { error: `Transfer blocked by policy: ${decision.reason}` };
    }

    const recipient = address(input.recipient);

    // Step 3: Build the transfer instruction.
    try {
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(wallet, tx),
        (tx) =>
          setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) =>
          appendTransactionMessageInstruction(
            getTransferSolInstruction({
              source: wallet,
              destination: recipient,
              amount: lamportsAmount,
            }),
            tx,
          ),
      );

      const signedTx =
        await signTransactionMessageWithSigners(transactionMessage);
      const signature = getSignatureFromTransaction(signedTx);

      await rpc
        .sendTransaction(getBase64EncodedWireTransaction(signedTx), {
          encoding: "base64",
          preflightCommitment: "confirmed",
        })
        .send();

      recordSpend(lamportsAmount);

      return {
        signature,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      };
    } catch (error) {
      const message = error?.message ?? String(error);
      if (/insufficient|no record of a prior credit/i.test(message)) {
        return {
          error:
            `Send failed: the agent wallet ${wallet.address} has no ` +
            `devnet SOL. Fund it at https://faucet.solana.com/ and try again.`,
        };
      }
      return { error: `Send failed: ${message}` };
    }
  }

  return { error: `Unknown tool: ${name}` };
}

// ==========================================================
// AGENT CLIENT
// ==========================================================
// Point the Anthropic SDK at Ollama. Swap the model name to match what you have.
const client = new Anthropic({
  baseURL: "http://localhost:11434",
  apiKey: "ollama",
});

const model = "llama3.2:3b";

const question = process.argv.slice(2).join(" ") || "What is your balance?";
const messages = [{ role: "user", content: question }];

// ==========================================================
// AGENT LOOP
// ==========================================================
while (true) {
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system:
      "You are an agent that manages a small Solana devnet wallet. " +
      "You can check its balance and send SOL. Always report transaction " +
      "signatures and policy rejections back to the user honestly.",
    tools,
    messages,
  });

  messages.push({ role: "assistant", content: response.content });

  // If the model didn't ask for a tool, print its answer and exit
  if (response.stop_reason !== "tool_use") {
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    console.log("\nAgent:", text);
    break;
  }

  // Run every tool the model asked for
  const results = [];
  for (const block of response.content) {
    if (block.type !== "tool_use") continue;
    console.log("Tool call:", block.name, JSON.stringify(block.input));
    const result = await runTool(block.name, block.input);
    console.log("Result:  ", JSON.stringify(result));
    results.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify(result),
    });
  }
  messages.push({ role: "user", content: results });
}
