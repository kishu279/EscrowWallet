use anchor_lang::prelude::*;

declare_id!("DCA5tgdnUxARGKY1oYpcnLkzeuxYaKSiXMMJ3irou6tu");

pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

pub use instructions::*;

#[program]
pub mod escrow {
    use super::*;

    // INSTRUCTIONS METHOD'S ....
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        initilaizer_amount: u64,
        reciever_amount: u64,
        expiry: i64,
        receiver: Pubkey,
        fee_basis_point: u16,
        fee_collector: Pubkey,
    ) -> Result<()> {
        InitializeEscrow::initialize_escrow(
            ctx,
            initilaizer_amount,
            reciever_amount,
            expiry,
            receiver,
            fee_basis_point,
            fee_collector,
        )
    }
}
