use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer as TokenTransfer};

use crate::error::EscrowError;
use crate::events::EscrowCancelledEvent;
use crate::state::Escrow;

#[event_cpi]
#[derive(Accounts)]
pub struct CancelEscrow<'info> {
    #[account(
        mut,
        has_one = initializer,
        has_one = initializer_mint,
        close = initializer,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub initializer: Signer<'info>,

    #[account(mut)]
    pub initializer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub initializer_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"initializer_vault", escrow.key().as_ref()],
        bump = escrow.initializer_vault_bump,
    )]
    /// CHECK: pda signer
    pub initializer_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = initializer_mint,
        associated_token::authority = initializer_authority,
    )]
    pub initializer_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

impl<'info> CancelEscrow<'info> {
    pub fn cancel_escrow(ctx: Context<CancelEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp > escrow.expiry,
            EscrowError::EscrowNotExpired
        );

        let escrow_keys = escrow.key();
        let initializer_vault_bumps = escrow.initializer_vault_bump;
        let initializer_seeds = &[
            b"initializer_vault",
            escrow_keys.as_ref(),
            &[initializer_vault_bumps],
        ];
        let signer_seeds: &[&[&[u8]]] = &[initializer_seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.initializer_vault.to_account_info(),
                to: ctx.accounts.initializer_token_account.to_account_info(),
                authority: ctx.accounts.initializer_authority.to_account_info(),
            },
            signer_seeds,
        );

        transfer(cpi_ctx, escrow.initializer_amount)?;

        emit_cpi!(EscrowCancelledEvent {
            amount: escrow.initializer_amount,
            expiry: escrow.expiry,
            mssg: "Escrow cancelled".to_string(),
        });

        Ok(())
    }
}
