use anchor_lang::prelude::*;

use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer as TokenTransfer};

use crate::error::EscrowError;
use crate::events::EscrowClaimed;
use crate::state::Escrow;

#[event_cpi]
#[derive(Accounts)]
pub struct ClaimEscrow<'info> {
    #[account(
        mut,
        has_one = initializer,
        has_one = receiver,
        has_one = initializer_mint,
        has_one = receiver_mint,
        close = initializer
    )]
    pub escrow: Box<Account<'info, Escrow>>,

    #[account(mut)]
    pub initializer: SystemAccount<'info>,

    #[account(mut)]
    pub receiver: Signer<'info>,

    #[account(
        seeds = [b"initializer_vault", escrow.key().as_ref()],
        bump
    )]
    /// CHECK: PDA Signer
    pub initializer_vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = initializer_mint,
        associated_token::authority = initializer_vault_authority
    )]
    pub initializer_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [b"reciever_vault", escrow.key().as_ref()],
        bump
    )]
    /// CHECK: PDA Signer
    pub reciever_vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = receiver_mint,
        associated_token::authority = reciever_vault_authority
    )]
    pub reciever_vault: Box<Account<'info, TokenAccount>>,

    // Initializer vault to reciever token account
    #[account(
        mut,
        associated_token::mint = initializer_mint,
        associated_token::authority = receiver
    )]
    pub recieves_initializer_token: Box<Account<'info, TokenAccount>>,

    // reciever token account to reciever vault
    #[account(
        mut,
        associated_token::mint = receiver_mint,
        associated_token::authority = receiver
    )]
    pub reciever_reciever_token: Box<Account<'info, TokenAccount>>,

    // reciever vault to initializer account
    #[account(
        mut,
        associated_token::mint = initializer_mint,
        associated_token::authority = initializer
    )]
    pub recieves_reciever_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = initializer_mint,
        associated_token::authority = initializer
    )]
    pub fee_collector_initializer_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = receiver_mint,
        associated_token::authority = receiver
    )]
    pub fee_collector_reciever_account: Box<Account<'info, TokenAccount>>,

    pub initializer_mint: Account<'info, Mint>,
    pub receiver_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[inline(never)]
fn step1(ctx: &Context<ClaimEscrow>, escrow: &Escrow) -> Result<()> {
    // step1 - transfer reciever fee to reciever vault
    let reciever_deposit_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TokenTransfer {
            from: ctx.accounts.reciever_reciever_token.to_account_info(),
            to: ctx.accounts.reciever_vault.to_account_info(),
            authority: ctx.accounts.receiver.to_account_info(),
        },
    );
    transfer(reciever_deposit_ctx, escrow.receiver_amount)?;

    Ok(())
}

#[inline(never)]
fn step2(
    ctx: &Context<ClaimEscrow>,
    escrow_key: &Pubkey,
    initializer_amount_after_fee: u64,
    initializer_fee: u64,
) -> Result<()> {
    // step2 transfering initializer vault to reciever token account
    let initializer_vault_bumps = ctx.bumps.initializer_vault_authority;
    let initializer_seeds = &[
        b"initializer_vault",
        escrow_key.as_ref(),
        &[initializer_vault_bumps],
    ];
    let initializer_signer = &[&initializer_seeds[..]];

    let initializer_to_reciever_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TokenTransfer {
            from: ctx.accounts.initializer_vault.to_account_info(),
            to: ctx.accounts.recieves_initializer_token.to_account_info(),
            authority: ctx.accounts.initializer_vault_authority.to_account_info(),
        },
        initializer_signer,
    );

    transfer(initializer_to_reciever_ctx, initializer_amount_after_fee)?;

    // Step 3: Transfer initializer's fee to fee collector
    if initializer_fee > 0 {
        let initializer_fee_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.initializer_vault.to_account_info(),
                to: ctx
                    .accounts
                    .fee_collector_initializer_account
                    .to_account_info(),
                authority: ctx.accounts.initializer_vault_authority.to_account_info(),
            },
            initializer_signer,
        );

        transfer(initializer_fee_ctx, initializer_fee)?;
    }

    Ok(())
}

#[inline(never)]
fn step3(
    ctx: &Context<ClaimEscrow>,
    escrow_key: &Pubkey,
    receiver_amount_after_fee: u64,
    receiver_fee: u64,
) -> Result<()> {
    // step4 reciever vault to initializer token account
    let reciever_vault_bumps = ctx.bumps.reciever_vault_authority;
    let reciever_seeds = &[
        b"reciever_vault",
        escrow_key.as_ref(),
        &[reciever_vault_bumps],
    ];
    let reciever_signer = &[&reciever_seeds[..]];

    let receiver_to_initializer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TokenTransfer {
            from: ctx.accounts.reciever_vault.to_account_info(),
            to: ctx.accounts.recieves_reciever_token.to_account_info(),
            authority: ctx.accounts.reciever_vault_authority.to_account_info(),
        },
        reciever_signer,
    );

    transfer(receiver_to_initializer_ctx, receiver_amount_after_fee)?;

    // step 5 transfering reciever fee to fee collector
    if receiver_fee > 0 {
        let reciever_fee_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.reciever_vault.to_account_info(),
                to: ctx
                    .accounts
                    .fee_collector_reciever_account
                    .to_account_info(),
                authority: ctx.accounts.reciever_vault_authority.to_account_info(),
            },
            reciever_signer,
        );

        transfer(reciever_fee_ctx, receiver_fee)?;
    }

    Ok(())
}

