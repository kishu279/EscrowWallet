"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSolanaProvider } from "@/hook/solana-provider";
import { getAllEscrows, shortenAddress } from "@/lib/utils";
import { formatDate, formatAmount, copyToClipboard } from "@/lib/helper";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Clock,
  User,
  Coins,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import NavHeader from "@/components/header";

interface EscrowData {
  address: string;
  data: any;
}

export default function HistoryPage() {
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { connected, publicKey } = useWallet();
  const provider = useSolanaProvider();

  const fetchEscrows = async () => {
    if (!provider) return;

    setLoading(true);
    try {
      const allEscrows = await getAllEscrows(provider as any);
      setEscrows(allEscrows);
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

  const isMyEscrow = (escrow: EscrowData) => {
    if (!publicKey) return false;
    return (
      escrow.data.initializer.toBase58() === publicKey.toBase58() ||
      escrow.data.receiver.toBase58() === publicKey.toBase58()
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <NavHeader />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Escrow History</h1>
                <p className="text-sm text-gray-600 mt-1">
                  All escrow transactions on the platform
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEscrows}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <p className="text-sm text-gray-600">Total Escrows</p>
              <p className="text-2xl font-bold">{escrows.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <p className="text-sm text-gray-600">Your Escrows</p>
              <p className="text-2xl font-bold">
                {escrows.filter((e) => isMyEscrow(e)).length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <p className="text-sm text-gray-600">Other Escrows</p>
              <p className="text-2xl font-bold">
                {escrows.filter((e) => !isMyEscrow(e)).length}
              </p>
            </div>
          </div>

          {/* Escrow List */}
          <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
            {escrows.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">
                  {loading ? "Loading escrows..." : "No escrows found"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Escrow Address
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Initializer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Receiver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Offer
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Request
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Expiry
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {escrows.map((escrow) => (
                      <tr
                        key={escrow.address}
                        className={`hover:bg-gray-50 transition-colors ${
                          isMyEscrow(escrow) ? "bg-green-50/30" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">
                              {shortenAddress(escrow.address)}
                            </span>
                            <button
                              onClick={() =>
                                handleCopyToClipboard(escrow.address)
                              }
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              {copiedAddress === escrow.address ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-500" />
                            <span className="text-sm font-mono">
                              {shortenAddress(
                                escrow.data.initializer.toBase58()
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-500" />
                            <span className="text-sm font-mono">
                              {shortenAddress(escrow.data.receiver.toBase58())}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Coins className="h-3 w-3 text-gray-500" />
                            <span className="text-sm font-semibold">
                              {formatAmount(escrow.data.initializerAmount)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Coins className="h-3 w-3 text-gray-500" />
                            <span className="text-sm font-semibold">
                              {formatAmount(escrow.data.receiverAmount, 6)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <span className="text-xs text-gray-600">
                              {formatDate(escrow.data.expiry)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isMyEscrow(escrow) ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                              Your Escrow
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              Other
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
