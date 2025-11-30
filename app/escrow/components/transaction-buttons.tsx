"use client";

import React, { useCallback } from "react";
import {
  claimSolanaProgram,
  cn,
  initializeSolanaProgram,
  shortenAddress,
} from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Wallet, AlertCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKENS_MINT_ADDRESSES } from "@/lib/config";
import { useSolanaProvider } from "@/hook/solana-provider";
import { PublicKey } from "@solana/web3.js";
import WrapSolButton from "@/components/wrap-sol-button";
import { NATIVE_MINT } from "@solana/spl-token";
import { toast } from "sonner";

interface TransactBttnProps {
  logo: string;
  type: "initialize" | "claim";
}

const classProperties = {
  initialize: {
    backgroundColor: "bg-green-200",
    color: "text-green-500",
    border: "border-green-500",
    sectionBg: "bg-green-50/50",
    sectionBorder: "border-green-200",
    sectionText: "text-green-700",
    focusRing: "focus:ring-green-500",
  },
  claim: {
    backgroundColor: "bg-sky-200",
    color: "text-sky-500",
    border: "border-sky-500",
    sectionBg: "bg-sky-50/50",
    sectionBorder: "border-sky-200",
    sectionText: "text-sky-700",
    focusRing: "focus:ring-sky-500",
  },
};

const tokens = TOKENS_MINT_ADDRESSES;

