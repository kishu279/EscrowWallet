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

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // By using an empty array the wallet will default to the wallets the user has installed.
  const wallets: Adapter[] = [];

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{
        // We're setting the commitment to 'processed'.
        // This lets us read data that has been confirmed by the cluster but not yet finalized.
        // This means that the data we're reading is most likely what will end up on-chain but is not guaranteed.
        commitment: "processed",
      }}
    >
      <WalletProvider wallets={wallets}>{children}</WalletProvider>
    </ConnectionProvider>
  );
}
