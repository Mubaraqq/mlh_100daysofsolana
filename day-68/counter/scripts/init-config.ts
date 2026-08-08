// Import Anchor core library
import * as anchor from "@anchor-lang/core";
// Import the generated types for your counter program
import { Counter } from "../target/types/counter";

// Immediately-invoked async function (IIFE)
// This runs the script as soon as it's executed
(async () => {
  // Set up the Anchor provider from environment variables
  // Reads ANCHOR_PROVIDER_URL and ANCHOR_WALLET from the command line
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  // Get the program instance from the workspace
  const program = anchor.workspace.Counter as anchor.Program<Counter>;
  
  // Call the init_config instruction
  // This creates the Config PDA on-chain
  // Seeds: ["config"] — singleton, only one exists
  await program.methods.initConfig().rpc();
  
  console.log("config initialized");
})();