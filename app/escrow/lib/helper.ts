import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  NATIVE_MINT,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

async function wrapSol(
  connection: Connection,
  wallet: Keypair,
  amount: number
): Promise<PublicKey | null> {
  try {
    const associatedTokenAccount = await getAssociatedTokenAddress(
      NATIVE_MINT,
      wallet.publicKey
    );

    const wrapInstruction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        associatedTokenAccount,
        wallet.publicKey,
        NATIVE_MINT
      ),
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: associatedTokenAccount,
        lamports: amount * 1e9,
      }),
      createSyncNativeInstruction(associatedTokenAccount)
    );

    await sendAndConfirmTransaction(connection, wrapInstruction, [wallet]);

    return associatedTokenAccount;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function unwrapSol(
  connection: Connection,
  wallet: Keypair,
  tokenAccount: PublicKey
): Promise<void> {
  try {
    const unwrapTransaction = new Transaction().add(
      createCloseAccountInstruction(
        tokenAccount,
        wallet.publicKey,
        wallet.publicKey,
        []
      )
    );

    await sendAndConfirmTransaction(connection, unwrapTransaction, [wallet]);
  } catch (err) {
    console.log(err);
  }
}

/**
 * Convert a token amount from UI representation to the raw amount based on decimals
 * @param amount - The amount in UI representation (e.g., 100 for "100 tokens")
 * @param decimals - The number of decimals for the token (e.g., 9 for SOL, 6 for USDC)
 * @returns The raw amount as a number
 */
function convertToRawAmount(amount: number, decimals: number): number {
  return amount * Math.pow(10, decimals);
}

/**
 * Convert a raw token amount to UI representation based on decimals
 * @param rawAmount - The raw amount (e.g., 100_000_000_000 for SOL)
 * @param decimals - The number of decimals for the token (e.g., 9 for SOL, 6 for USDC)
 * @returns The UI amount as a number
 */
function convertToUIAmount(rawAmount: number, decimals: number): number {
  return rawAmount / Math.pow(10, decimals);
}

export { wrapSol, unwrapSol, convertToRawAmount, convertToUIAmount };
