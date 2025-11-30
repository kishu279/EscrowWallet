"use client";

import { Adapter, WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";
import React, { useCallback, useMemo } from "react";

export default function Web3WalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // devnet, testnet, mainnet-beta -> on chain transactions environment
  const network = WalletAdapterNetwork.Devnet;

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Empty array allows auto-detection of installed browser wallets
  const wallets: Adapter[] = [];

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{
        // 'processed' commitment provides faster reads with cluster confirmation (not yet finalized)
        commitment: "processed",
      }}
    >
      <WalletProvider wallets={wallets} autoConnect={true}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