impl<'info> ClaimEscrow<'info> {
    pub fn claim(ctx: Context<ClaimEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= escrow.expiry,
            EscrowError::EscrowExpired
        );

        let escrow_key = escrow.key();

        let initializer_fee = (escrow.initializer_amount as u128)
            .checked_mul(escrow.fee_basis_point as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;

        // let receiver_fee = (escrow.receiver_amount as u128)
        //     .checked_mul(escrow.fee_basis_point as u128)
        //     .unwrap()
        //     .checked_div(10000)
        //     .unwrap() as u64;
        let receiver_fee = 0;

        let initializer_amount_after_fee = escrow
            .initializer_amount
            .checked_sub(initializer_fee)
            .unwrap();
        let receiver_amount_after_fee = escrow.receiver_amount.checked_sub(receiver_fee).unwrap();

        // step1 - transfer reciever fee to reciever vault
        // let reciever_deposit_ctx = CpiContext::new(
        //     ctx.accounts.token_program.to_account_info(),
        //     TokenTransfer {
        //         from: ctx.accounts.reciever_reciever_token.to_account_info(),
        //         to: ctx.accounts.reciever_vault.to_account_info(),
        //         authority: ctx.accounts.receiver.to_account_info(),
        //     },
        // );
        // transfer(reciever_deposit_ctx, escrow.receiver_amount)?;
        step1(&ctx, &escrow)?;

        // step2 transfering initializer vault to reciever token account
        // let initializer_vault_bumps = ctx.bumps.initializer_vault_authority;
        // let initializer_seeds = &[
        //     b"initializer_vault",
        //     escrow_key.as_ref(),
        //     &[initializer_vault_bumps],
        // ];
        // let initializer_signer = &[&initializer_seeds[..]];

        // let initializer_to_reciever_ctx = CpiContext::new_with_signer(
        //     ctx.accounts.token_program.to_account_info(),
        //     TokenTransfer {
        //         from: ctx.accounts.initializer_vault.to_account_info(),
        //         to: ctx.accounts.recieves_initializer_token.to_account_info(),
        //         authority: ctx.accounts.initializer_vault_authority.to_account_info(),
        //     },
        //     initializer_signer,
        // );

        // transfer(initializer_to_reciever_ctx, initializer_amount_after_fee)?;

        // Step 3: Transfer initializer's fee to fee collector
        // if initializer_fee > 0 {
        //     let initializer_fee_ctx = CpiContext::new_with_signer(
        //         ctx.accounts.token_program.to_account_info(),
        //         TokenTransfer {
        //             from: ctx.accounts.initializer_vault.to_account_info(),
        //             to: ctx
        //                 .accounts
        //                 .fee_collector_initializer_account
        //                 .to_account_info(),
        //             authority: ctx.accounts.initializer_vault_authority.to_account_info(),
        //         },
        //         initializer_signer,
        //     );

        //     transfer(initializer_fee_ctx, initializer_fee)?;
        // }
        step2(
            &ctx,
            &escrow_key,
            initializer_amount_after_fee,
            initializer_fee,
        )?;

        // step4 reciever vault to initializer token account
        // let reciever_vault_bumps = ctx.bumps.reciever_vault_authority;
        // let reciever_seeds = &[
        //     b"reciever_vault",
        //     escrow_key.as_ref(),
        //     &[reciever_vault_bumps],
        // ];
        // let reciever_signer = &[&reciever_seeds[..]];

        // let receiver_to_initializer_ctx = CpiContext::new_with_signer(
        //     ctx.accounts.token_program.to_account_info(),
        //     TokenTransfer {
        //         from: ctx.accounts.reciever_vault.to_account_info(),
        //         to: ctx.accounts.recieves_reciever_token.to_account_info(),
        //         authority: ctx.accounts.reciever_vault_authority.to_account_info(),
        //     },
        //     reciever_signer,
        // );

        // transfer(receiver_to_initializer_ctx, receiver_amount_after_fee)?;

        // step 5 transfering reciever fee to fee collector
        // if receiver_fee > 0 {
        //     let reciever_fee_ctx = CpiContext::new_with_signer(
        //         ctx.accounts.token_program.to_account_info(),
        //         TokenTransfer {
        //             from: ctx.accounts.reciever_vault.to_account_info(),
        //             to: ctx
        //                 .accounts
        //                 .fee_collector_reciever_account
        //                 .to_account_info(),
        //             authority: ctx.accounts.reciever_vault_authority.to_account_info(),
        //         },
        //         reciever_signer,
        //     );

        //     transfer(reciever_fee_ctx, receiver_fee)?;
        // }
        step3(&ctx, &escrow_key, receiver_amount_after_fee, receiver_fee)?;

        emit_cpi!(EscrowClaimed {
            initializer: escrow.initializer,
            receiver: escrow.receiver,
            mint: escrow.initializer_mint,
            amount: escrow.initializer_amount,
        });

        Ok(())
    }
}
