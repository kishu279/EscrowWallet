# 🔐 Solana Escrow dApp

A secure, decentralized escrow platform built on Solana blockchain for trustless peer-to-peer token swaps with expiry times and fee collection.

**🎥 [Watch Demo Video](https://drive.google.com/file/d/1XrXnGyR555J_BUqOWOLOEeAAwzDsHjBk/view?usp=sharing)**

**Program ID:** `DCA5tgdnUxARGKY1oYpcnLkzeuxYaKSiXMMJ3irou6tu`  
**Network:** Solana Devnet

---

## 📋 Table of Contents

- [Features](#-features)
- [Demo](#-demo)
- [Quick Start](#-quick-start)
- [How to Use](#-how-to-use)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Documentation](#-documentation)
- [Tech Stack](#-tech-stack)
- [Security](#-security)
- [License](#-license)

---

## ✨ Features

- 🔒 **Secure Escrow** - Smart contract holds tokens until conditions are met
- ⏰ **Time-based Expiry** - Set expiration times for escrow agreements
- 💰 **Fee Collection** - Configurable fee system (basis points)
- 🔄 **Token Swaps** - Exchange any SPL tokens peer-to-peer
- ❌ **Cancellable** - Initializer can cancel and retrieve tokens
- 🎯 **PDA Security** - Program Derived Addresses ensure safe vault management
- 📱 **Modern UI** - Clean, responsive Next.js interface
- 🔌 **Wallet Support** - Compatible with all Solana wallets

---

## 🎥 Demo

**[📺 Watch Full Demo Video on Google Drive](https://drive.google.com/file/d/1XrXnGyR555J_BUqOWOLOEeAAwzDsHjBk/view?usp=sharing)**

The demo video shows:

- Complete user flow from wallet connection to escrow creation
- Token wrapping (SOL to wSOL)
- Initializing and claiming escrows
- Viewing escrow history
- Cancel functionality

_Local copy also available at: [`proof/Untitled design.mp4`](./proof/Untitled%20design.mp4)_

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Rust 1.75+
- Solana CLI 1.18+
- Anchor CLI 0.30+
- A Solana wallet (Phantom, Solflare, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/kishu279/EscrowWallet.git
cd escrow

# Install dependencies
pnpm install

# Install client dependencies
cd app/escrow
pnpm install
cd ../..

# Build the program
anchor build

# Run tests
anchor test

# Deploy to devnet (optional)
anchor deploy --provider.cluster devnet
```

### Start the Client

```bash
cd app/escrow
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 How to Use

### For Users

#### 1. **Connect Wallet**

- Click "Connect Wallet" in the header
- Select your Solana wallet (Phantom, Solflare, etc.)
- Approve the connection

#### 2. **Wrap SOL (if needed)**

If you want to use SOL in escrow:

- In the Initialize dialog, use the "Wrap SOL to wSOL" section
- Enter amount and click "Wrap"
- This converts native SOL to SPL Token (wSOL)

#### 3. **Initialize Escrow**

- Click the "Initialize" button
- Fill in the form:
  - **You Give:** Select token and amount you're offering
  - **You Want:** Select token and amount you're requesting
  - **Recipient Address:** Wallet address of the receiver
- Click "Initialize Escrow"
- Approve the transaction in your wallet

#### 4. **View Your Escrow**

- Scroll down to see "My Escrow" section
- View escrow details:
  - Owner, Time remaining, Status, Fee
  - Tokens offered and requested
  - Expiry time
- Copy your escrow PDA address if needed

#### 5. **Claim Escrow** (For Receiver)

- Click the "Claim" button
- Enter the escrow ID (PDA address)
- Click "Claim Escrow"
- Approve the transaction
- Tokens are automatically swapped with fee deduction

#### 6. **Cancel Escrow** (For Initializer)

- In "My Escrow" section, click "Cancel" button
- Confirm cancellation in the dialog
- Approve the transaction
- Your tokens are returned and escrow is closed

#### 7. **View History**

- Click "History" in the navigation
- See all escrows on the platform
- Your escrows are highlighted in green
- View stats: Total, Your Escrows, Other Escrows

---

## 📁 Project Structure

```
escrow/
├── programs/escrow/          # Solana smart contract
│   └── src/
│       ├── lib.rs           # Program entry point
│       ├── state.rs         # Data structures
│       ├── error.rs         # Custom errors
│       ├── events.rs        # Event definitions
│       └── instructions/    # Program instructions
├── app/escrow/              # Next.js frontend
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   ├── lib/                 # Utilities & helpers
│   └── hook/                # Custom hooks
├── tests/                   # Anchor tests
├── docs/                    # Documentation
│   ├── 01-SMART-CONTRACT-GUIDE.md
│   ├── 02-CLIENT-TESTING-GUIDE.md
│   └── 03-CLIENT-DOCUMENTATION.md
└── proof/                   # Demo video
```

---

## 🛠️ Development

### Build Program

```bash
anchor build
```

### Run Tests

```bash
# Start local validator
solana-test-validator

# Run tests
anchor test --skip-local-validator
```

### Deploy

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Update program ID in:
# - Anchor.toml
# - programs/escrow/src/lib.rs (declare_id!)
# - app/escrow/lib/config.ts
```

### Client Development

```bash
cd app/escrow

# Development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

---

## 📚 Documentation

Comprehensive guides available in the `docs/` folder:

1. **[Smart Contract Guide](./docs/01-SMART-CONTRACT-GUIDE.md)**

   - Program architecture
   - State structures
   - Instructions (Initialize, Claim, Cancel)
   - PDAs and vault management
   - Security best practices

2. **[Client Testing Guide](./docs/02-CLIENT-TESTING-GUIDE.md)**

   - Test environment setup
   - Writing tests with Anchor
   - Common testing patterns
   - Troubleshooting

3. **[Client Documentation](./docs/03-CLIENT-DOCUMENTATION.md)**
   - Wallet integration
   - ATA management
   - Program interactions
   - Common issues & solutions

---

## 🔧 Tech Stack

### Smart Contract

- **Anchor Framework** 0.30.x - Solana development framework
- **Rust** 1.75+ - Smart contract language
- **Solana** 1.18.x - Blockchain platform
- **SPL Token** - Token standard

### Frontend

- **Next.js** 16 - React framework with App Router
- **TypeScript** 5+ - Type-safe JavaScript
- **Tailwind CSS** 4 - Utility-first CSS
- **shadcn/ui** - UI components
- **Wallet Adapter** 0.15.x - Solana wallet integration
- **Anchor Client** - Program interaction
- **Sonner** - Toast notifications
- **Lucide React** - Icons

### Testing

- **Mocha** - Test framework
- **Chai** - Assertions
- **ts-mocha** - TypeScript support

---

## 🔐 Security

### Implemented Security Features

✅ **PDA Ownership** - Vaults owned by Program Derived Addresses  
✅ **Account Validation** - Strict constraint checks using Anchor  
✅ **Expiry Checks** - Runtime validation of escrow expiration  
✅ **Checked Math** - Overflow protection in fee calculations  
✅ **Account Closing** - Proper cleanup and rent return  
✅ **Event Emission** - Transparent on-chain tracking

### Important Notes

⚠️ **Devnet Only** - This is a demonstration project deployed on Solana Devnet  
⚠️ **Audit Required** - Not audited for mainnet deployment  
⚠️ **Fee System** - Currently uses fixed 1% fee (100 basis points)

---

## 🎯 Use Cases

- **P2P Token Trading** - Direct token swaps without intermediaries
- **OTC Deals** - Over-the-counter trades with time limits
- **Escrow Services** - Hold tokens for service delivery
- **NFT Trades** - Exchange NFTs for tokens (with proper mint setup)
- **Payment Solutions** - Time-locked payments with conditions

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 Common Issues

### "Account does not exist"

**Solution:** Ensure your wallet has wrapped SOL (wSOL) or the required SPL tokens. Use the "Wrap SOL" feature.

### "Insufficient balance"

**Solution:** Make sure you have enough tokens in your wallet. Check token balance before initializing.

### "Provided owner is not allowed"

**Solution:** This is a program-level issue. Ensure PDAs are derived correctly with `allowOwnerOffCurve: true`.

### Transaction fails

**Solution:**

- Check you're connected to Devnet
- Ensure sufficient SOL for transaction fees (~0.01 SOL)
- Verify token mints are valid on Devnet

---

## 🔗 Links

- **Repository:** https://github.com/kishu279/EscrowWallet
- **Solana Explorer:** [View Program](https://explorer.solana.com/address/DCA5tgdnUxARGKY1oYpcnLkzeuxYaKSiXMMJ3irou6tu?cluster=devnet)
- **Anchor Docs:** https://book.anchor-lang.com/
- **Solana Docs:** https://docs.solana.com/

---

## 📄 License

ISC License - see LICENSE file for details

---

## 👤 Author

**Kishu**

- GitHub: [@kishu279](https://github.com/kishu279)
- Repository: [EscrowWallet](https://github.com/kishu279/EscrowWallet)

---

## 🙏 Acknowledgments

- Solana Foundation for the blockchain platform
- Anchor Framework for development tools
- Next.js team for the frontend framework
- shadcn for beautiful UI components

---

**Built with ❤️ on Solana**
