# XRPL Scripts - JavaScript & Python 🚀

This repository contains scripts in both JavaScript and Python to interact with the XRP Ledger (XRPL). These scripts allow testing functionalities such as wallet generation, trustline approval, transactions, and Automated Market Maker (AMM) operations.

## Devnet - Testnet - Mainnet 

The XRP Ledger operates on three distinct network environments, each serving different purposes in the development and deployment lifecycle.  

[**Devnet**](https://devnet.xrpl.org/) functions as a sandbox environment where new amendments and features are tested in their pre-release state, allowing developers to experiment with upcoming functionality before it reaches production.  

[**Mainnet (livenet)**](https://livenet.xrpl.org/) is the live production network where real XRP transactions occur and hold actual monetary value.  

[**Testnet**](https://testnet.xrpl.org/) serves as a replica of Mainnet, mirroring its current state and configuration - when an amendment is activated on Mainnet, it is subsequently enabled on Testnet to maintain consistency between the two environments.  

This tiered approach ensures thorough testing and validation of new features while providing developers with appropriate environments for different stages of application development.

## 📁 Project Structure

The scripts are divided into two main folders:

- **`js/`** → Contains JavaScript scripts for XRPL interactions.
- **`python/`** → Contains Python scripts for XRPL interactions.

### JavaScript Scripts (`js/`)
- `generate.js` → Generates a new XRPL wallet (address & seed) 🔑
- `generate_and_trustline.js` → Generates a wallet and establishes a trustline 🤝
- `trustline.js` → Creates a trustline for the RLUSD token 🔄
- `xrp_transaction.js` → Handles XRP transactions 💸
- `rlusd_transaction.js` → Manages RLUSD token transactions 💰
- `amm_create_RLUSD_XRP.js` → Creates an AMM pool for RLUSD/XRP pair 🏦
- `amm_deposit_RLUSD_XRP.js` → Deposits assets into an existing AMM pool 📥
- `escrow.js` → Create a condition and time based escrow 🔒. 



### Python Scripts (`python/`)
- `generate.py` → Generates a new XRPL wallet (address & seed) 🔑
- `generate_and_trustline.py` → Generates a wallet and establishes a trustline 🤝
- `trustline.py` → Creates a trustline for the RLUSD token 🔄
- `xrp_transaction.py` → Handles XRP transactions 💸
- `rlusd_transaction.py` → Manages RLUSD token transactions 💰
- `amm_create_RLUSD_XRP.py` → Creates an AMM pool for RLUSD/XRP pair 🏦
- `amm_deposit_RLUSD_XRP.py` → Deposits assets into an existing AMM pool 📥
- `escrow.py` → Create a condition and time based escrow 🔒 

### New amendments  (`devnet/`)
Within this folder you will find scripts to interact with new amendments that are only live on DevNet and not on Testnet/Mainnet. You can find the list of amendments currently live on DevNet here: https://devnet.xrpl.org/amendments.  
**Important note**: An amendment may be live on DevNet but not yet supported by one of the XRPL libraries (Python/JS). Please check the library documentation or release notes for compatibility before using these scripts.


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


