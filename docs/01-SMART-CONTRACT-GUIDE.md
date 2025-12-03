# Smart Contract Development Guide

Complete guide to building the Solana escrow program using Anchor framework.

**Program ID:** `DCA5tgdnUxARGKY1oYpcnLkzeuxYaKSiXMMJ3irou6tu`

---

## Setup & Structure

### Project Initialization

```bash
anchor init escrow
cd escrow
anchor build
```

### Project Structure

```
programs/escrow/src/
├── lib.rs              # Program entry point
├── state.rs            # Data structures
├── error.rs            # Custom errors
├── events.rs           # Event definitions
└── instructions/
    ├── initialize.rs   # Initialize escrow
    ├── claim.rs        # Claim escrow
    └── cancel.rs       # Cancel escrow
```

**Reference:** https://book.anchor-lang.com/anchor_in_depth/the_program_module.html

---

## State Structure

Define the escrow account that stores all escrow data.

```rust
// state.rs
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub initializer: Pubkey,        // Creator of escrow
    pub receiver: Pubkey,            // Expected claimer
    pub initializer_mint: Pubkey,    // Token to give
    pub initializer_amount: u64,     // Amount to give
    pub receiver_mint: Pubkey,       // Token to receive
    pub receiver_amount: u64,        // Amount to receive
    pub fee_basis_points: u16,       // Fee (100 = 1%)
    pub fee_collector: Pubkey,       // Fee recipient
    pub expiry: i64,                 // Expiration timestamp
    pub bump: u8,                    // PDA bump
    pub initializer_vault_bump: u8,  // Vault PDA bump
    pub receiver_vault_bump: u8,     // Vault PDA bump
}
```

**Space Calculation:** 8 (discriminator) + 32×4 + 8×2 + 2 + 1×3 = 197 bytes

**Reference:** https://book.anchor-lang.com/anchor_in_depth/space.html

---

## Initialize Instruction

Creates escrow and locks tokens in vaults.

### Account Structure

```rust
#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    // Escrow PDA account
    #[account(
        init,
        payer = initializer,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", initializer.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub initializer: Signer<'info>,

    #[account(mut)]
    pub initializer_token_account: Account<'info, TokenAccount>,

    // Vault authority PDAs
    #[account(
        seeds = [b"initializer_vault", escrow.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA signer
    pub initializer_vault_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [b"receiver_vault", escrow.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA signer
    pub receiver_vault_authority: UncheckedAccount<'info>,

    // Vault ATAs (owned by vault authority PDAs)
    #[account(
        init,
        payer = initializer,
        associated_token::mint = initializer_mint,
        associated_token::authority = initializer_vault_authority,
    )]
    pub initializer_vault: Account<'info, TokenAccount>,

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
}
```

**Key Concepts:**

- **PDA Seeds:** `[b"escrow", initializer.key()]` ensures one escrow per user
- **Vault Authority PDAs:** Own the token vaults, allowing program to control them
- **Associated Token Accounts:** Created with PDA as authority using `allowOwnerOffCurve`

**Reference:** https://book.anchor-lang.com/anchor_in_depth/PDAs.html

### Implementation

```rust
impl<'info> InitializeEscrow<'info> {
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        initializer_amount: u64,
        receiver_amount: u64,
        expiry: i64,
        receiver: Pubkey,
        fee_basis_point: u16,
        fee_collector: Pubkey,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        // Store PDA bumps
        escrow.bump = ctx.bumps.escrow;
        escrow.initializer_vault_bump = ctx.bumps.initializer_vault_authority;
        escrow.receiver_vault_bump = ctx.bumps.receiver_vault_authority;

        // Store escrow data
        escrow.initializer = ctx.accounts.initializer.key();
        escrow.receiver = receiver;
        escrow.initializer_mint = ctx.accounts.initializer_mint.key();
        escrow.initializer_amount = initializer_amount;
        escrow.receiver_mint = ctx.accounts.receiver_mint.key();
        escrow.receiver_amount = receiver_amount;
        escrow.fee_basis_points = fee_basis_point;
        escrow.fee_collector = fee_collector;
        escrow.expiry = expiry;

        // Transfer tokens to vault
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.initializer_token_account.to_account_info(),
                to: ctx.accounts.initializer_vault.to_account_info(),
                authority: ctx.accounts.initializer.to_account_info(),
            }
        );
        transfer(cpi_ctx, initializer_amount)?;

        // Emit event
        emit_cpi!(EscrowInitializedEvent {
            initializer: ctx.accounts.initializer.key(),
            receiver,
            mint: ctx.accounts.initializer_mint.key(),
            amount: initializer_amount,
            expiry,
        });

        Ok(())
    }
}
```

