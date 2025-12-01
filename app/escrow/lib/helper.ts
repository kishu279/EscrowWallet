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

/**
 * Format a timestamp (BN) to a locale string
 * @param timestamp - The timestamp in BN format (seconds)
 * @returns The formatted date string or "N/A" if invalid
 */
function formatDate(timestamp: any): string {
  try {
    const date = new Date(timestamp.toNumber() * 1000);
    return date.toLocaleString();
  } catch {
    return "N/A";
  }
}

/**
 * Format a token amount from raw to UI representation with decimals
 * @param amount - The raw token amount
 * @param decimals - The number of decimals for the token (default: 9)
 * @returns The formatted amount string with 4 decimal places
 */
function formatAmount(amount: any, decimals: number = 9): string {
  try {
    return (Number(amount.toString()) / Math.pow(10, decimals)).toFixed(4);
  } catch {
    return "0";
  }
}

/**
 * Copy text to clipboard and return success status
 * @param text - The text to copy to clipboard
 * @returns Promise<boolean> - True if successful, false otherwise
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

/**
 * Calculate and format the time remaining until expiry
 * @param expiry - The expiry timestamp in BN format
 * @returns A formatted string showing time remaining or "Expired" or "N/A"
 */
function getTimeRemaining(expiry: any): string {
  try {
    const expiryTime = expiry.toNumber() * 1000;
    const now = Date.now();
    const diff = expiryTime - now;

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  } catch {
    return "N/A";
  }
}

export {
  wrapSol,
  unwrapSol,
  convertToRawAmount,
  convertToUIAmount,
  formatDate,
  formatAmount,
  copyToClipboard,
  getTimeRemaining,
};
