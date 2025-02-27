# XRPL Scripts - JavaScript & Python 🚀

This repository contains scripts in both JavaScript and Python to interact with the XRP Ledger (XRPL). These scripts allow testing functionalities such as wallet generation, trustline approval, transactions, and Automated Market Maker (AMM) operations.

## 📁 Project Structure

The scripts are divided into two main folders:

- **`js/`** → Contains JavaScript scripts for XRPL interactions.
- **`python/`** → Contains Python scripts for XRPL interactions.

### JavaScript Scripts (`js/`)
- `generate.js` → Generates a new XRPL wallet.
- `trustline.js` → Creates a trustline for RLUSD.
- `xrp_transaction.js` → Handles XRP transactions.
- `amm_create_RLUSD_XRP.js` → Creates an AMM pool for RLUSD/XRP.
- `amm_deposit_RLUSD_XRP.js` → Deposits into an existing AMM pool.


### Python Scripts (`python/`)
- `generate.py` → Generates a new XRPL wallet.
- `trustline.py` → Creates a trustline for RLUSD.
- `xrp_transaction.py` → Handles XRP transactions.
- `amm_create_RLUSD_XRP.py` → Creates an AMM pool for RLUSD/XRP.
- `amm_deposit_RLUSD_XRP.py` → Deposits into an existing AMM pool.

## 🔧 Installation & Setup

### JavaScript
1. Clone this repo and navigate to the `js/` folder.
2. Run `npm install` to install dependencies.

### Python
1. Navigate to the `python/` folder.  
2. Install required packages:
```bash
pip install -r requirements.txt
```  
or:  
```bash
# Create a virtual env
python3 -m venv myenv

# Activate env
source myenv/bin/activate  # On macOS/Linux
# myenv\Scripts\activate  # On Windows

# Install xrpl-py in the virtual env
pip install xrpl-py```
```  
## ⚠️ Important Notes
- All scripts are designed for the XRPL Testnet.
- Keep your wallet seed secure and never share it.
- Ensure you have sufficient XRP for fees and reserves.
- RLUSD operations require an established trustline first.

## 🔗 Useful Links
- [XRPL Documentation](https://xrpl.org/)
- [XRPL Commons Examples](https://docs.xrpl-commons.org/)
- [Ripple Stablecoin](https://ripple.com/solutions/stablecoin/)
- [RLUSD Faucet](https://tryrlusd.com/)


