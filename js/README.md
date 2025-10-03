# XRPL JavaScript - Simple JS Scripts 🚀

This repository contains JavaScript scripts to interact with the XRP Ledger (XRPL), enabling wallet generation, trustline creation, transactions, and AMM operations.

## 📁 Project Structure

- `generate.js` → Generates a new XRPL wallet (address & seed) 🔑
- `generate_and_trustline.js` → Generates a wallet and establishes a trustline 🤝
- `trustline.js` → Creates a trustline for the RLUSD token 🔄
- `xrp_transaction.js` → Handles XRP transactions 💸
- `rlusd_transaction.js` → Manages RLUSD token transactions 💰
- `amm_create_RLUSD_XRP.js` → Creates an AMM pool for RLUSD/XRP pair 🏦
- `amm_deposit_RLUSD_XRP.js` → Deposits assets into an existing AMM pool 📥
- `escrow.js` → Create a condition and time based escrow 🔒
- `mpt.js` → Issue and interact with MPTs. 


## 🔧 Installation & Setup

1. Install required packages:
```bash
npm install xrpl
```

## 📝 Usage

1. Generate a new wallet:
```bash
node generate.js
```

2. Generate wallet and create trustline for RLUSD:
```bash
node generate_and_trustline.js
```

3. Create a trustline for an existing wallet:
```bash
node trustline.js
```
*Update the script with your wallet seed first.*

4. Send an XRP transaction:
```bash
node xrp_transaction.js
```
*Update the script with your wallet seed and destination address.*

5. Send an RLUSD transaction:
```bash
node rlusd_transaction.js
```
*Update the script with your wallet seed and destination address.*

6. Create an AMM pool:
```bash
node amm_create_RLUSD_XRP.js
```
*Update the script with your wallet seed and desired initial amounts.*

7. Deposit into an AMM pool:
```bash
node amm_deposit_RLUSD_XRP.js
```
*Update the script with your wallet seed and deposit amounts.*
- [AMM Deposit flags](https://xrpl.org/docs/references/protocol/transactions/types/ammdeposit)

## ⚠️ Important Notes

- All scripts use the XRPL Testnet 🌐
- Keep your seed (private key) **secure** and never share it! 🔒
- Ensure you have sufficient XRP for fees and reserves ⚡
- For RLUSD operations, you need an established trustline first ✅

## 🔗 Useful Links

- [XRPL Documentation](https://xrpl.org/)
- [More Examples](https://docs.xrpl-commons.org/)
- [Ripple Stablecoin](https://ripple.com/solutions/stablecoin/)

