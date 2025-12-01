import { PublicKey } from "@solana/web3.js";

const TOKENS_MINT_ADDRESSES = [
  { name: "USDC", address: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" },
  { name: "USDC-DEV", address: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" },
  {
    name: "SOL ",
    address: "So11111111111111111111111111111111111111112",
  },
];

const PROGRAM_ID = new PublicKey(
  "DCA5tgdnUxARGKY1oYpcnLkzeuxYaKSiXMMJ3irou6tu"
);

const FEE_COLLECTOR = new PublicKey(
  "Cw2VW7tg7inFCLDSQBy52LyKHKZiqALe2JNadGnQFacL" // fee collector address
);

export { PROGRAM_ID, FEE_COLLECTOR, TOKENS_MINT_ADDRESSES };
