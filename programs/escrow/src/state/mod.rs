use anchor_lang::prelude::*;

#[account]
pub struct Escrow {
    pub initializer: Pubkey, // 32
    pub receiver: Pubkey,    // 32

    pub initializer_mint: Pubkey, // 32
    pub initializer_amount: u64,  // 8

    pub receiver_mint: Pubkey, // 32
    pub receiver_amount: u64,

    pub fee_basis_point: u16,  // 2
    pub fee_collector: Pubkey, // 32

    pub expiry: i64, // 8
}
