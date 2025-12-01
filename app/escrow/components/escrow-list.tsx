"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaProvider } from "@/hook/solana-provider";
import { getUserEscrow, getAllEscrows, shortenAddress } from "@/lib/utils";
import { formatDate, formatAmount, copyToClipboard } from "@/lib/helper";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, User, Coins, Copy, Check } from "lucide-react";

interface EscrowData {
  address: string;
  data: any;
}

export default function EscrowList() {
  const [myEscrow, setMyEscrow] = useState<EscrowData | null>(null);
  const [allEscrows, setAllEscrows] = useState<EscrowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { connected, publicKey } = useWallet();
  const provider = useSolanaProvider();

  const fetchEscrows = async () => {
    if (!connected || !publicKey || !provider) return;

    setLoading(true);
    try {
      // Fetch user's escrow
      const userEscrow = await getUserEscrow(publicKey, provider as any);
      setMyEscrow(userEscrow);

      // Fetch all escrows
      const escrows = await getAllEscrows(provider as any);
      setAllEscrows(escrows);
    } catch (err) {
      console.error("Error fetching escrows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscrows();
  }, [connected, publicKey, provider]);

  const handleCopyToClipboard = async (address: string) => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    }
  };

  const EscrowCard = ({
    escrow,
    isMine,
  }: {
    escrow: EscrowData;
    isMine?: boolean;
  }) => (
    <div
      className={`p-4 rounded-lg border-2 ${
        isMine
          ? "border-green-300 bg-green-50/50"
          : "border-gray-200 bg-gray-50/50"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">Escrow Address</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-mono font-semibold">
              {shortenAddress(escrow.address)}
            </p>
            <button
              onClick={() => handleCopyToClipboard(escrow.address)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Copy address"
            >
              {copiedAddress === escrow.address ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-gray-600" />
              )}
            </button>
          </div>
        </div>
        {isMine && (
          <span className="px-2 py-1 text-xs bg-green-500 text-white rounded-full">
            Your Escrow
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <User className="h-3 w-3" />
            <span>Initializer</span>
          </div>
          <p className="text-xs font-mono">
            {shortenAddress(escrow.data.initializer.toBase58())}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <User className="h-3 w-3" />
            <span>Receiver</span>
          </div>
          <p className="text-xs font-mono">
            {shortenAddress(escrow.data.receiver.toBase58())}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Coins className="h-3 w-3" />
            <span>Offer</span>
          </div>
          <p className="text-sm font-semibold">
            {formatAmount(escrow.data.initializerAmount)}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Coins className="h-3 w-3" />
            <span>Request</span>
          </div>
          <p className="text-sm font-semibold">
            {formatAmount(escrow.data.receiverAmount, 6)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        <span>Expires: {formatDate(escrow.data.expiry)}</span>
      </div>
    </div>
  );

  if (!connected) {
    return (
      <div className="p-6 rounded-lg border-2 border-gray-200 bg-gray-50 text-center">
        <p className="text-sm text-gray-600">
          Connect your wallet to view escrows
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Escrows</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEscrows}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* My Escrow */}
      {myEscrow && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-green-700">
            Your Active Escrow
          </h3>
          <EscrowCard escrow={myEscrow} isMine />
        </div>
      )}

      {/* All Escrows Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          All Escrows ({allEscrows.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Hide" : "Show"}
        </Button>
      </div>

      {/* All Escrows List */}
      {showAll && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {allEscrows.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No escrows found
            </p>
          ) : (
            allEscrows.map((escrow) => (
              <EscrowCard
                key={escrow.address}
                escrow={escrow}
                isMine={escrow.address === myEscrow?.address}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
