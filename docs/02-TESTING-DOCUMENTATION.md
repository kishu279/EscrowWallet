# Escrow Testing Documentation

## Overview

Testing guide for the Solana escrow program using Anchor's testing framework with TypeScript and Mocha.

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Account Setup](#account-setup)
3. [Test Cases](#test-cases)
4. [Common Patterns](#common-patterns)
5. [Troubleshooting](#troubleshooting)
6. [External References](#external-references)

---

## Test Environment Setup

### Configuration

**Anchor.toml:**

```toml
[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Commands

```bash
# Start validator
solana-test-validator

# Run tests
anchor test
anchor test --skip-build
anchor test --skip-local-validator
```

### Test File Structure

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { assert } from "chai";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrow as Program<Escrow>;

  before(async () => {
    // Setup runs once
  });

  it("test case", async () => {
    // Test code
  });
});
```

---

## Account Setup

### 1. Mint Creation

```typescript
const mint = anchor.web3.Keypair.generate();
const mintRent = await getMinimumBalanceForRentExemptMint(connection);

// Create account
const createAccountIx = SystemProgram.createAccount({
  fromPubkey: payer.publicKey,
  newAccountPubkey: mint.publicKey,
  space: MINT_SIZE,
  lamports: mintRent,
  programId: TOKEN_PROGRAM_ID,
});

// Initialize mint
const initMintIx = createInitializeMintInstruction(
  mint.publicKey,
  9, // decimals
  payer.publicKey, // mint authority
  payer.publicKey // freeze authority
);
```

### 2. ATA Creation

```typescript
// Derive ATA address
const ata = getAssociatedTokenAddressSync(mint.publicKey, owner.publicKey);

// Create ATA
const createATAIx = createAssociatedTokenAccountInstruction(
  payer.publicKey, // payer
  ata, // ata address
  owner.publicKey, // owner
  mint.publicKey // mint
);
```

### 3. Minting Tokens

```typescript
const mintToIx = createMintToInstruction(
  mint.publicKey,
  ata,
  payer.publicKey,
  100_000_000_000, // amount
  []
);
```

### 4. Airdrop SOL

```typescript
const signature = await connection.requestAirdrop(
  account.publicKey,
  anchor.web3.LAMPORTS_PER_SOL * 2
);
await connection.confirmTransaction(signature);
```

---

## Test Cases

### Initialize Escrow

```typescript
it("initializes escrow", async () => {
  const tx = await program.methods
    .initializeEscrow(
      new anchor.BN(100_000_000_000),
      new anchor.BN(100_000_000),
      new anchor.BN(Math.floor(Date.now() / 1000) + 300),
      receiver.publicKey,
      100,
      feeCollector.publicKey
    )
    .accounts({
      initializer: provider.wallet.publicKey,
      initializerTokenAccount: initializerATA,
      initializerMint: mintX.publicKey,
      receiverMint: mintY.publicKey,
    })
    .rpc();

  // Verify escrow
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  const escrow = await program.account.escrow.fetch(escrowPDA);
  assert.ok(escrow.initializer.equals(provider.wallet.publicKey));
});
```

### Claim Escrow

```typescript
it("claims escrow", async () => {
  const [escrowPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), initializer.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .claimEscrow()
    .accounts({
      escrow: escrowPDA,
      receiver: receiver.publicKey,
      initializer: initializer,
      initializerMint: mintX.publicKey,
      receiverMint: mintY.publicKey,
    })
    .signers([receiver])
    .rpc();
});
```

---

## Common Patterns

### PDA Derivation

```typescript
const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), initializer.toBuffer()],
  program.programId
);
```

### Check Token Balance

```typescript
const balance = await connection.getTokenAccountBalance(ata);
console.log("Amount:", balance.value.amount);
console.log("UI Amount:", balance.value.uiAmount);
```

### Test Errors

```typescript
it("fails with expired escrow", async () => {
  try {
    await program.methods.claimEscrow().accounts({...}).rpc();
    assert.fail("Should have thrown");
  } catch (error) {
    assert.include(error.toString(), "EscrowExpired");
  }
});
```

### Transaction Simulation

```typescript
const simulation = await program.methods
  .initializeEscrow(/* ... */)
  .accounts({...})
  .simulate();

console.log("Logs:", simulation.logs);
```

---

## Troubleshooting

### Issue: "Account does not exist"

**Problem:** ATA not created before transaction

**Solution:**

```typescript
const ata = getAssociatedTokenAddressSync(mint, owner);
const ataInfo = await connection.getAccountInfo(ata);

if (!ataInfo) {
  const createIx = createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint
  );
  await sendTransaction(createIx);
}
```

### Issue: "Insufficient funds"

**Problem:** Not enough SOL for rent

**Solution:**

```typescript
const airdrop = await connection.requestAirdrop(
  account.publicKey,
  LAMPORTS_PER_SOL * 5
);
await connection.confirmTransaction(airdrop);
```

### Issue: "Seeds constraint violated"

**Problem:** PDA seeds don't match

**Solution:**

```typescript
// Ensure seeds match exactly with program
const [pda] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), initializer.toBuffer()],
  program.programId
);
```

### Issue: "Transaction too large"

**Problem:** Too many instructions

**Solution:**

```typescript
// Split into multiple transactions
const tx1 = new Transaction().add(ix1, ix2);
const tx2 = new Transaction().add(ix3, ix4);

await provider.sendAndConfirm(tx1);
await provider.sendAndConfirm(tx2);
```

---

## Best Practices

### Helper Functions

```typescript
async function setupMint(decimals: number, amount: number) {
  const mint = Keypair.generate();
  // Create and initialize mint
  // Create ATA
  // Mint tokens
  return { mint, ata };
}
```

### Comprehensive Assertions

```typescript
assert.ok(escrow.initializer.equals(expectedInitializer));
assert.ok(escrow.receiver.equals(expectedReceiver));
assert.ok(escrow.initializerAmount.eq(expectedAmount));
```

### Test Organization

```typescript
describe("initialization", () => {
  it("should initialize with valid parameters", async () => {});
  it("should fail with invalid expiry", async () => {});
});

describe("claiming", () => {
  beforeEach(async () => {
    /* setup */
  });
  it("should claim successfully", async () => {});
});
```

---

## External References

- **Anchor Testing:** https://book.anchor-lang.com/anchor_in_depth/testing.html
- **Mocha Docs:** https://mochajs.org/
- **Solana Test Validator:** https://docs.solana.com/developing/test-validator
- **SPL Token Testing:** https://solanacookbook.com/references/token.html

---

**Last Updated:** December 2025
**Framework:** Mocha + Chai | **Anchor:** 0.30.x
