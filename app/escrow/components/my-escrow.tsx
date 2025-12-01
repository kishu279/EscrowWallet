"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaProvider } from "@/hook/solana-provider";
import { getUserEscrow, shortenAddress, cancelEscrow } from "@/lib/utils";
import {
  formatDate,
  formatAmount,
  copyToClipboard,
  getTimeRemaining,
} from "@/lib/helper";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Clock,
  User,
  Coins,
  Copy,
  Check,
  AlertCircle,
  Trash2,
  Calendar,
  Timer,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { toast } from "sonner";

import idl from "../utils/escrow.json";
import { Escrow } from "@/utils/escrow";

export default function MyEscrow() {
  const [escrowData, setEscrowData] = useState<any>(null);
  const [escrowPDA, setEscrowPDA] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { connected, publicKey } = useWallet();
  const provider = useSolanaProvider();

  const fetchMyEscrow = async () => {
    if (!connected || !publicKey || !provider) return;

    setLoading(true);
    try {
      const program = new Program<Escrow>(idl as any, provider);

      // Derive PDA from user's public key
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), publicKey.toBuffer()],
        program.programId
      );

      setEscrowPDA(escrowPda.toBase58());

      // Fetch escrow account data
      try {
        const escrow = await program.account.escrow.fetch(escrowPda);
        setEscrowData(escrow);
      } catch (err) {
        console.log("No escrow found for this wallet");
        setEscrowData(null);
      }
    } catch (err) {
      console.error("Error fetching escrow:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEscrow();
  }, [connected, publicKey, provider]);

  const handleCopyToClipboard = async (address: string) => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    }
  };

  const getCreatedDate = () => {
    // Since we don't store creation time, we'll show when it was fetched
    return new Date().toLocaleString();
  };

  const handleCancelEscrow = async () => {
    if (!provider || !publicKey || !escrowPDA) return;

    setDeleting(true);
    try {
      // Call cancel escrow from utils
      const tx = await cancelEscrow(provider, publicKey);

      if (!tx) {
        toast.error("Unable to Cancel Escrow", {
          description:
            "The escrow cannot be cancelled at this time. Please check if you are the initializer and the escrow exists.",
        });
        setShowDeleteDialog(false);
        setDeleting(false);
        return;
      }

      toast.success("Escrow Cancelled!", {
        description: `Transaction ID: ${tx}`,
      });

      // Refresh escrow data
      setShowDeleteDialog(false);
      await fetchMyEscrow();
    } catch (err: any) {
      console.error("Error cancelling escrow:", err);
      toast.error("Failed to Cancel Escrow", {
        description:
          err.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!connected) {
    return (
      <div className="container mx-auto max-w-4xl">
        <div className="p-6 rounded-lg border-2 border-gray-200 bg-gray-50 text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Connect your wallet to view your escrow
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            My Escrow
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMyEscrow}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* PDA Address */}
        {escrowPDA && (
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <p className="text-xs text-purple-600 mb-1 font-semibold">
              Your Escrow PDA
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono font-semibold text-purple-900">
                {escrowPDA}
              </p>
              <button
                onClick={() => handleCopyToClipboard(escrowPDA)}
                className="p-1.5 hover:bg-purple-100 rounded transition-colors"
                title="Copy PDA"
              >
                {copiedAddress === escrowPDA ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-purple-600" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Escrow Data */}
        {escrowData ? (
          <div className="p-6 rounded-lg border-2 border-green-300 bg-green-50/50">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-green-800">
                Active Escrow
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs bg-green-500 text-white rounded-full">
                  Initialized
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 rounded-lg bg-white border border-green-200">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                  <User className="h-3 w-3" />
                  <span>Owner</span>
                </div>
                <p className="text-sm font-semibold">You</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                  <Timer className="h-3 w-3" />
                  <span>Time Left</span>
                </div>
                <p className="text-sm font-semibold text-green-700">
                  {getTimeRemaining(escrowData.expiry)}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                  <Calendar className="h-3 w-3" />
                  <span>Status</span>
                </div>
                <p className="text-sm font-semibold">
                  {getTimeRemaining(escrowData.expiry) === "Expired"
                    ? "Expired"
                    : "Active"}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                  <Coins className="h-3 w-3" />
                  <span>Fee</span>
                </div>
                <p className="text-sm font-semibold">
                  {escrowData.feeBasisPoints / 100}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-white border border-green-200">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Initializer (You)</span>
                </div>
                <p className="text-sm font-mono font-semibold">
                  {shortenAddress(escrowData.initializer.toBase58())}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-green-200">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Receiver</span>
                </div>
                <p className="text-sm font-mono font-semibold">
                  {shortenAddress(escrowData.receiver.toBase58())}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-white border border-green-200">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Coins className="h-4 w-4" />
                  <span className="font-medium">You Offer</span>
                </div>
                <p className="text-lg font-bold text-green-700">
                  {formatAmount(escrowData.initializerAmount)} tokens
                </p>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  Mint: {shortenAddress(escrowData.initializerMint.toBase58())}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-green-200">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Coins className="h-4 w-4" />
                  <span className="font-medium">You Request</span>
                </div>
                <p className="text-lg font-bold text-green-700">
                  {formatAmount(escrowData.receiverAmount, 6)} tokens
                </p>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  Mint: {shortenAddress(escrowData.receiverMint.toBase58())}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white border border-green-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Expires:</span>
                <span className="font-mono">
                  {formatDate(escrowData.expiry)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-700 mb-1">
              No Active Escrow
            </p>
            <p className="text-sm text-gray-500">
              You haven't created an escrow yet. Initialize one using the
              transaction buttons above.
            </p>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Escrow?</DialogTitle>
              <DialogDescription>
                This will cancel your escrow and return your tokens. This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Escrow PDA:</strong>
                </p>
                <p className="text-xs font-mono text-yellow-900 break-all">
                  {escrowPDA}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
              >
                Keep Escrow
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelEscrow}
                disabled={deleting}
              >
                {deleting ? "Cancelling..." : "Cancel Escrow"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