**Reference:** https://book.anchor-lang.com/anchor_in_depth/CPIs.html

---

## Claim Instruction

Executes token swap with fee deduction.

### Account Structure

```rust
#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        mut,
        has_one = initializer,
        has_one = receiver,
        has_one = fee_collector,
        close = initializer,  // Close and return rent to initializer
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub receiver: Signer<'info>,

    #[account(mut)]
    pub initializer: SystemAccount<'info>,

    // Vault authorities (PDAs)
    #[account(
        seeds = [b"initializer_vault", escrow.key().as_ref()],
        bump = escrow.initializer_vault_bump,
    )]
    /// CHECK: PDA signer
    pub initializer_vault_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [b"receiver_vault", escrow.key().as_ref()],
        bump = escrow.receiver_vault_bump,
    )]
    /// CHECK: PDA signer
    pub receiver_vault_authority: UncheckedAccount<'info>,

    // Vaults
    #[account(
        mut,
        associated_token::mint = initializer_mint,
        associated_token::authority = initializer_vault_authority,
    )]
    pub initializer_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = receiver_mint,
        associated_token::authority = receiver_vault_authority,
    )]
    pub receiver_vault: Box<Account<'info, TokenAccount>>,

    // Token accounts (created if needed)
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
        payer = receiver,
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

    /// CHECK: Fee collector pubkey
    pub fee_collector: UncheckedAccount<'info>,

    pub initializer_mint: Account<'info, Mint>,
    pub receiver_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
```

**Key Constraint:** `close = initializer` automatically closes escrow account after execution

**Reference:** https://book.anchor-lang.com/anchor_references/account_constraints.html

### Implementation

```rust
impl<'info> Claim<'info> {
    pub fn claim_escrow(ctx: Context<Claim>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        let clock = Clock::get()?;

        // Validate fee collector
        require_keys_eq!(
            ctx.accounts.fee_collector.key(),
            escrow.fee_collector,
            EscrowError::InvalidFeeCollector
        );

        // Check expiry
        require!(
            clock.unix_timestamp <= escrow.expiry,
            EscrowError::EscrowExpired
        );

        // Calculate fees (basis points: 100 = 1%)
        let fee = (escrow.initializer_amount as u128)
            .checked_mul(escrow.fee_basis_points as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;

        let amount_after_fee = escrow.initializer_amount - fee;

        // Step 1: Receiver → Receiver Vault
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.receiver_token_account.to_account_info(),
                    to: ctx.accounts.receiver_vault.to_account_info(),
                    authority: ctx.accounts.receiver.to_account_info(),
                },
            ),
            escrow.receiver_amount,
        )?;

        // PDA signer seeds for vault authority
        let escrow_key = escrow.key();
        let seeds = &[
            b"initializer_vault",
            escrow_key.as_ref(),
            &[escrow.initializer_vault_bump],
        ];
        let signer = &[&seeds[..]];

        // Step 2: Initializer Vault → Fee Collector
        if fee > 0 {
            transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.initializer_vault.to_account_info(),
                        to: ctx.accounts.fee_collector_token_account.to_account_info(),
                        authority: ctx.accounts.initializer_vault_authority.to_account_info(),
                    },
                    signer,
                ),
                fee,
            )?;
        }

        // Step 3: Initializer Vault → Receiver
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.initializer_vault.to_account_info(),
                    to: ctx.accounts.initializer_vault_to_receiver_token_account.to_account_info(),
                    authority: ctx.accounts.initializer_vault_authority.to_account_info(),
                },
                signer,
            ),
            amount_after_fee,
        )?;

        // Step 4: Receiver Vault → Initializer
        let receiver_seeds = &[
            b"receiver_vault",
            escrow_key.as_ref(),
            &[escrow.receiver_vault_bump],
        ];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.receiver_vault.to_account_info(),
                    to: ctx.accounts.receiver_vault_to_initializer_token_account.to_account_info(),
                    authority: ctx.accounts.receiver_vault_authority.to_account_info(),
                },
                &[&receiver_seeds[..]],
            ),
            escrow.receiver_amount,
        )?;

        emit_cpi!(EscrowClaimedEvent { /* ... */ });
        Ok(())
    }
}
```

