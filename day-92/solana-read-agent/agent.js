// Import the Anthropic SDK.
// Normally this talks to Anthropic's cloud. We'll point it at Ollama instead.
import Anthropic from "@anthropic-ai/sdk";
// Import Solana kit functions for connecting to devnet and reading accounts.
import { createSolanaRpc, devnet, address } from "@solana/kit";

// Create a connection to Solana devnet.
const rpc = createSolanaRpc(devnet("https://api.devnet.solana.com"));

// ==========================================================
// TOOL DEFINITIONS
// ==========================================================
// These descriptions are the ONLY thing the model reads to decide
// which tool fits the user's question. Write them like good API docs.
// ==========================================================
const tools = [
  {
    name: "get_balance",
    description:
      "Get the current SOL balance of a Solana account on devnet. " +
      "Returns the balance in both lamports and SOL.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "The base58-encoded Solana address to check",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "get_account_info",
    description:
      "Fetch metadata for a Solana account on devnet: which program owns it, " +
      "its lamport balance, whether it is executable, and how many bytes of data it stores.",
    input_schema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "The base58-encoded Solana address to inspect",
        },
      },
      required: ["address"],
    },
  },
];

// ==========================================================
// TOOL EXECUTOR
// ==========================================================
// This is the bridge between the model's structured request and
// the actual RPC calls. If a tool fails, the error goes back to
// the model as a result so it can explain the problem.
// ==========================================================
async function runTool(name, input) {
  try {
    const targetAddress = address(input.address);

    if (name === "get_balance") {
      const { value: lamports } = await rpc.getBalance(targetAddress).send();
      return {
        content: JSON.stringify({
          lamports: lamports.toString(),
          sol: Number(lamports) / 1_000_000_000,
        }),
      };
    }

    if (name === "get_account_info") {
      const { value: info } = await rpc
        .getAccountInfo(targetAddress, { encoding: "base64" })
        .send();
      if (!info) return { content: JSON.stringify({ exists: false }) };
      return {
        content: JSON.stringify({
          exists: true,
          owner: info.owner,
          lamports: info.lamports.toString(),
          executable: info.executable,
          dataLength: info.data[0] ? Buffer.from(info.data[0], "base64").length : 0,
        }),
      };
    }

    return { content: `Unknown tool: ${name}`, isError: true };
  } catch (err) {
    return { content: `Tool error: ${err.message}`, isError: true };
  }
}

// ==========================================================
// AGENT CLIENT
// ==========================================================
// Point the Anthropic SDK at Ollama's local server.
// Ollama speaks the same protocol, so the SDK works unchanged.
// The apiKey is required by the SDK but ignored by Ollama.
// ==========================================================
const client = new Anthropic({
  baseURL: "http://localhost:11434",
  apiKey: "ollama",
});

// ==========================================================
// THE QUESTION
// ==========================================================
// Read the question from the command line. If none is provided,
// fall back to a default question about the user's wallet.
// ==========================================================
const question =
  process.argv.slice(2).join(" ") ||
  "What is the SOL balance of YOUR_WALLET_ADDRESS_HERE?";

// The conversation history. Starts with the user's question.
const messages = [{ role: "user", content: question }];

// ==========================================================
// THE AGENT LOOP
// ==========================================================
// Call the model. If it stops because it wants a tool, run the tool,
// append the result, and call again. When it stops for any other
// reason, it has a final answer.
// ==========================================================
while (true) {
  const response = await client.messages.create({
    model: "llama3.2:3b",
    max_tokens: 1024,
    system:
      "You are a Solana devnet assistant. Use your tools to look up live " +
      "on-chain state before answering. Report balances in both lamports and SOL.",
    tools,
    messages,
  });

  // Append the assistant's response to the conversation
  messages.push({ role: "assistant", content: response.content });

  // If the model didn't ask for a tool, print its answer and exit
  if (response.stop_reason !== "tool_use") {
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    console.log(`\n${text}`);
    break;
  }

  // Otherwise, run every tool the model asked for
  const toolResults = [];
  for (const block of response.content) {
    if (block.type !== "tool_use") continue;
    console.log(`[tool] ${block.name}(${JSON.stringify(block.input)})`);
    const result = await runTool(block.name, block.input);
    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: result.content,
      is_error: result.isError ?? false,
    });
  }

  // Append all tool results as the next user message
  messages.push({ role: "user", content: toolResults });
}