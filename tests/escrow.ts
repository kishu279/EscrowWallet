import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
const { assert } = require("chai");

import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  createAssociatedTokenAccount,
} from "@solana/spl-token";

describe("escrow", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrow as Program<Escrow>;

  let mintX: PublicKey;
  let mintY: PublicKey;
  let initializer: Keypair;
  let reciever: Keypair;
  let initializerTokenAccountX: PublicKey;
  let initializerTokenAccountY: PublicKey;
  let recieverTokenAccountX: PublicKey;
  let recieverTokenAccountY: PublicKey;

  let escrowAccount: Keypair;

  // let initializerVaultAuthority: Keypair;
  // let recieverVaultAuthority: Keypair;

  // let initialiazerVaultAccount: PublicKey;
  // let recieverVaultAccount: PublicKey;

  let feeCollectorAccount: PublicKey;

  let escrowAmount = new anchor.BN(5 * 1e9); // 500 SOL from reciever to initializer
  let recieverAmount = new anchor.BN(300 * 1e6); // 300 USDC from initializer to reciever

  const expiry = new anchor.BN(Math.floor(Date.now() / 1000) + 60 * 5);

  before(async () => {
    // airdrop solana to initializer
    initializer = Keypair.generate();

    const airdropSig = await provider.connection.requestAirdrop(
      initializer.publicKey,
      LAMPORTS_PER_SOL * 10
    );
    await provider.connection.confirmTransaction(airdropSig);

    // airdrop solana to reciever
    reciever = Keypair.generate();

    const airdropSig2 = await provider.connection.requestAirdrop(
      reciever.publicKey,
      LAMPORTS_PER_SOL * 10
    );

    mintX = await createMint(
      provider.connection,
      (provider.wallet as any).payer,
      provider.wallet.publicKey,
      null,
      9
    ); // SOL mint

    mintY = await createMint(
      provider.connection,
      (provider.wallet as any).payer,
      provider.wallet.publicKey,
      null,
      6
    ); // USDC mint

    // Minting tokens to initializer and reciever
    initializerTokenAccountX = await createAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintX, // sol minted
      initializer.publicKey
    );

    initializerTokenAccountY = await createAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintY, // usdc minted
      initializer.publicKey
    );

    recieverTokenAccountX = await createAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintX, // sol minted
      reciever.publicKey
    );

    recieverTokenAccountY = await createAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintY, // usdc minted
      reciever.publicKey
    );

    escrowAccount = Keypair.generate();

    feeCollectorAccount = provider.wallet.publicKey;

    let feeCollectorInitializerAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintX, // token from initializer side (wSOL)
      feeCollectorAccount
    );

    let feeCollectorReceiverAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintY, // token from receiver side (USDC)
      feeCollectorAccount
    );
  });

  it("Initializes escrow", async () => {
    try {
      await program.methods
        .initializeEscrow(
          escrowAmount,
          recieverAmount,
          expiry,
          reciever.publicKey,
          100,
          feeCollectorAccount
        )
        .accounts({
          escrow: escrowAccount.publicKey,
          initializer: initializer.publicKey,
          initializerTokenAccount: initializerTokenAccountX,
          initializerMint: mintX,
          recieverMint: mintY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([escrowAccount])
        .rpc();

      console.log("Escrow initialized");
    } catch (e) {
      console.error(e);
    }

    const findEscrowAccount = await program.account.escrow.fetch(
      escrowAccount.publicKey
    );

    assert.ok(findEscrowAccount.initializer.equals(initializer.publicKey));
    assert.ok(findEscrowAccount.receiver.equals(reciever.publicKey));
    assert.ok(findEscrowAccount.initializerMint.equals(mintX));
    assert.ok(findEscrowAccount.receiverMint.equals(mintY));
    assert.ok(findEscrowAccount.receiverAmount.eq(recieverAmount));
    assert.ok(findEscrowAccount.initializerAmount.eq(escrowAmount));
    assert.ok(findEscrowAccount.expiry.eq(expiry));
  });
});
