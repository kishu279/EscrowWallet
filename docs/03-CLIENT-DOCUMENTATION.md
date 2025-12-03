# Escrow Client Documentation

## Overview

Building a Next.js frontend for the Solana escrow program with wallet integration, token handling, and ATA management.

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [Wallet Integration](#wallet-integration)
3. [Solana Provider](#solana-provider)
4. [ATA Management (Critical!)](#ata-management-critical)
5. [Program Interactions](#program-interactions)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [External References](#external-references)

---

## Project Setup

### Dependencies

```bash
pnpm add @solana/wallet-adapter-react @solana/wallet-adapter-react-ui \
  @solana/wallet-adapter-wallets @solana/web3.js @solana/spl-token \
  @coral-xyz/anchor
```

---

## Wallet Integration

### Wallet Provider

```typescript
// components/wallet-provider.tsx
"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";

export default function Web3WalletProvider({ children }) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  return (
    <ConnectionProvider
      endpoint={endpoint}
      config={{ commitment: "processed" }}
    >
      <WalletProvider wallets={[]} autoConnect={true}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### Wallet Button

```typescript
// components/WalletButton.tsx
"use client";

import { useWallet } from "@solana/wallet-adapter-react";

export default function WalletButton() {
  const { connected, connect, disconnect, publicKey, wallets, select } =
    useWallet();

  const connectWallet = async (adapter) => {
    select(adapter.name);
    await connect();
  };

  return (
    <div>
      {connected ? (
        <button onClick={disconnect}>{publicKey.toString()}</button>
      ) : (
        wallets.map((w) => (
          <button key={w.adapter.name} onClick={() => connectWallet(w.adapter)}>
            {w.adapter.name}
          </button>
        ))
      )}
    </div>
  );
}
```

---

## Solana Provider

### Custom Provider Hook

```typescript
// hook/solana-provider.ts
"use client";

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import * as anchor from "@coral-xyz/anchor";

export function useSolanaProvider() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet) return undefined;

    return new anchor.AnchorProvider(connection, wallet, {
      commitment: "processed",
    });
  }, [connection, wallet]);

  return provider;
}
```

---

## ATA Management (Critical!)

### The Problem

**Error:** "Account does not exist or has no data"

**Cause:** Passing an ATA address that hasn't been created yet to the program.

### The Solution: Check & Create ATA

```typescript
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

async function ensureATA(connection, payer, owner, mint) {
  // Derive ATA address
  const ata = getAssociatedTokenAddressSync(mint, owner);

  // Check if exists
  const ataInfo = await connection.getAccountInfo(ata);

  if (!ataInfo) {
    console.log("Creating ATA...");

    const createIx = createAssociatedTokenAccountInstruction(
      payer, // payer
      ata, // ata address
      owner, // owner
      mint // mint
    );

    const tx = new Transaction().add(createIx);
    const signature = await provider.sendAndConfirm!(tx);
    console.log("ATA created:", signature);
  }

  return ata;
}
```

---

## Program Interactions

### Initialize Escrow

```typescript
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "../utils/escrow.json";

export async function initializeEscrow(
  senderPubKey,
  receiverPubkey,
  initializerAmount,
  receiverAmount,
  tokenMint,
  receiverMint,
  provider
) {
  const program = new Program(idl, provider);

  // Get sender's ATA
  const ata = getAssociatedTokenAddressSync(tokenMint, senderPubKey);

  // CHECK: Ensure ATA exists
  const ataInfo = await provider.connection.getAccountInfo(ata);
  if (!ataInfo) {
    const createIx = createAssociatedTokenAccountInstruction(
      senderPubKey,
      ata,
      senderPubKey,
      tokenMint
    );
    const tx = new Transaction().add(createIx);
    await provider.sendAndConfirm!(tx);
  }

  // CHECK: Token balance
  const balance = await provider.connection.getTokenAccountBalance(ata);
  if (BigInt(balance.value.amount) < BigInt(initializerAmount)) {
    throw new Error("Insufficient balance");
  }

  // Initialize escrow
  const tx = await program.methods
    .initializeEscrow(
      new anchor.BN(initializerAmount),
      new anchor.BN(receiverAmount),
      new anchor.BN(Math.floor(Date.now() / 1000) + 300000),
      receiverPubkey,
      100,
      FEE_COLLECTOR
    )
    .accounts({
      initializer: senderPubKey,
      initializerTokenAccount: ata,
      initializerMint: tokenMint,
      receiverMint: receiverMint,
    })
    .rpc();

  return tx;
}
```

### Claim Escrow

```typescript
export async function claimEscrow(escrowAddress, provider) {
  const program = new Program(idl, provider);

  const tx = await program.methods
    .claimEscrow()
    .accounts({
      escrow: new PublicKey(escrowAddress),
    })
    .rpc();

  return tx;
}
```

### Fetch User's Escrow

```typescript
export async function getUserEscrow(userPublicKey, provider) {
  const program = new Program(idl, provider);

  try {
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), userPublicKey.toBuffer()],
      program.programId
    );

    const escrow = await program.account.escrow.fetch(escrowPda);
    return { address: escrowPda.toBase58(), data: escrow };
  } catch {
    return null;
  }
}
```

---

## Common Issues & Solutions

### Issue 1: Native SOL vs wSOL

**Problem:** SPL Token program only works with SPL tokens, not native SOL.

**Solution: Wrap SOL**

```typescript
import { NATIVE_MINT, createSyncNativeInstruction } from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";

