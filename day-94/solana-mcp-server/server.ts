// ==========================================================
// IMPORTS
// ==========================================================
// McpServer: the object that holds your tools and speaks MCP.
// StdioServerTransport: the pipe the client talks to us through (stdin/stdout).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// zod: describes the shape of a tool's inputs so the client knows what to pass.
import { z } from "zod";

// The Anchor client. Same pieces you used in Arc 13:
//   AnchorProvider: bundles a Connection + a Wallet
//   Program: typed wrapper over your on-chain program, built from the IDL
//   Wallet: wraps a Keypair so the provider can sign with it
//   BN: big-number type Anchor expects for u64 args
//   web3: namespace holding Connection, Keypair, PublicKey, LAMPORTS_PER_SOL
import { AnchorProvider, BN, Program, Wallet, web3 } from "@anchor-lang/core";

// Node built-ins. We use these to read files from disk.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Pull the web3 pieces out of the namespace so we can use them directly.
const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = web3;

// ==========================================================
// LOAD THE IDL
// ==========================================================
// The IDL is the machine-readable description of your program:
// account layouts, instruction names, seeds. Anchor uses it to know
// how to encode calls and decode account data.
//
// IMPORTANT: We load it relative to THIS FILE, not the current working
// directory. MCP clients launch your server from an arbitrary cwd, so
// relative paths like "./idl.json" would break. import.meta.url is the
// absolute URL of this file, and new URL("./idl.json", ...) resolves
// the sibling file regardless of where the process was started from.
const idl = JSON.parse(
  fs.readFileSync(new URL("./idl.json", import.meta.url), "utf8")
);

// ==========================================================
// LOAD THE SIGNING WALLET
// ==========================================================
// The server signs transactions with YOUR local Solana CLI wallet,
// stored at ~/.config/solana/id.json (the default keypair path).
// We use an ABSOLUTE path (os.homedir) for the same reason as above:
// the client's cwd is unpredictable.
//
// The file contains a JSON array of 64 bytes (32 secret + 32 public).
// Keypair.fromSecretKey reconstructs the full keypair from those bytes.
const secret = JSON.parse(
  fs.readFileSync(path.join(os.homedir(), ".config/solana/id.json"), "utf8")
);
const keypair = Keypair.fromSecretKey(new Uint8Array(secret));

// ==========================================================
// CONNECT TO DEVNET + BUILD THE PROVIDER
// ==========================================================
// The Connection is a JSON-RPC client to the devnet cluster.
// "confirmed" commitment means reads/writes wait until a supermajority
// has confirmed, which is fast and safe enough for a demo.
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// The provider bundles the connection and the wallet, so any Program
// built from it can fetch accounts and sign transactions.
const provider = new AnchorProvider(connection, new Wallet(keypair), {
  commitment: "confirmed",
});

// ==========================================================
// BUILD THE TYPED PROGRAM CLIENT FROM THE IDL
// ==========================================================
// `program.account.vault` and `program.methods.deposit(...)` only exist
// because the IDL told Anchor about them. This is the same pattern you
// used in Arc 13 / Day 87 when you generated a typed client.
const program: any = new Program(idl, provider);

// ==========================================================
// DERIVE THE VAULT PDA
// ==========================================================
// Your program defines the vault as a Program Derived Address with seeds
// [b"vault", authority.key()]. Since the authority is this server's wallet,
// the vault address is deterministic: same program + same wallet = same PDA.
//
// This matches your day-81 lib.rs exactly:
//   seeds = [b"vault", authority.key().as_ref()]
const [vaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), keypair.publicKey.toBuffer()],
  program.programId
);

// ==========================================================
// CREATE THE MCP SERVER
// ==========================================================
// name + version are metadata the client shows when listing servers.
const server = new McpServer({
  name: "my-solana-program",
  version: "1.0.0",
});

// ==========================================================
// TOOL 1: get_wallet_balance (read-only)
// ==========================================================
// Each tool has:
//   - a name the model references when it wants to call it
//   - a title (human-friendly)
//   - a description (the model reads this to decide WHEN to use it)
//   - a handler that returns { content: [{ type: "text", text }] }
//
// No inputs for this one — it just reads the wallet balance.
server.registerTool(
  "get_wallet_balance",
  {
    title: "Get wallet balance",
    description:
      "Get the devnet SOL balance of the wallet this server signs with.",
  },
  async () => {
    // getBalance returns lamports (1 SOL = 1_000_000_000 lamports).
    const lamports = await connection.getBalance(keypair.publicKey);
    return {
      content: [{
        type: "text",
        text: `${keypair.publicKey.toBase58()} holds ${lamports / LAMPORTS_PER_SOL} SOL (${lamports} lamports)`,
      }],
    };
  }
);

