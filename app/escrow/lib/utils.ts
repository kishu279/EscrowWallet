import { Keypair, PublicKey } from "@solana/web3.js";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FEE_COLLECTOR, TOKENS_MINT_ADDRESSES } from "./config";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";

//  loading the idl
import idl from "./../utils/escrow.json";

// loading the program
import { EscrowProgram } from "./../utils/escrow"; // adjust the path as necessary
import { AnchorProvider, Program } from "@coral-xyz/anchor";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const shortenAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export async function initializeSolanaProgram(
  senderPubKey: PublicKey,
  receiverPubkey: PublicKey,
  initializerAmount: number,
  receiverAmount: number,
  tokenMintAddress: PublicKey,
  receiverMintAddress: PublicKey,
  provider: anchor.Provider,
  expiry: anchor.BN = new anchor.BN(Math.floor(Date.now() / 1000) + 300)
): Promise<String> {
  const ataAddress = getAssociatedTokenAddressSync(
    tokenMintAddress,
    senderPubKey
  );

  const program = new Program<EscrowProgram>(idl as any, provider);

  const tx = await program.methods
    .initializeEscrow(
      new anchor.BN(initializerAmount),
      new anchor.BN(receiverAmount),
      expiry,
      receiverPubkey,
      100,
      FEE_COLLECTOR
    )
    .accounts({
      initializer: senderPubKey,
      initializerTokenAccount: ataAddress,
      initializerMint: tokenMintAddress,
      receiverMint: receiverMintAddress,
      program: program.programId,
    })
    .rpc();

  return tx;
}

export async function claimSolanaProgram(
  escrowAccountAddress: string,
  provider: anchor.Provider
): Promise<String> {
  const program = new Program<EscrowProgram>(idl as any, provider);
  const escrowAccount = new PublicKey(escrowAccountAddress);

  const tx = await program.methods
    .claimEscrow()
    .accounts({
      escrow: escrowAccount,
      program: program.programId,
    })
    .rpc();

  return tx;
}
