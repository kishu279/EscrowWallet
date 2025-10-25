use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("The Escrow has already expired!")]
    EscrowExpired,

    #[msg("The escrow is still alive")]
    EscrowStillActive,

    #[msg("Reciever not matched")]
    EscrowRecieverNotMatched,

    #[msg("Escrow not expired yet")]
    EscrowNotExpired,
}