export default function TransactBttn(props: TransactBttnProps) {
  const styles = classProperties[props.type || "initialize"];
  const [open, setOpen] = React.useState(false);
  const [tokenToGive, setTokenToGive] = React.useState("");
  const [tokenToReceive, setTokenToReceive] = React.useState("");
  const [escrowId, setEscrowId] = React.useState<string>("");

  // get the connected wallet
  const { publicKey: MYKEY, connected, wallet } = useWallet();

  // get the provider associated with the wallet
  const provider = useSolanaProvider();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      tokenToGive,
      amountToGive: formData.get("amountToGive"),
      tokenToReceive,
      amountToReceive: formData.get("amountToReceive"),
      recipient: formData.get("recipient"),
      escrowId: formData.get("escrow-id") || escrowId,
    };

    if (props.type === "initialize") {
      handleInitialize(data);
    } else {
      handleClaim(data);
    }
    setOpen(false);
  };

  const handleInitialize = useCallback(
    async (data: any) => {
      if (provider === undefined || !connected) {
        console.error("Error initializing escrow:");
        return;
      }

      try {
        const initializerMint = new PublicKey(
          data.tokenToGive.toString() === NATIVE_MINT.toBase58()
            ? NATIVE_MINT
            : data.tokenToGive
        );
        const receiverMint = new PublicKey(
          data.tokenToReceive.toString() === NATIVE_MINT.toBase58()
            ? NATIVE_MINT
            : data.tokenToReceive
        );

        const [initializerMintInfo, receiverMintInfo] = await Promise.all([
          provider.connection.getParsedAccountInfo(initializerMint),
          provider.connection.getParsedAccountInfo(receiverMint),
        ]);

        const initializerDecimals =
          (initializerMintInfo.value?.data as any)?.parsed?.info?.decimals || 9;
        const receiverDecimals =
          (receiverMintInfo.value?.data as any)?.parsed?.info?.decimals || 6;

        // Convert amounts to raw values based on decimals
        const initializerAmount = Math.floor(
          parseFloat(data.amountToGive) * Math.pow(10, initializerDecimals)
        );
        const receiverAmount = Math.floor(
          parseFloat(data.amountToReceive) * Math.pow(10, receiverDecimals)
        );

        const transaction = await initializeSolanaProgram(
          MYKEY!,
          new PublicKey(data.recipient),
          initializerAmount,
          receiverAmount,
          initializerMint,
          receiverMint,
          provider
        );

        console.log("Transaction ID:", transaction);

        toast("Escrow Initialized", {
          description: `Id: ${transaction}`,
        });
      } catch (err) {
        console.error("Error initializing escrow:", err);
      }
    },
    [provider, connected, MYKEY]
  );

  const handleClaim = useCallback(
    async (data: any) => {
      if (provider === undefined || !connected) {
        console.error("Error claiming escrow:");
        return;
      }

      const finalEscrowId = data.escrowId || escrowId;

      if (!finalEscrowId) {
        console.error("Escrow ID is required");
        return;
      }

      try {
        const transaction = await claimSolanaProgram(
          finalEscrowId.toString(),
          provider as any
        );
        console.log("Transaction ID:", transaction);
      } catch (err) {
        console.error("Error claiming escrow:", err);
      }
    },
    [provider, escrowId]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "h-32 w-full rounded-xl font-semibold text-lg border-2 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105",
            styles.backgroundColor,
            styles.color,
            styles.border
          )}
        >
          {props.logo}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {props.type === "initialize" ? "Initialize Escrow" : "Claim Escrow"}
          </DialogTitle>
          <DialogDescription>
            {props.type === "initialize"
              ? "Create a new escrow transaction by filling in the details below."
              : "Claim your funds from an existing escrow transaction."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 py-4">
            {connected && MYKEY ? (
              <>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-linear-to-r from-purple-50 to-indigo-50 border border-purple-200">
                  <Wallet className="h-4 w-4 text-purple-600" />
                  <div className="flex flex-col flex-1">
                    <span className="text-xs text-gray-600">
                      Connected Wallet
                    </span>
                    <span className="text-sm font-semibold text-purple-700">
                      {shortenAddress(MYKEY?.toString())}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border-2 border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-red-700">
                    Wallet Not Connected
                  </span>
                  <span className="text-xs text-red-600">
                    Please connect your wallet to continue with transactions.
                    Click the "Connect Wallet" button in the header.
                  </span>
                </div>
              </div>
            )}

            {props.type === "initialize" && connected && <WrapSolButton />}

            {props.type === "initialize" ? (
              <>
                <div
                  className={cn(
                    "space-y-3 p-4 rounded-lg border-2",
                    styles.sectionBorder,
                    styles.sectionBg
                  )}
                >
                  <label
                    className={cn(
                      "text-sm font-semibold flex items-center gap-2",
                      styles.sectionText
                    )}
                  >
                    You Give
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="tokenToGive"
                        className="text-xs font-medium text-gray-600"
                      >
                        Token
                      </label>
                      <Select
                        value={tokenToGive}
                        onValueChange={setTokenToGive}
                        required
                      >
                        <SelectTrigger id="tokenToGive" className="w-full">
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                        <SelectContent>
                          {tokens.map((item) => (
                            <SelectItem key={item.address} value={item.address}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="amountToGive"
                        className="text-xs font-medium text-gray-600"
                      >
                        Amount
                      </label>
                      <input
                        id="amountToGive"
                        name="amountToGive"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className={cn(
                          "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2",
                          styles.focusRing
                        )}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center -my-2">
                  <div className="bg-white rounded-full p-2 border-2 border-gray-300 shadow-sm">
                    <ArrowLeftRight className="h-5 w-5 text-gray-600" />
                  </div>
                </div>

                <div
                  className={cn(
                    "space-y-3 p-4 rounded-lg border-2",
                    styles.sectionBorder,
                    styles.sectionBg
                  )}
                >
                  <label
                    className={cn(
                      "text-sm font-semibold flex items-center gap-2",
                      styles.sectionText
                    )}
                  >
                    You Want
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="tokenToReceive"
                        className="text-xs font-medium text-gray-600"
                      >
                        Token
                      </label>
                      <Select
                        value={tokenToReceive}
                        onValueChange={setTokenToReceive}
                        required
                      >
                        <SelectTrigger id="tokenToReceive" className="w-full">
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                        <SelectContent>
                          {tokens.map((item) => (
                            <SelectItem key={item.address} value={item.address}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="amountToReceive"
                        className="text-xs font-medium text-gray-600"
                      >
                        Amount
                      </label>
                      <input
                        id="amountToReceive"
                        name="amountToReceive"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className={cn(
                          "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2",
                          styles.focusRing
                        )}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="recipient" className="text-sm font-medium">
                    Recipient Address
                  </label>
                  <input
                    id="recipient"
                    name="recipient"
                    type="text"
                    placeholder="Enter recipient wallet address"
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2",
                      styles.focusRing
                    )}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <label htmlFor="escrow-id" className="text-sm font-medium">
                  Escrow ID
                </label>
                <input
                  id="escrow-id"
                  name="escrow-id"
                  value={escrowId}
                  onChange={(ev) => setEscrowId(ev.target.value)}
                  type="text"
                  placeholder="Enter escrow ID or select from list"
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2",
                    styles.focusRing
                  )}
                  required
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={cn(
                styles.backgroundColor,
                styles.color,
                "hover:opacity-90"
              )}
              disabled={!connected}
            >
              {props.type === "initialize"
                ? "Initialize Escrow"
                : "Claim Escrow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
