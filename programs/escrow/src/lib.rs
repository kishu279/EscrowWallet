use anchor_lang::prelude::*;

pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

pub use instructions::*;

declare_id!("2CXktrQFUGHAS54eXGgS1KyY6z92aMrGy6RYQG8pj6mj");

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        initilaizer_amount: u64,
        reciever_amount: u64,
        expiry: i64,
        receiver: Pubkey,
        fee_basis_point: u16,
        fee_collector: Pubkey,
    ) -> Result<()> {
        InitializeEscrow::initialize(
            ctx,
            initilaizer_amount,
            reciever_amount,
            expiry,
            receiver,
            fee_basis_point,
            fee_collector,
        )
    }

    pub fn claim_escrow(ctx: Context<ClaimEscrow>) -> Result<()> {
        ClaimEscrow::claim(ctx)
    }
}
