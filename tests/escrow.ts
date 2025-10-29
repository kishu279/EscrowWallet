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
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("escrow", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrow as Program<Escrow>;

  let mintX: PublicKey;
  let mintY: PublicKey;
  let initializer: Keypair;
  let receiver: Keypair;
  let initializerTokenAccountX: PublicKey;
  let initializerTokenAccountY: PublicKey;
  let recieverTokenAccountX: PublicKey;
  let recieverTokenAccountY: PublicKey;
  let feeCollectorTokenAccountX: PublicKey;
  // let feeCollectorTokenAccountY: PublicKey;

  let escrowAccount: Keypair;
  let feeCollectorAccount: PublicKey;

  let escrowAmount = new anchor.BN(5 * 1e9); // 5 SOL from reciever to initializer
  let recieverAmount = new anchor.BN(300 * 1e6); // 300 USDC from initializer to reciever

  const expiry = new anchor.BN(Math.floor(Date.now() / 1000) + 60 * 5);

  before(async () => {
    // airdrop solana to initializer
    initializer = Keypair.generate();

    const airdropSig = await provider.connection.requestAirdrop(
      initializer.publicKey,
      LAMPORTS_PER_SOL * 10 // Increased for transaction fees
    );
    await provider.connection.confirmTransaction(airdropSig);

    // airdrop solana to reciever
    receiver = Keypair.generate();

    // const airdropSig2 = await provider.connection.requestAirdrop(
    //   receiver.publicKey,
    //   LAMPORTS_PER_SOL * 10 // Increased for transaction fees
    // );
    // await provider.connection.confirmTransaction(airdropSig2);

    // Create mints
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

    // Create token accounts for initializer
    initializerTokenAccountX = await createAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintX,
      initializer.publicKey
    );

    initializerTokenAccountY = await createAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintY,
      initializer.publicKey
    );

    // Create token accounts for receiver
    recieverTokenAccountX = await createAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintX,
      receiver.publicKey
    );

    recieverTokenAccountY = await createAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mintY,
      receiver.publicKey
    );

    // Create fee collector token accounts
    feeCollectorAccount = provider.wallet.publicKey;
    feeCollectorTokenAccountX = await getAssociatedTokenAddress(
      mintX,
      feeCollectorAccount
    );
    // feeCollectorTokenAccountY = await getAssociatedTokenAddress(
    //   mintY,
    //   feeCollectorAccount
    // );

    // Create fee collector ATAs if they don't exist
    try {
      await getAccount(provider.connection, feeCollectorTokenAccountX);
    } catch {
      await createAssociatedTokenAccount(
        provider.connection,
        (provider.wallet as any).payer,
        mintX,
        feeCollectorAccount
      );
    }

    // try {
    //   await getAccount(provider.connection, feeCollectorTokenAccountY);
    // } catch {
    //   await createAssociatedTokenAccount(
    //     provider.connection,
    //     (provider.wallet as any).payer,
    //     mintY,
    //     feeCollectorAccount
    //   );
    // }

    // Mint tokens to initializer (6 SOL)
    await mintTo(
      provider.connection,
      (provider.wallet as any).payer,
      mintX,
      initializerTokenAccountX,
      (provider.wallet as any).payer, // Mint authority
      6 * 1e9 // 6 SOL
    );

    // Mint tokens to receiver (350 USDC)
    await mintTo(
      provider.connection,
      (provider.wallet as any).payer,
      mintY,
      recieverTokenAccountY,
      (provider.wallet as any).payer, // Mint authority
      350 * 1e6 // 350 USDC
    );

    escrowAccount = Keypair.generate();
  });

  it("Initializes escrow", async () => {
    try {
      const tx = await program.methods
        .initializeEscrow(
          escrowAmount,
          recieverAmount,
          expiry,
          receiver.publicKey,
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
        .signers([escrowAccount, initializer])
        .rpc();

      console.log("Escrow initialized with tx:", tx);

      const findEscrowAccount = await program.account.escrow.fetch(
        escrowAccount.publicKey
      );

      assert.ok(findEscrowAccount.initializer.equals(initializer.publicKey));
      assert.ok(findEscrowAccount.receiver.equals(receiver.publicKey));
      assert.ok(findEscrowAccount.initializerMint.equals(mintX));
      assert.ok(findEscrowAccount.receiverMint.equals(mintY));
      assert.ok(findEscrowAccount.receiverAmount.eq(recieverAmount));
      assert.ok(findEscrowAccount.initializerAmount.eq(escrowAmount));
      assert.ok(findEscrowAccount.expiry.eq(expiry));

      // find the balance inside the initializer vault
      const [initializerVaultAuthority] = await PublicKey.findProgramAddress(
        [Buffer.from("initializer_vault"), escrowAccount.publicKey.toBuffer()],
        program.programId
      );
      const initializerVaultAddress = await getAssociatedTokenAddress(
        mintX,
        initializerVaultAuthority,
        true
      );
      const initializerVaultAccount = await getAccount(
        provider.connection,
        initializerVaultAddress
      );

      console.log(
        "Amount in initializer vault in sol: ",
        Number(initializerVaultAccount.amount) / 1e9
      );

      const initializerAccountX = await getAccount(
        provider.connection,
        initializerTokenAccountX
      );
      console.log(
        "Initializer Token Account in SOL balance:",
        Number(initializerAccountX.amount) / 1e9
      );

      const initializerAccountY = await getAccount(
        provider.connection,
        initializerTokenAccountY
      );
      console.log(
        "Initializer Token Account in USDC balance:",
        Number(initializerAccountY.amount) / 1e6
      );

      const recieverAccountX = await getAccount(
        provider.connection,
        recieverTokenAccountX
      );
      console.log(
        "Reciever Token Account in SOL balance:",
        Number(recieverAccountX.amount) / 1e9
      );

      const recieverAccountY = await getAccount(
        provider.connection,
        recieverTokenAccountY
      );
      console.log(
        "Reciever Token Account in USDC balance:",
        Number(recieverAccountY.amount) / 1e6
      );
    } catch (e) {
      console.error("Error initializing escrow:", e);
      throw e; // Re-throw to see the actual error
    }
  });

  it("Claims escrow", async () => {
    try {
      // get all the authorities
      const [initializerVaultAuthority] = await PublicKey.findProgramAddress(
        [Buffer.from("initializer_vault"), escrowAccount.publicKey.toBuffer()],
        program.programId
      );

      const [recieverVaultAuthority] = await PublicKey.findProgramAddress(
        [Buffer.from("reciever_vault"), escrowAccount.publicKey.toBuffer()],
        program.programId
      );

      // const [feeCollectorAuthority] = await PublicKey.findProgramAddress(
      //   [Buffer.from("fee_collector"), escrowAccount.publicKey.toBuffer()],
      //   program.programId
      // );

      // get the vault addresses
      const initializerVault = await getAssociatedTokenAddress(
        mintX,
        initializerVaultAuthority, // initializer's vault
        true
      );

      const recieverVault = await getAssociatedTokenAddress(
        mintY,
        recieverVaultAuthority, // receiver's vault
        true
      );

      // get the token account address
      const initializerToReceiver = await getAssociatedTokenAddress(
        mintX,
        receiver.publicKey // receiver's account to receive SOL
      );

      const receiverToReceiverVault = await getAssociatedTokenAddress(
        mintY,
        receiver.publicKey // receiver's account to send USDC from
      );

      const receiverVaultToInitializer = await getAssociatedTokenAddress(
        mintY,
        initializer.publicKey // initializer's account to receive USDC
      );

      // const feeCollectorInitializerAccount = await getAssociatedTokenAddress(
      //   mintX,
      //   feeCollectorAuthority, // fee collector's account to receive SOL
      //   true
      // );

      const tx = await program.methods
        .claimEscrow()
        .accounts({
          escrow: escrowAccount.publicKey,
          initializer: initializer.publicKey,
          receiver: receiver.publicKey,
          initializerVaultAuthority: initializerVaultAuthority,
          initializerVault: initializerVault,
          recieverVaultAuthority: recieverVaultAuthority,
          recieverVault: recieverVault,
          initializerToReceiver: initializerToReceiver,
          receiverToReceiverVault: receiverToReceiverVault,
          receiverVaultToInitializer: receiverVaultToInitializer,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([receiver])
        .rpc();

      console.log("Escrow claimed with tx:", tx);

      const initializerAccountX = await getAccount(
        provider.connection,
        initializerTokenAccountX
      );
      console.log(
        "Initializer Token Account in SOL balance:",
        Number(initializerAccountX.amount) / 1e9
      );

      const initializerAccountY = await getAccount(
        provider.connection,
        initializerTokenAccountY
      );
      console.log(
        "Initializer Token Account in USDC balance:",
        Number(initializerAccountY.amount) / 1e6
      );

      const recieverAccountX = await getAccount(
        provider.connection,
        recieverTokenAccountX
      );
      console.log(
        "Reciever Token Account in SOL balance:",
        Number(recieverAccountX.amount) / 1e9
      );

      const recieverAccountY = await getAccount(
        provider.connection,
        recieverTokenAccountY
      );
      console.log(
        "Reciever Token Account in USDC balance:",
        Number(recieverAccountY.amount) / 1e6
      );
    } catch (e) {
      console.error("Error claiming escrow:", e);
      throw e; // Re-throw to see the actual error
    }
  });
});
