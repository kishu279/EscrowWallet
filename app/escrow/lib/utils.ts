import { PublicKey, Transaction } from "@solana/web3.js";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FEE_COLLECTOR } from "./config";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import idl from "./../utils/escrow.json";
import { Escrow as EscrowProgram } from "./../utils/escrow";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const shortenAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Get user's escrow account
export async function getUserEscrow(
  userPublicKey: PublicKey,
  provider: anchor.Provider
) {
  const program = new Program<EscrowProgram>(idl as any, provider);
  try {
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), userPublicKey.toBuffer()],
      program.programId
    );

    const escrowAccount = await program.account.escrow.fetch(escrowPda);
    return {
      address: escrowPda.toBase58(),
      data: escrowAccount,
    };
  } catch (err) {
    console.log("No escrow found for user");
    return null;
  }
}

// Get all escrows for display
export async function getAllEscrows(provider: anchor.Provider) {
  const program = new Program<EscrowProgram>(idl as any, provider);
  try {
    const escrows = await program.account.escrow.all();
    return escrows.map((e) => ({
      address: e.publicKey.toBase58(),
      data: e.account,
    }));
  } catch (err) {
    console.error("Error fetching escrows:", err);
    return [];
  }
}

export async function cancelEscrow(
  provider: anchor.Provider,
  senderPubKey: PublicKey
) {
  const program = new Program<EscrowProgram>(idl as any, provider);

  try {
    const [escrowPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), senderPubKey.toBuffer()],
      program.programId
    );

    if (!escrowPda) {
      return null;
    }

    const escrowAccount = await program.account.escrow.fetch(escrowPda);

    const initializerTokenAccount = await getAssociatedTokenAddressSync(
      escrowAccount.initializerMint,
      senderPubKey
    );

    const tx = await program.methods
      .cancelEscrow()
      .accounts({
        escrow: escrowPda,
        initializer: senderPubKey,
        initializerTokenAccount: initializerTokenAccount,
        initializerMint: escrowAccount.initializerMint,
        program: program.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      // .signers([provider.wallet?.payer!])
      .rpc();

    console.log("Escrow cancelled with tx:", tx);
    return tx;
  } catch (err) {
    console.error("Error fetching escrows:", err);
    return null;
  }
}

export async function initializeSolanaProgram(
  senderPubKey: PublicKey,
  receiverPubkey: PublicKey,
  initializerAmount: number,
  receiverAmount: number,
  tokenMintAddress: PublicKey,
  receiverMintAddress: PublicKey,
  provider: anchor.Provider,
  expiry: anchor.BN = new anchor.BN(Math.floor(Date.now() / 1000) + 300000)
): Promise<String> {
  const program = new Program<EscrowProgram>(idl as any, provider);

  const ataAddress = getAssociatedTokenAddressSync(
    tokenMintAddress,
    senderPubKey
  );

  // Check if ATA exists
  const ataInfo = await provider.connection.getAccountInfo(ataAddress);

  if (!ataInfo) {
    console.log("⚠️  ATA does not exist. Creating it...");

    // Create ATA instruction
    const createAtaIx = createAssociatedTokenAccountInstruction(
      senderPubKey, // payer
      ataAddress, // ata
      senderPubKey, // owner
      tokenMintAddress, // mint
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create and send transaction
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    const createAtaTx = new Transaction({
      feePayer: senderPubKey,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }).add(createAtaIx);

    const signature = await provider.sendAndConfirm!(createAtaTx);
    console.log("✅ ATA created successfully:", signature);
  } else {
    console.log("✅ ATA already exists");
  }

  // Check token balance
  try {
    const balance = await provider.connection.getTokenAccountBalance(
      ataAddress
    );
    const currentBalance = BigInt(balance.value.amount);
    const required = BigInt(initializerAmount);

    console.log(
      `Balance: ${currentBalance.toString()}, Required: ${required.toString()}`
    );

    if (currentBalance < required) {
      const decimals = balance.value.decimals;
      const currentUI = Number(currentBalance) / Math.pow(10, decimals);
      const requiredUI = Number(required) / Math.pow(10, decimals);

      throw new Error(
        `Insufficient balance!\nHave: ${currentUI.toFixed(
          decimals
        )}\nNeed: ${requiredUI.toFixed(
          decimals
        )}\n\nPlease wrap more SOL if using wSOL`
      );
    }
  } catch (err: any) {
    if (err.message?.includes("Insufficient balance")) {
      throw err;
    }
    console.warn("Could not check balance:", err);
  }

  // Now proceed with escrow initialization
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
