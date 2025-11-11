import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("escrow", () => {
  // Configure the client to use the local cluster.

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrow as Program<Escrow>;

  let mintX: anchor.web3.Keypair;
  let mintY: anchor.web3.Keypair;

  let initializerAmount: anchor.BN;
  let receiverAmount: anchor.BN;

  let expiry: anchor.BN = new anchor.BN(Math.floor(Date.now() / 1000) + 300); // current time + 5minutes

  let associatedTokenAccountInitializerX: anchor.web3.PublicKey;
  let associatedTokenAccountReceiverY: anchor.web3.PublicKey;

  let feeCollectorAccount: anchor.web3.Keypair;
  let receiver: anchor.web3.Keypair;

  before(async () => {
    // Add your setup code here.
    mintX = anchor.web3.Keypair.generate();
    mintY = anchor.web3.Keypair.generate();
    feeCollectorAccount = anchor.web3.Keypair.generate();
    receiver = anchor.web3.Keypair.generate();

    const latestBlockhash = await provider.connection.getLatestBlockhash();

    const mint_rent = await getMinimumBalanceForRentExemptMint(
      provider.connection
    );

    // CREATING INITIALIZER TOKEN ACCOUNT

    // getting the pda for the associated token account address
    // initializer token account holding mint X
    associatedTokenAccountInitializerX = getAssociatedTokenAddressSync(
      mintX.publicKey,
      provider.wallet.publicKey,
      false, // allowOwnerOffCurve
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    // receiver token account holding mint Y
    associatedTokenAccountReceiverY = getAssociatedTokenAddressSync(
      mintY.publicKey,
      receiver.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create account instruction for mint X
    const createAccountInstructionX = anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mintX.publicKey,
      space: MINT_SIZE,
      lamports: mint_rent,
      programId: TOKEN_PROGRAM_ID,
    });

    // Create account instruction for mint X
    const createAccountInstructionY = anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mintY.publicKey,
      space: MINT_SIZE,
      lamports: mint_rent,
      programId: TOKEN_PROGRAM_ID,
    });

    // initialize mint instruction for mint X
    const initializeMintInstructionX = createInitializeMintInstruction(
      mintX.publicKey, // mint pubkey
      9, // decimals for fake mint -> sol
      provider.wallet.publicKey, // mint authority
      provider.wallet.publicKey, // freeze authority
      TOKEN_PROGRAM_ID
    );

    // initialize mint instruction for mint Y
    const initializeMintInstructionY = createInitializeMintInstruction(
      mintY.publicKey,
      6,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      TOKEN_PROGRAM_ID
    );

    // Create associated token account instruction for initializer mint X
    const createAssociatedTokenAccountIxX =
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey, // payer
        associatedTokenAccountInitializerX, // associated token account address
        provider.wallet.publicKey, // owner
        mintX.publicKey, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

    // Create associated token account instruction for receiver mint Y
    const createAssociatedTokenAccountIxY =
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey, // payer
        associatedTokenAccountReceiverY, // associated token account address
        receiver.publicKey, // owner
        mintY.publicKey, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

    const transactionX = new anchor.web3.Transaction({
      feePayer: provider.wallet.publicKey,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }).add(
      createAccountInstructionX,
      initializeMintInstructionX,
      createAssociatedTokenAccountIxX
    );

    const transactionY = new anchor.web3.Transaction({
      feePayer: provider.wallet.publicKey,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }).add(
      createAccountInstructionY,
      initializeMintInstructionY,
      createAssociatedTokenAccountIxY
    );

    // Sign transactionX
    const transactionSignatureX = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      transactionX,
      [provider.wallet.payer, mintX]
    );

    const transactionSignatureY = await anchor.web3.sendAndConfirmTransaction(
      provider.connection,
      transactionY,
      [provider.wallet.payer, mintY]
    );

    console.log("Mint Address:", mintX.publicKey.toBase58());
    console.log(
      "Associated Token Account Address:",
      associatedTokenAccountInitializerX.toBase58()
    );
    console.log("Transaction Signature:", transactionSignatureX);

    console.log("Mint Address:", mintY.publicKey.toBase58());
    console.log(
      "Associated Token Account Address:",
      associatedTokenAccountReceiverY.toBase58()
    );
    console.log("Transaction Signature:", transactionSignatureY);

    const mintAmountX = 100_000_000_000; // 100 tokens with 9 decimals
    const mintAmountY = 100_000_000; // 100 tokens with 6 decimals

    initializerAmount = new anchor.BN(mintAmountX);
    receiverAmount = new anchor.BN(mintAmountY);

    const mintToInstructionX = createMintToInstruction(
      mintX.publicKey, // mint
      associatedTokenAccountInitializerX, // destination
      provider.wallet.publicKey, // authority
      mintAmountX, // amount
      [], // multiSigners
      TOKEN_PROGRAM_ID // programId
    );

    const mintToInstructionY = createMintToInstruction(
      mintY.publicKey,
      associatedTokenAccountReceiverY,
      provider.wallet.publicKey,
      mintAmountY,
      [],
      TOKEN_PROGRAM_ID
    );

    // Get a new blockhash for the minting transactionX
    const mintBlockhash = await provider.connection.getLatestBlockhash();

    const mintTransaction = new anchor.web3.Transaction({
      feePayer: provider.wallet.publicKey,
      blockhash: mintBlockhash.blockhash,
      lastValidBlockHeight: mintBlockhash.lastValidBlockHeight,
    }).add(mintToInstructionX, mintToInstructionY);

    // Sign and send mint transactionX
    const mintTransactionSignature =
      await anchor.web3.sendAndConfirmTransaction(
        provider.connection,
        mintTransaction,
        [provider.wallet.payer]
      );
  });

  it("Is initialized!", async () => {
    // Add your test here.

    const tx = await program.methods
      .initializeEscrow(
        initializerAmount,
        receiverAmount,
        expiry,
        receiver.publicKey,
        100,
        feeCollectorAccount.publicKey
      )
      .accounts({
        initializer: provider.wallet.publicKey,
        initializerMint: mintX.publicKey,
        initializerTokenAccount: associatedTokenAccountInitializerX,
        receiverMint: mintY.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([provider.wallet.payer])
      .rpc();

    console.log("Your transaction signature", tx);

    const [escrowAccount, escrowBumps] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("escrow"), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

    console.log("escrowAccount", escrowAccount.toBase58());

    const escrow = await program.account.escrow.fetch(escrowAccount);
    // console.log("escrow", escrow);

    assert.ok(escrow.initializer.equals(provider.wallet.publicKey));
    assert.ok(escrow.receiver.equals(receiver.publicKey));
    assert.ok(escrow.initializerMint.equals(mintX.publicKey));
    assert.ok(escrow.receiverMint.equals(mintY.publicKey));
    assert.ok(escrow.receiverAmount.eq(receiverAmount));
    assert.ok(escrow.initializerAmount.eq(initializerAmount));
    assert.ok(escrow.expiry.eq(expiry));

    // check vault balance
    const [initializerVaultAuthorityAddress, initializerVaultBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("initializer_vault"), escrowAccount.toBuffer()],
        program.programId
      );

    const [receiverVaultAuthorityAddress, receiverVaultBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("receiver_vault"), escrowAccount.toBuffer()],
        program.programId
      );

    const initializerVault = await getAssociatedTokenAddressSync(
      mintX.publicKey,
      initializerVaultAuthorityAddress,
      true
    );

    const receiverVault = await getAssociatedTokenAddressSync(
      mintY.publicKey,
      receiverVaultAuthorityAddress,
      true
    );

    const initializerVaultAccount = await getAccount(
      provider.connection,
      initializerVault
    );

    const receiverVaultAccount = await getAccount(
      provider.connection,
      receiverVault
    );

    console.log(
      "initializer vault address",
      initializerVault.toBase58(),
      "initializer vault account",
      initializerVaultAccount.amount.toString()
    );

    console.log(
      "receiver vault address",
      receiverVault.toBase58(),
      "receiver vault account",
      receiverVaultAccount.amount.toString()
    );

    // assert.ok(initializerVaultAccount.amount.equals(initializerAmount));
    // assert.ok(receiverVaultAccount.amount.equals(new anchor.BN(0)));
  });
});
