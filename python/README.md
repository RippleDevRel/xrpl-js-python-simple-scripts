# XRPL Python - Simple Python Scripts

This repository contains Python scripts to interact with the XRP Ledger (XRPL), enabling wallet generation, trustline creation, transactions, and AMM operations.

## 📁 Project Structure

- `generate.py` → Generates a new XRPL wallet (address & seed)
- `generate_and_trustline.py` → Generates a wallet and establishes a trustline
- `trustline.py` → Creates a trustline for the RLUSD token
- `xrp_transaction.py` → Handles XRP transactions
- `rlusd_transaction.py` → Manages RLUSD token transactions
- `amm_create_RLUSD_XRP.py` → Creates an AMM pool for RLUSD/XRP pair
- `amm_deposit_RLUSD_XRP.py` → Deposits assets into an existing AMM pool

## 🔧 Installation & Setup

1. Install required packages:
```bash
pip install -r requirements.txt
```

## 📝 Usage

1. Generate a new wallet:
```bash
python generate.py
```

2. Generate wallet and create trustline for RLUSD:
```bash
python generate_and_trustline.py
```

3. Create trustline for existing wallet:
```bash
python trustline.py
```
Update the script with your wallet seed first.

4. Send XRP transaction:
```bash
python xrp_transaction.py
```
Update the script with your wallet seed and destination address.

5. Send RLUSD transaction:
```bash
python rlusd_transaction.py
```
Update the script with your wallet seed and destination address.

6. Create AMM pool:
```bash
python amm_create_RLUSD_XRP.py
```
Update the script with your wallet seed and desired initial amounts.

7. Deposit into AMM pool:
```bash
python amm_deposit_RLUSD_XRP.py
```
Update the script with your wallet seed and deposit amounts.

## ⚠️ Important Notes

- All scripts use the XRPL Testnet
- Keep your seed (private key) secure and never share it. The seeds present in the example files are for testing purposes only.  
- Make sure you have sufficient XRP for fees and reserves
- For RLUSD operations, you need an established trustline first

## 🔗 Links

- [XRPL Documentation](https://xrpl.org/)
- [More Examples](https://docs.xrpl-commons.org/)
- [Ripple Stablecoin](https://ripple.com/solutions/stablecoin/)