async function wrapSol(connection, payer, amount) {
  const ata = getAssociatedTokenAddressSync(NATIVE_MINT, payer);

  const instructions = [];
  const ataInfo = await connection.getAccountInfo(ata);

  if (!ataInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(payer, ata, payer, NATIVE_MINT)
    );
  }

  // Transfer SOL to ATA
  instructions.push(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: ata,
      lamports: amount,
    })
  );

  // Sync to mark as wSOL
  instructions.push(createSyncNativeInstruction(ata));

  const tx = new Transaction().add(...instructions);
  return await sendAndConfirmTransaction(connection, tx, [payerKeypair]);
}
```

### Issue 2: Token Decimals

**Problem:** Different tokens have different decimals.

**Solution:**

```typescript
// Get mint decimals
const mintInfo = await connection.getParsedAccountInfo(mintAddress);
const decimals = mintInfo.value?.data?.parsed?.info?.decimals || 9;

// Convert UI to raw
const rawAmount = Math.floor(uiAmount * Math.pow(10, decimals));

// Convert raw to UI
const uiAmount = Number(rawAmount) / Math.pow(10, decimals);
```

### Issue 3: Transaction Confirmation

**Problem:** Transaction sent but not confirmed.

**Solution:**

```typescript
const signature = await program.methods.initialize(/* ... */).rpc();
await provider.connection.confirmTransaction(signature, "confirmed");

// Or check transaction details
const txDetails = await provider.connection.getTransaction(signature, {
  commitment: "confirmed",
  maxSupportedTransactionVersion: 0,
});

if (txDetails?.meta?.err) {
  console.error("Transaction failed:", txDetails.meta.err);
}
```

### Issue 4: Insufficient SOL

**Problem:** Not enough SOL for rent/fees.

**Solution:**

```typescript
const balance = await connection.getBalance(publicKey);
const minBalance = 0.01 * LAMPORTS_PER_SOL;

if (balance < minBalance) {
  throw new Error("Need at least 0.01 SOL for transaction fees");
}
```

### Issue 5: Program IDL Sync

**Problem:** Client IDL doesn't match deployed program.

**Solution:**

```bash
anchor build
cp target/idl/escrow.json app/escrow/utils/escrow.json
cp target/types/escrow.ts app/escrow/utils/escrow.ts
```

---

## Best Practices

### Error Handling

```typescript
try {
  const tx = await initializeEscrow(/* ... */);
  toast.success("Success!", { description: tx });
} catch (err) {
  let message = "Transaction failed";

  if (err.message?.includes("Insufficient balance")) {
    message = "Insufficient token balance";
  } else if (err.message?.includes("User rejected")) {
    message = "Transaction cancelled";
  }

  toast.error(message, { description: err.message });
}
```

### Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleInitialize = async () => {
  setIsLoading(true);
  try {
    await initializeEscrow(/* ... */);
  } finally {
    setIsLoading(false);
  }
};
```

### Configuration

```typescript
// lib/config.ts
export const FEE_COLLECTOR = new PublicKey("...");

export const TOKENS = [
  { name: "wSOL", address: NATIVE_MINT.toBase58() },
  { name: "USDC", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
];
```

---

## External References

- **Wallet Adapter:** https://github.com/anza-xyz/wallet-adapter
- **SPL Token:** https://spl.solana.com/token
- **ATAs:** https://spl.solana.com/associated-token-account
- **Anchor Client:** https://book.anchor-lang.com/anchor_in_depth/client.html
- **Web3.js:** https://solana-labs.github.io/solana-web3.js/

---

**Last Updated:** December 2025
**Framework:** Next.js 14 | **Wallet Adapter:** 0.15.x
