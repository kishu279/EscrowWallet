use anchor_lang::prelude::*;
use crate::state::Escrow;
use crate::events::EscrowInitializedEvent;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer as TokenTransfer},
};

#[event_cpi]
#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    // pda escrow account
    #[account(
        init,
        payer = initializer,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [
            b"escrow".as_ref(),
            initializer.key().as_ref(),
        ],
        bump 
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub initializer: Signer<'info>,

    #[account(mut)]
    pub initializer_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [b"initializer_vault", escrow.key().as_ref()],
        bump,
    )]
    /// CHECK: pda signer
    pub initializer_vault_authority: UncheckedAccount<'info>,
    
    #[account(
        init,
        payer = initializer,
        associated_token::mint = initializer_mint,
        associated_token::authority = initializer_vault_authority,
    )]
    pub initializer_vault: Account<'info, TokenAccount>,
    
    #[account(
        seeds = [b"receiver_vault", escrow.key().as_ref()],
        bump,
    )]
    /// CHECK: pda signer
    pub receiver_vault_authority: UncheckedAccount<'info>,

    #[account(
        init, 
        payer = initializer,
        associated_token::mint = receiver_mint,
        associated_token::authority = receiver_vault_authority,
    )]
    pub receiver_vault: Account<'info, TokenAccount>,

    pub initializer_mint: Account<'info, Mint>,
    pub receiver_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    // pub rent: Sysvar<'info, Rent>,
}

impl <'info> InitializeEscrow<'info> {
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>, 
        initializer_amount: u64,
        receiver_amount: u64,
        expiry: i64,
        receiver: Pubkey,
        fee_basis_point: u16,
        fee_collector: Pubkey,
    ) -> Result<()> {
        // method to initiailize escrow
        // ...
        let escrow = &mut ctx.accounts.escrow;

        escrow.bump = ctx.bumps.escrow;
        escrow.initializer_vault_bump = ctx.bumps.initializer_vault_authority;
        escrow.receiver_vault_bump = ctx.bumps.receiver_vault_authority;

        escrow.initializer = ctx.accounts.initializer.key();
        escrow.receiver = receiver;
        escrow.initializer_mint = ctx.accounts.initializer_mint.key();
        escrow.initializer_amount = initializer_amount;
        escrow.receiver_mint = ctx.accounts.receiver_mint.key();
        escrow.receiver_amount = receiver_amount;
        escrow.fee_basis_points = fee_basis_point;
        escrow.fee_collector = fee_collector;
        escrow.expiry = expiry;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.initializer_token_account.to_account_info(),
                to : ctx.accounts.initializer_vault.to_account_info(),
                authority: ctx.accounts.initializer.to_account_info(),
            }
        );

        transfer(cpi_ctx, initializer_amount)?;

        emit_cpi!(EscrowInitializedEvent {
            initializer: ctx.accounts.initializer.key(),
            receiver: ctx.accounts.escrow.receiver,
            mint: ctx.accounts.initializer_mint.key(),
            amount: initializer_amount,
            expiry: expiry,
        });

        Ok(())

    }
}