// ==========================================================
// TOOL 2: get_vault (read-only)
// ==========================================================
// Reads the Vault account's on-chain state via the typed client:
// program.account.vault.fetch(pda) deserializes the account bytes
// into an object with `authority` and `balance`.
server.registerTool(
  "get_vault",
  {
    title: "Read vault state",
    description:
      "Fetch the current on-chain state (authority and balance) of the vault account from devnet.",
  },
  async () => {
    let state;
    try {
      state = await program.account.vault.fetch(vaultPda);
    } catch {
      // Anchor throws when the account doesn't exist. That's expected:
      // the PDA is created lazily on the first deposit. Return a friendly
      // message instead of an error so the model can reason about it.
      return {
        content: [{
          type: "text",
          text: `No vault exists yet at ${vaultPda.toBase58()}. Call initialize_vault first.`,
        }],
      };
    }
    // Return JSON as text. The model can parse and summarize it.
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          address: vaultPda.toBase58(),
          authority: state.authority.toBase58(),
          balance: state.balance.toString(),
        }),
      }],
    };
  }
);

// ==========================================================
// TOOL 3: initialize_vault (the guarded write)
// ==========================================================
// This is where Day 93's lesson travels with you: guardrails live in code,
// not in a prompt. Every client that connects inherits these rules.
server.registerTool(
  "initialize_vault",
  {
    title: "Initialize the vault",
    description:
      "Create and fund the vault account on devnet with a one-time deposit, signed by the server's wallet. Does nothing if the vault already exists.",
    // inputSchema tells the client what arguments this tool accepts.
    // zod validates them before the handler runs.
    inputSchema: {
      amountSol: z.number().positive()
        .describe("SOL to deposit when first creating the vault"),
    },
  },
  async ({ amountSol }) => {
    // ------------------------------------------------------
    // GUARDRAIL 1: only sign on devnet
    // ------------------------------------------------------
    // If the RPC endpoint ever gets pointed at mainnet, refuse outright.
    // This check cannot be bypassed by the model — it runs in your process.
    if (!connection.rpcEndpoint.includes("devnet")) {
      return {
        content: [{ type: "text", text: "Refused: this server only signs on devnet." }],
        isError: true,
      };
    }

    // ------------------------------------------------------
    // GUARDRAIL 2: cap the deposit
    // ------------------------------------------------------
    // Same shape as Day 93's MAX_SOL_PER_SEND. The model can ask for
    // any number; anything above 0.1 SOL is rejected here.
    const MAX_SOL = 0.1;
    if (amountSol > MAX_SOL) {
      return {
        content: [{ type: "text", text: `Refused: at most ${MAX_SOL} SOL per deposit.` }],
        isError: true,
      };
    }

    // ------------------------------------------------------
    // GUARDRAIL 3: idempotency
    // ------------------------------------------------------
    // If the vault already exists, don't deposit again. We just report
    // the current state. Otherwise a retried call could double-deposit.
    try {
      const existing = await program.account.vault.fetch(vaultPda);
      return {
        content: [{
          type: "text",
          text: `Vault already initialized at ${vaultPda.toBase58()} with balance ${existing.balance.toString()}. No deposit sent.`,
        }],
      };
    } catch {
      // fetch threw => account does not exist yet => fall through and create it.
    }

    // ------------------------------------------------------
    // THE WRITE: call deposit(amount) on your program
    // ------------------------------------------------------
    // Math.round converts SOL to an integer number of lamports so we
    // don't pass a float into BN. BN wraps the u64 your program expects.
    //
    // .accounts() only needs the accounts Anchor cannot resolve on its own
    // from the IDL's seed definitions. The vault PDA and System Program
    // are derived automatically.
    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
    const sig = await program.methods
      .deposit(new BN(lamports))
      .accounts({ authority: keypair.publicKey })
      .rpc();

    // Read back the freshly created account to confirm the write landed.
    const created = await program.account.vault.fetch(vaultPda);
    return {
      content: [{
        type: "text",
        text: `Initialized vault ${vaultPda.toBase58()} with balance ${created.balance.toString()} (signature ${sig})`,
      }],
    };
  }
);

// ==========================================================
// WIRE UP THE TRANSPORT
// ==========================================================
// MCP servers speak JSON-RPC over stdio. That means STDOUT belongs to the
// protocol. If you console.log() anything, you corrupt the message stream
// and the client disconnects. Use console.error() for logging — stderr is
// left alone by the protocol.
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Solana MCP server running on stdio");
}

// If anything throws at startup, log it (to stderr) and exit non-zero so
// the client knows the server failed to boot.
main().catch((err) => {
  console.error("Server error:", err);
  process.exit(1);
});