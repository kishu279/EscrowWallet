use crate::events::EscrowInitialized;
use crate::state::Escrow;

use anchor_lang::prelude::*;

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer as TokenTransfer},
};

#[event_cpi]
#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = initializer,
        space = 8 + 32 + 32 + 32 + 8 + 32 + 8 + 2 + 32 + 8
    )]
    pub escrow: Box<Account<'info, Escrow>>,

    #[account(mut)]
    pub initializer: Signer<'info>,

    #[account(mut
        // init_if_needed,
        // payer = initializer,
        // associated_token::mint = initializer_mint,
        // associated_token::authority = initializer
    )]
    pub initializer_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [b"initializer_vault", escrow.key().as_ref()],
        bump
    )]
    /// CHECK: PDA Signer
    pub initializer_vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = initializer,
        associated_token::mint = initializer_mint,
        associated_token::authority = initializer_vault_authority
    )]
    pub initilaizer_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [b"reciever_vault", escrow.key().as_ref()], 
        bump
    )]
    /// CHECK: PDA Signer
    pub reciever_vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = initializer,
        associated_token::mint = reciever_mint,
        associated_token::authority = reciever_vault_authority
    )]
    pub reciever_vault: Box<Account<'info, TokenAccount>>,

    pub initializer_mint: Account<'info, Mint>,

    pub reciever_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
}

impl<'info> InitializeEscrow<'info> {
    pub fn initialize(
        ctx: Context<InitializeEscrow>,
        initilaizer_amount: u64,
        reciever_amount: u64,
        expiry: i64,
        receiver: Pubkey,
        fee_basis_point: u16,
        fee_collector: Pubkey,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let initializer = &ctx.accounts.initializer;

        escrow.initializer = initializer.key();
        escrow.receiver = receiver;
        escrow.initializer_mint = ctx.accounts.initializer_mint.key();
        escrow.initializer_amount = initilaizer_amount;
        escrow.receiver_mint = ctx.accounts.reciever_mint.key();
        escrow.receiver_amount = reciever_amount;
        escrow.fee_basis_point = fee_basis_point;
        escrow.fee_collector = fee_collector;
        escrow.expiry = expiry;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.initializer_token_account.to_account_info(),
                to: ctx.accounts.initilaizer_vault.to_account_info(),
                authority: initializer.to_account_info(),
            },
        );

        transfer(cpi_ctx, initilaizer_amount)?;

        emit_cpi!(EscrowInitialized {
            initializer: initializer.key(),
            receiver: receiver,
            mint: ctx.accounts.initializer_mint.key(),
            amount: initilaizer_amount,
            expiry
        });

        Ok(())
    }
}
