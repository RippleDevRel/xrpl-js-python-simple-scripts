from xrpl.clients import JsonRpcClient
from xrpl.transaction import submit_and_wait, sign, submit
from xrpl.wallet import Wallet
from xrpl.models.requests import AccountInfo
from xrpl.models.transactions import Transaction
from decimal import Decimal

def amm_deposit_single_rlusd(seed, rlusd_amount="0.5"):
    """
    Deposits only RLUSD into an existing AMM
    """
    # Define the network client
    client = JsonRpcClient("https://s.altnet.rippletest.net:51234")
    
    # Create wallet from seed
    wallet = Wallet.from_seed(seed)
    
    # RLUSD constants
    currency_hex = "524C555344000000000000000000000000000000"  # Hex for "RLUSD"
    issuer = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV"
    
    # Get account sequence
    account_info = client.request(AccountInfo(
        account=wallet.classic_address,
        ledger_index="validated"
    ))
    sequence = account_info.result['account_data']['Sequence']
    
    # Prepare AMM deposit transaction
    tx_dict = {
        "transaction_type": "AMMDeposit",
        "account": wallet.classic_address,
        "amount": {
            "currency": currency_hex,
            "issuer": issuer,
            "value": str(rlusd_amount)
        },
        "asset": {
            "currency": currency_hex,
            "issuer": issuer
        },
        "asset2": {
            "currency": "XRP"
        },
        "flags": 524288,  # tfSingleAsset -> full doc https://xrpl.org/docs/references/protocol/transactions/types/ammdeposit
        "fee": "10",
        "sequence": sequence
    }
    
    # Create Transaction object
    deposit_tx = Transaction.from_dict(tx_dict)
    
    print("\n=== Depositing RLUSD to AMM ===")
    print(f"Account: {wallet.classic_address}")
    print(f"RLUSD Amount: {rlusd_amount} RLUSD")
    
    try:
        # Sign transaction
        signed_tx = sign(deposit_tx, wallet)
        
        # Submit transaction
        response = submit(signed_tx, client)
        
        # Check the result
        if "engine_result" in response.result and response.result["engine_result"] == "tesSUCCESS":
            print("\nDeposit successful!")
            print(f"Transaction hash: {response.result.get('tx_json', {}).get('hash')}")
            return response
        else:
            print("\nDeposit failed")
            print(f"Error: {response.result}")
            return response
            
    except Exception as e:
        print(f"\nError making deposit: {str(e)}")
        raise e

if __name__ == "__main__":
    seed = "sEd71CfChR48xigRKg5AJcarEcgFMPk"
    rlusd_amount = "0.5"
    
    try:
        response = amm_deposit_single_rlusd(seed, rlusd_amount)
    except Exception as e:
        print(f"Final error: {str(e)}")