use anchor_lang::prelude::*;

#[event]
pub struct EscrowInitializedEvent {
    pub initializer: Pubkey,
    pub receiver: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub expiry: i64,
}

#[event]
pub struct EscrowClaimedEvent {
    pub initializer: Pubkey,
    pub receiver: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub expiry: i64,
}
