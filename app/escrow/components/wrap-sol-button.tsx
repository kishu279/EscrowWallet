"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaProvider } from "@/hook/solana-provider";
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SystemProgram, Transaction } from "@solana/web3.js";

interface WrapSolButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function WrapSolButton({
  onSuccess,
  onError,
}: WrapSolButtonProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [wsolBalance, setWsolBalance] = useState<string>("0");
  const { connected, publicKey } = useWallet();
  const provider = useSolanaProvider();

  // Fetch wSOL balance
  React.useEffect(() => {
    if (!connected || !publicKey || !provider) return;

    const fetchBalance = async () => {
      try {
        const wSolAta = getAssociatedTokenAddressSync(NATIVE_MINT, publicKey);
        const balance = await provider.connection.getTokenAccountBalance(
          wSolAta
        );
        setWsolBalance(balance.value.uiAmountString || "0");
      } catch {
        setWsolBalance("0");
      }
    };

    fetchBalance();
  }, [connected, publicKey, provider]);

  const handleWrapSol = async () => {
    if (!connected || !publicKey || !provider || !amount) return;

    setLoading(true);
    try {
      const amountInSol = parseFloat(amount);
      if (isNaN(amountInSol) || amountInSol <= 0) {
        throw new Error("Invalid amount");
      }

      const amountInLamports = Math.floor(
        amountInSol * anchor.web3.LAMPORTS_PER_SOL
      );

      const wSolAta = getAssociatedTokenAddressSync(NATIVE_MINT, publicKey);
      const ataInfo = await provider.connection.getAccountInfo(wSolAta);

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      const tx = new Transaction({
        feePayer: publicKey,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      if (!ataInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            wSolAta,
            publicKey,
            NATIVE_MINT,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: wSolAta,
          lamports: amountInLamports,
        })
      );

      tx.add(createSyncNativeInstruction(wSolAta));

      const signature = await provider.sendAndConfirm!(tx);
      console.log("✅ Wrapped:", signature);

      // Refresh balance
      const newBalance = await provider.connection.getTokenAccountBalance(
        wSolAta
      );
      setWsolBalance(newBalance.value.uiAmountString || "0");

      setAmount("");
      onSuccess?.();
    } catch (err: any) {
      console.error("❌ Error:", err);
      onError?.(err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50/50">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-yellow-700">
          💰 Wrap SOL to wSOL
        </label>
        <span className="text-xs text-yellow-600">
          Balance: {wsolBalance} wSOL
        </span>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          placeholder="Amount in SOL"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
          disabled={loading || !connected}
        />
        <Button
          type="button"
          onClick={handleWrapSol}
          disabled={loading || !connected || !amount}
          className="bg-yellow-500 hover:bg-yellow-600 text-white"
        >
          {loading ? "Wrapping..." : "Wrap"}
        </Button>
      </div>
    </div>
  );
}
