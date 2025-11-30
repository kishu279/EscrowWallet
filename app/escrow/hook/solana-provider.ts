import React from "react";
import { AnchorProvider, Provider } from "@coral-xyz/anchor";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";

export function useSolanaProvider(): Provider | undefined {
  const [provider, setProvider] = React.useState<Provider>();
  const { connection } = useConnection();
  const { connected } = useWallet();
  const anchorWallet = useAnchorWallet();

  React.useEffect(() => {
    if (connected && anchorWallet && connection) {
      setProvider(
        new AnchorProvider(connection, anchorWallet, {
          commitment: "processed",
        })
      );
    }
  }, [connection, connected, anchorWallet]);

  return provider;
}
