# XRPL JS - Simple JS scripts

This repository contains JavaScript scripts to interact with the XRP Ledger (XRPL), enabling wallet generation, trustline approval, and transactions.  

## 📁 Project Structure

The scripts are located inside the src folder:  

- `generate.js` → Generates a new XRPL wallet (address & seed).

- `rlusd.js` → Generates a new XRPL wallet (address & seed) and approves a trustline for the RLUSD token on XRPL.

- `transaction.js` → Sends an XRP transaction from one wallet to another.

## 🔧 Installation & Setup

Clone this repo and run `npm i`.

## 📝 Usage

1. Run the following command to generate a new wallet:  

`node src/generate.js`  

2. Generate a wallet and approve Trustline for RLUSD:  

`node src/rlusd.js`  

3. Send an XRP Transaction:  

Before running this script, update transaction.js with:  
- Source Wallet Seed (from generate.js)
- Destination Wallet Address

`node src/transaction.js`  

## Links

- [XRPL Documentation](https://xrpl.org/)
- [Ripple Stablecoin](https://ripple.com/solutions/stablecoin/)