**PDA Signing:** Use `CpiContext::new_with_signer` with derived seeds to sign as vault authority

**Reference:** https://book.anchor-lang.com/anchor_in_depth/CPIs.html#cpi-with-pda-signers

---

## Error Handling

```rust
// error.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Escrow is expired")]
    EscrowExpired,

    #[msg("Invalid Fee Collector")]
    InvalidFeeCollector,
}
```

**Usage:**

```rust
require!(condition, EscrowError::EscrowExpired);
require_keys_eq!(key1, key2, EscrowError::InvalidFeeCollector);
```

**Reference:** https://book.anchor-lang.com/anchor_in_depth/errors.html

---

## Events

```rust
// events.rs
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
```

**Emit:**

```rust
emit_cpi!(EscrowInitializedEvent { /* fields */ });
```

**Reference:** https://book.anchor-lang.com/anchor_in_depth/events.html

---

## Program Entry Point

```rust
// lib.rs
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

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        initializer_amount: u64,
        receiver_amount: u64,
        expiry: i64,
        receiver: Pubkey,
        fee_basis_point: u16,
        fee_collector: Pubkey,
    ) -> Result<()> {
        InitializeEscrow::initialize_escrow(
            ctx,
            initializer_amount,
            receiver_amount,
            expiry,
            receiver,
            fee_basis_point,
            fee_collector,
        )
    }

    pub fn claim_escrow(ctx: Context<Claim>) -> Result<()> {
        Claim::claim_escrow(ctx)
    }

    pub fn cancel_escrow(ctx: Context<CancelEscrow>) -> Result<()> {
        CancelEscrow::cancel_escrow(ctx)
    }
}
```

---

## Build & Deploy

```bash
# Build
anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID
solana address -k target/deploy/escrow-keypair.json
```

---

## Security Best Practices

✅ **Use PDAs for vault ownership** - Ensures only program can control vaults
✅ **Validate all accounts** - Use `has_one`, `seeds`, `bump` constraints
✅ **Check expiry** - Prevent claiming expired escrows
✅ **Checked math** - Use `checked_mul`, `checked_div` for fee calculations
✅ **Close accounts** - Return rent after claim using `close` constraint
✅ **Emit events** - Track important state changes

**Reference:** https://book.anchor-lang.com/anchor_blinks/security.html

---

## Key References

- **Anchor Book:** https://book.anchor-lang.com/
- **Solana Cookbook:** https://solanacookbook.com/
- **SPL Token:** https://spl.solana.com/token
- **PDAs Deep Dive:** https://book.anchor-lang.com/anchor_in_depth/PDAs.html
- **CPIs Guide:** https://book.anchor-lang.com/anchor_in_depth/CPIs.html
- **Account Constraints:** https://book.anchor-lang.com/anchor_references/account_constraints.html
- **Security Best Practices:** https://book.anchor-lang.com/anchor_blinks/security.html
- **Sealevel Attacks:** https://github.com/coral-xyz/sealevel-attacks

---

**Last Updated:** December 2025 | **Anchor:** 0.30.x | **Solana:** 1.18.x
