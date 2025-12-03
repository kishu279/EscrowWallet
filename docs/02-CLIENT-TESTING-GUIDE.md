# Client Testing Guide

Complete guide to testing the Solana escrow program using Anchor's TypeScript client.

---

## Test Environment Setup

### Installation

```bash
npm install --save-dev @coral-xyz/anchor @solana/web3.js @solana/spl-token chai mocha ts-mocha
```

### Configuration

**Anchor.toml:**

```toml
[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### Test File Structure

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
} from "@solana/spl-token";
import { assert } from "chai";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.escrow as Program<Escrow>;

  // Test variables
  let mintX: anchor.web3.Keypair;
  let mintY: anchor.web3.Keypair;
  let receiver: anchor.web3.Keypair;

  before(async () => {
    // Setup code runs once before all tests
  });

  it("test case", async () => {
    // Test implementation
  });
});
```

**Reference:** https://book.anchor-lang.com/anchor_in_depth/testing.html

---

## Test Setup (Before Hook)

### 1. Generate Keypairs

```typescript
before(async () => {
  // Generate mint keypairs
  mintX = anchor.web3.Keypair.generate();
  mintY = anchor.web3.Keypair.generate();
  receiver = anchor.web3.Keypair.generate();
  feeCollector = anchor.web3.Keypair.generate();

  // Airdrop SOL to receiver
  const airdropSig = await provider.connection.requestAirdrop(
    receiver.publicKey,
    anchor.web3.LAMPORTS_PER_SOL * 2
  );
  await provider.connection.confirmTransaction(airdropSig);
});
```

### 2. Create Mints

```typescript
const mintRent = await getMinimumBalanceForRentExemptMint(provider.connection);

// Create mint account instruction
const createMintIx = anchor.web3.SystemProgram.createAccount({
  fromPubkey: provider.wallet.publicKey,
  newAccountPubkey: mintX.publicKey,
  space: MINT_SIZE,
  lamports: mintRent,
  programId: TOKEN_PROGRAM_ID,
});

// Initialize mint instruction
const initMintIx = createInitializeMintInstruction(
  mintX.publicKey,
  9, // decimals (SOL = 9, USDC = 6)
  provider.wallet.publicKey, // mint authority
  provider.wallet.publicKey, // freeze authority
  TOKEN_PROGRAM_ID
);
```

**Reference:** https://spl.solana.com/token#creating-a-new-mint

### 3. Create Associated Token Accounts

```typescript
// Derive ATA address
const ataX = getAssociatedTokenAddressSync(
  mintX.publicKey,
  provider.wallet.publicKey,
  false, // allowOwnerOffCurve
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
);

// Create ATA instruction
const createATAIx = createAssociatedTokenAccountInstruction(
  provider.wallet.publicKey, // payer
  ataX, // ATA address
  provider.wallet.publicKey, // owner
  mintX.publicKey, // mint
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
);
```

**Reference:** https://spl.solana.com/associated-token-account

### 4. Build and Send Transaction

```typescript
const latestBlockhash = await provider.connection.getLatestBlockhash();

const transaction = new anchor.web3.Transaction({
  feePayer: provider.wallet.publicKey,
  blockhash: latestBlockhash.blockhash,
  lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
}).add(createMintIx, initMintIx, createATAIx);

const signature = await anchor.web3.sendAndConfirmTransaction(
  provider.connection,
  transaction,
  [provider.wallet.payer, mintX] // Signers
);

console.log("Transaction Signature:", signature);
```

### 5. Mint Tokens

```typescript
const mintAmount = 100_000_000_000; // 100 tokens with 9 decimals

const mintToIx = createMintToInstruction(
  mintX.publicKey, // mint
  ataX, // destination
  provider.wallet.publicKey, // authority
  mintAmount,
  [],
  TOKEN_PROGRAM_ID
);

const mintTx = new anchor.web3.Transaction().add(mintToIx);
await anchor.web3.sendAndConfirmTransaction(provider.connection, mintTx, [
  provider.wallet.payer,
]);
```

**Reference:** https://spl.solana.com/token#minting-new-tokens

---

## Test Cases

