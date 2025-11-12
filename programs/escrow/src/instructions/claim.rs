use crate::{escrow, events::EscrowClaimedEvent, state::Escrow};
use anchor_lang::prelude::*;
// use crate::events::EscrowClaimedEvent;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer as TokenTransfer},
};

use crate::error::EscrowError;

#[event_cpi]
#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        mut,
        has_one = initializer,
        has_one = receiver,
        has_one = initializer_mint,
        has_one = receiver_mint,
        has_one = fee_collector
    )]
    pub escrow: Account<'info, Escrow>,

    // signer
    #[account(mut)]
    pub receiver: Signer<'info>,

    #[account(mut)]
    pub initializer: SystemAccount<'info>,

    // initializer vault authority
    #[account(
        seeds = [b"initializer_vault", escrow.key().as_ref()],
        bump = escrow.initializer_vault_bump,
    )]
    /// CHECK: pda signer
    pub initializer_vault_authority: UncheckedAccount<'info>,

    // receiver vault authority
    #[account(
        seeds = [b"receiver_vault", escrow.key().as_ref()],
        bump = escrow.receiver_vault_bump,
    )]
    /// CHECK: pda signer
    pub receiver_vault_authority: UncheckedAccount<'info>,

    // get the initializer vault token account
    #[account(
        mut,
        associated_token::mint = initializer_mint,
        associated_token::authority = initializer_vault_authority,
    )]
    pub initializer_vault: Box<Account<'info, TokenAccount>>,

    // get the receiver vault token account
    #[account(
        mut,
        associated_token::mint = receiver_mint,
        associated_token::authority = receiver_vault_authority,
    )]
    pub receiver_vault: Box<Account<'info, TokenAccount>>,

    // receiver token account
    #[account(
        init_if_needed,
        payer = receiver,
        associated_token::mint = receiver_mint,
        associated_token::authority = receiver,
    )]
    pub receiver_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = receiver,
        associated_token::mint = initializer_mint,
        associated_token::authority = receiver,
    )]
    pub initializer_vault_to_receiver_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer= receiver,
        associated_token::mint = receiver_mint,
        associated_token::authority = initializer,
    )]
    pub receiver_vault_to_initializer_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = receiver,
        associated_token::mint = initializer_mint,
        associated_token::authority = fee_collector,
    )]
    pub fee_collector_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    /// CHECK: only used as a pubkey for ATA derivation
    pub fee_collector: UncheckedAccount<'info>,

    #[account(mut)]
    pub initializer_mint: Account<'info, Mint>,

    #[account(mut)]
    pub receiver_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> Claim<'info> {
    pub fn claim_escrow(ctx: Context<Claim>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let clock = Clock::get()?;

        // runtime check to make sure the fee collector is valid
        require_keys_eq!(
            ctx.accounts.fee_collector.key(),
            escrow.fee_collector,
            EscrowError::InvalidFeeCollector
        );

        // runtime check to make sure the escrow is not expired
        require!(
            clock.unix_timestamp <= escrow.expiry,
            EscrowError::EscrowExpired
        );

        let escrow_keys = escrow.key();

        // STEP 1 CALCULATE FEES
        let initializer_fee = (escrow.initializer_amount as u128)
            .checked_mul(escrow.fee_basis_points as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;
        // let receiver_fee = 0;

        let initializer_amount_after_fee = (escrow.initializer_amount as u128)
            .checked_sub(initializer_fee as u128)
            .unwrap() as u64;

        // STEP 2 TRANSFER RECEIVER TO RECEIVER VAULT TOKEN ACCOUNT
        let receiver_to_receiver_vault_token_account = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.receiver_token_account.to_account_info(),
                to: ctx.accounts.receiver_vault.to_account_info(),
                authority: ctx.accounts.receiver.to_account_info(),
            },
        );

        transfer(
            receiver_to_receiver_vault_token_account,
            escrow.receiver_amount,
        )?;

        // STEP 3 IF FEES, TRANSFER INITIALIZER TO FEE COLLECTOR
        // let initializer_vault_bumps = ctx.bumps.initializer_vault_authority;
        let initializer_vault_bumps = escrow.initializer_vault_bump;
        let initializer_seeds = &[
            b"initializer_vault",
            escrow_keys.as_ref(),
            &[initializer_vault_bumps],
        ];
        let signer_seeds_initializer: &[&[&[u8]]] = &[initializer_seeds];

        if initializer_fee > 0 {
            let fee_collecting_cpi = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TokenTransfer {
                    from: ctx.accounts.initializer_vault.to_account_info(),
                    to: ctx.accounts.fee_collector_token_account.to_account_info(),
                    authority: ctx.accounts.initializer_vault_authority.to_account_info(),
                },
                signer_seeds_initializer,
            );

            transfer(fee_collecting_cpi, initializer_fee)?;
        }

        // STEP 4 TRANSFER FROM INITIALIZER VAULT TO RECEIVER TOKEN ACCOUNT
        let initializer_vault_to_receiver_cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.initializer_vault.to_account_info(),
                to: ctx
                    .accounts
                    .initializer_vault_to_receiver_token_account
                    .to_account_info(),
                authority: ctx.accounts.initializer_vault_authority.to_account_info(),
            },
            signer_seeds_initializer,
        );

        transfer(
            initializer_vault_to_receiver_cpi,
            initializer_amount_after_fee,
        )?;

        // STEP 5 TRANSFER FROM RECEIVER VAULT TO INITIALIZER TOKEN ACCOUNT
        let receiver_vault_bumps = escrow.receiver_vault_bump;
        let receiver_seeds = &[
            b"receiver_vault",
            escrow_keys.as_ref(),
            &[receiver_vault_bumps],
        ];
        let signer_seeds_receiver: &[&[&[u8]]] = &[receiver_seeds];

        let receiver_vault_to_initializer_cpi = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.receiver_vault.to_account_info(),
                to: ctx
                    .accounts
                    .receiver_vault_to_initializer_token_account
                    .to_account_info(),
                authority: ctx.accounts.receiver_vault_authority.to_account_info(),
            },
            signer_seeds_receiver,
        );

        transfer(receiver_vault_to_initializer_cpi, escrow.receiver_amount)?;

        emit_cpi!(EscrowClaimedEvent {
            initializer: ctx.accounts.initializer.key(),
            receiver: ctx.accounts.receiver.key(),
            mint: ctx.accounts.initializer_mint.key(),
            amount: escrow.initializer_amount,
            expiry: escrow.expiry,
        });

        Ok(())
    }
}
