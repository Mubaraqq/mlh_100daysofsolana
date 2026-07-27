const { PublicKey } = require("@solana/web3.js");

const programId = new PublicKey("75Us8XjhjHDoY6uemCSHt4Qv6S8mo2M2PpPFTi5uDrSN");

const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("counter")],
  programId
);

console.log('Seeds:        ["counter"]');
console.log("Program ID:   ", programId.toBase58());
console.log("PDA:          ", pda.toBase58());
console.log("Canonical bump:", bump);