### Test 1: Initialize Escrow

```typescript
it("initializes escrow", async () => {
  const initializerAmount = new anchor.BN(100_000_000_000); // 100 tokens
  const receiverAmount = new anchor.BN(100_000_000); // 100 USDC
  const expiry = new anchor.BN(Math.floor(Date.now() / 1000) + 300); // 5 min

  const tx = await program.methods
    .initializeEscrow(
      initializerAmount,
      receiverAmount,
      expiry,
      receiver.publicKey,
      100, // 1% fee
      feeCollector.publicKey
    )
    .accounts({
      initializer: provider.wallet.publicKey,
      initializerTokenAccount: ataX,
      initializerMint: mintX.publicKey,
      receiverMint: mintY.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Transaction signature:", tx);

  // Verify escrow account
  const [escrowPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  const escrow = await program.account.escrow.fetch(escrowPDA);

  // Assertions
  assert.ok(escrow.initializer.equals(provider.wallet.publicKey));
  assert.ok(escrow.receiver.equals(receiver.publicKey));
  assert.ok(escrow.initializerAmount.eq(initializerAmount));
  assert.ok(escrow.receiverAmount.eq(receiverAmount));
  assert.ok(escrow.expiry.eq(expiry));
});
```

### Test 2: Verify Vault Balances

```typescript
// Derive vault PDAs
const [escrowPDA] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), provider.wallet.publicKey.toBuffer()],
  program.programId
);

const [initializerVaultAuthority] =
  anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("initializer_vault"), escrowPDA.toBuffer()],
    program.programId
  );

// Derive vault ATA (owned by PDA)
const initializerVault = getAssociatedTokenAddressSync(
  mintX.publicKey,
  initializerVaultAuthority,
  true // allowOwnerOffCurve - PDA can own ATA
);

// Check balance
const balance = await provider.connection.getTokenAccountBalance(
  initializerVault
);

console.log("Vault balance:", balance.value.amount);
assert.equal(balance.value.amount, initializerAmount.toString());
```

**Key Point:** Use `allowOwnerOffCurve: true` when deriving ATAs owned by PDAs

**Reference:** https://spl.solana.com/associated-token-account#finding-the-associated-token-account-address

### Test 3: Claim Escrow

```typescript
it("claims escrow", async () => {
  const [escrowPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .claimEscrow()
    .accounts({
      escrow: escrowPDA,
      receiver: receiver.publicKey,
      initializer: provider.wallet.publicKey,
      initializerMint: mintX.publicKey,
      receiverMint: mintY.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([receiver]) // Receiver must sign
    .rpc();

  console.log("Claim transaction:", tx);

  // Note: Cannot fetch escrow after claim because it's closed
  // Verify by checking token balances instead
});
```

### Test 4: Error Handling

```typescript
it("fails with expired escrow", async () => {
  // Create escrow with past expiry
  const pastExpiry = new anchor.BN(Math.floor(Date.now() / 1000) - 100);

  await program.methods
    .initializeEscrow(
      initializerAmount,
      receiverAmount,
      pastExpiry,
      receiver.publicKey,
      100,
      feeCollector.publicKey
    )
    .accounts({
      /* ... */
    })
    .rpc();

  // Try to claim
  try {
    await program.methods
      .claimEscrow()
      .accounts({
        /* ... */
      })
      .signers([receiver])
      .rpc();

    assert.fail("Should have thrown EscrowExpired error");
  } catch (error) {
    assert.include(error.toString(), "EscrowExpired");
  }
});
```

---

## Common Patterns

### PDA Derivation

```typescript
const [pda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), publicKey.toBuffer()],
  program.programId
);
```

### Check Token Balance

```typescript
const balance = await provider.connection.getTokenAccountBalance(ata);
console.log("Amount:", balance.value.amount); // Raw amount
console.log("UI Amount:", balance.value.uiAmount); // Decimal adjusted
console.log("Decimals:", balance.value.decimals);
```

### Transaction Simulation

```typescript
const simulation = await program.methods
  .initializeEscrow(/* ... */)
  .accounts({
    /* ... */
  })
  .simulate();

console.log("Logs:", simulation.logs);
console.log("Units consumed:", simulation.unitsConsumed);
```

