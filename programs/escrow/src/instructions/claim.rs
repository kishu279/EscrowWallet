use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
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

    // Initializer vault → Receiver token account
    #[account(
        mut,
        associated_token::mint = initializer_mint,
        associated_token::authority = receiver
    )]
    pub initializer_to_receiver: Box<Account<'info, TokenAccount>>,

    // Receiver token account → Receiver vault
    #[account(
        mut,
        associated_token::mint = receiver_mint,
        associated_token::authority = receiver
    )]
    pub receiver_to_receiver_vault: Box<Account<'info, TokenAccount>>,

    // Receiver vault → Initializer token account
    #[account(
        mut,
        associated_token::mint = receiver_mint,
        associated_token::authority = initializer
    )]
    pub receiver_vault_to_initializer: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [b"fee_collector", escrow.key().as_ref()],
        bump
    )]
    /// CHECK: PDA authority that owns fee collector token accounts
    pub fee_collector_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = receiver,
        associated_token::mint = initializer_mint,
        associated_token::authority = fee_collector_authority
    )]
    pub fee_collector_initializer_account: Box<Account<'info, TokenAccount>>,

    // #[account(
    //     mut,
    //     associated_token::mint = receiver_mint,
    //     associated_token::authority = receiver
    // )]
    // pub fee_collector_reciever_account: Box<Account<'info, TokenAccount>>,
    pub initializer_mint: Account<'info, Mint>,
    pub receiver_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
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

        // CALCULATE FEES
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
        let reciever_deposit_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.receiver_to_receiver_vault.to_account_info(),
                to: ctx.accounts.reciever_vault.to_account_info(),
                authority: ctx.accounts.receiver.to_account_info(),
            },
        );
        transfer(reciever_deposit_ctx, escrow.receiver_amount)?;

        // step2
        // get the initializer vault bump, seeds and signer
        let initializer_vault_bumps = ctx.bumps.initializer_vault_authority;
        let initializer_seeds = &[
            b"initializer_vault",
            escrow_key.as_ref(),
            &[initializer_vault_bumps],
        ];
        let initializer_signer = &[&initializer_seeds[..]];

        // transfer fee to fee collector
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

        // transfering initializer vault to reciever token account
        let initializer_to_receiver_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.initializer_vault.to_account_info(),
                to: ctx.accounts.initializer_to_receiver.to_account_info(),
                authority: ctx.accounts.initializer_vault_authority.to_account_info(),
            },
            initializer_signer,
        );
        transfer(initializer_to_receiver_ctx, initializer_amount_after_fee)?;

        // STEP 3
        // get the reciever vault bump, seeds and signer
        let reciever_vault_bumps = ctx.bumps.reciever_vault_authority;
        let receiver_seeds = &[
            b"receiver_vault",
            escrow_key.as_ref(),
            &[reciever_vault_bumps],
        ];
        let receiver_signer = &[&receiver_seeds[..]];

        // if any receiver fee is left, transfer it to the fee collector
        // ...

        // transfering the reciver vault to initializer token account
        let receiver_to_initializer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.reciever_vault.to_account_info(),
                to: ctx.accounts.receiver_vault_to_initializer.to_account_info(),
                authority: ctx.accounts.reciever_vault_authority.to_account_info(),
            },
            receiver_signer,
        );
        transfer(receiver_to_initializer_ctx, receiver_amount_after_fee)?;

        emit_cpi!(EscrowClaimed {
            initializer: escrow.initializer,
            receiver: escrow.receiver,
            mint: escrow.initializer_mint,
            amount: escrow.initializer_amount,
        });

        Ok(())
    }
}
