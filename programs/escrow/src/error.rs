use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Escrow is not initialized")]
    EscrowNotInitialized,

    #[msg("Escrow is expired")]
    EscrowExpired,

    #[msg("Invalid Fee Collector")]
    InvalidFeeCollector,
}