**Reference:** https://solana-labs.github.io/solana-web3.js/classes/Connection.html#simulateTransaction

---

## Troubleshooting

### Issue: "Account does not exist"

**Cause:** ATA not created before use

**Solution:**

```typescript
const ata = getAssociatedTokenAddressSync(mint, owner);
const info = await provider.connection.getAccountInfo(ata);

if (!info) {
  const createIx = createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint
  );
  await sendTransaction(createIx);
}
```

### Issue: "Provided owner is not allowed"

**Cause:** Creating ATA with PDA owner without `allowOwnerOffCurve`

**Solution:**

```typescript
const ata = getAssociatedTokenAddressSync(
  mint,
  pdaAuthority,
  true // allowOwnerOffCurve = true
);
```

### Issue: "Seeds constraint violated"

**Cause:** PDA seeds don't match program definition

**Solution:** Ensure seeds match exactly:

```typescript
// Client
[Buffer.from("escrow"), publicKey.toBuffer()]

// Program
seeds = [b"escrow", initializer.key().as_ref()]
```

### Issue: "Transaction too large"

**Solution:** Split into multiple transactions

```typescript
const tx1 = new Transaction().add(ix1, ix2);
const tx2 = new Transaction().add(ix3, ix4);

await provider.sendAndConfirm(tx1);
await provider.sendAndConfirm(tx2);
```

---

## Best Practices

### Helper Functions

```typescript
async function setupMint(decimals: number): Promise<{
  mint: Keypair;
  ata: PublicKey;
}> {
  const mint = Keypair.generate();

  // Create mint
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  const createIx = SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: mint.publicKey,
    space: MINT_SIZE,
    lamports: mintRent,
    programId: TOKEN_PROGRAM_ID,
  });

  const initIx = createInitializeMintInstruction(
    mint.publicKey,
    decimals,
    payer,
    payer
  );

  // Create ATA and mint tokens
  const ata = getAssociatedTokenAddressSync(mint.publicKey, payer);
  const createATAIx = createAssociatedTokenAccountInstruction(
    payer,
    ata,
    payer,
    mint.publicKey
  );

  const mintToIx = createMintToInstruction(
    mint.publicKey,
    ata,
    payer,
    100 * 10 ** decimals
  );

  await sendTransaction([createIx, initIx, createATAIx, mintToIx], [mint]);

  return { mint, ata };
}
```

### Comprehensive Assertions

```typescript
assert.ok(escrow.initializer.equals(expectedInitializer));
assert.ok(escrow.receiver.equals(expectedReceiver));
assert.ok(escrow.initializerAmount.eq(expectedAmount));
assert.equal(escrow.feeBasisPoints, 100);
```

### Test Organization

```typescript
describe("initialization", () => {
  beforeEach(async () => {
    // Setup for this test suite
  });

  it("should initialize with valid parameters", async () => {});
  it("should fail with invalid expiry", async () => {});
});

describe("claiming", () => {
  beforeEach(async () => {
    // Initialize escrow before each claim test
  });

  it("should claim successfully", async () => {});
  it("should fail if not receiver", async () => {});
});
```

---

## Running Tests

```bash
# Start local validator
solana-test-validator

# Run all tests
anchor test

# Skip build
anchor test --skip-build

# Skip validator (if already running)
anchor test --skip-local-validator

# Run specific test
anchor test -- --grep "initializes escrow"
```

---

## Key References

- **Anchor Testing:** https://book.anchor-lang.com/anchor_in_depth/testing.html
- **Mocha Documentation:** https://mochajs.org/
- **Chai Assertions:** https://www.chaijs.com/api/assert/
- **SPL Token Testing:** https://solanacookbook.com/references/token.html
- **Web3.js Connection:** https://solana-labs.github.io/solana-web3.js/classes/Connection.html
- **Transaction Guide:** https://solanacookbook.com/references/basic-transactions.html
- **Solana Test Validator:** https://docs.solana.com/developing/test-validator

---

**Last Updated:** December 2025 | **Mocha:** 10.x | **Anchor:** 0.30.x
