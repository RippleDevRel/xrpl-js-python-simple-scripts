from xrpl.clients import JsonRpcClient
from xrpl.transaction import submit_and_wait, sign, submit
from xrpl.wallet import Wallet
from xrpl.utils import xrp_to_drops
from xrpl.models.requests import AccountInfo
from xrpl.models.transactions import Transaction

def create_amm(seed, trading_fee=500):
    """
    Creates an AMM (Automated Market Maker) for XRP/RLUSD pair
    
    Parameters:
    seed: The seed of the wallet to create the AMM
    trading_fee: Trading fee in basis points (e.g., 500 = 0.5%)
    """
    # Define the network client
    client = JsonRpcClient("https://s.altnet.rippletest.net:51234")
    
    # Create wallet from seed
    wallet = Wallet.from_seed(seed)
    
    # Convert currency code to hex
    currency_hex = "524C555344000000000000000000000000000000"  # Hex for "RLUSD"
    
    # Get account sequence
    account_info = client.request(AccountInfo(
        account=wallet.classic_address,
        ledger_index="validated"
    ))
    sequence = account_info.result['account_data']['Sequence']
    print(f"Sequence: {sequence}")
    # Prepare AMM creation transaction
    tx_dict = {
        "transaction_type": "AMMCreate", # Transaction type for AMM creation https://xrpl.org/docs/references/protocol/transactions/types/ammcreate
        "account": wallet.classic_address,
        "amount": {
            "currency": currency_hex,
            "issuer": "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV",
            "value": "1"  # Amount of RLUSD
        },
        "amount2": "10000000",  # Amount of XRP in drops (10 XRP)
        "trading_fee": trading_fee,
        "fee": "2000000",  # Higher fee for AMM creation
        "flags": 2147483648,  # tfFullyCanonicalSig 
        "sequence": sequence,
    }
    
    # Create Transaction object
    amm_tx = Transaction.from_dict(tx_dict)
    
    print("\n=== Creating AMM ===")
    print(f"Account: {wallet.classic_address}")
    print(f"RLUSD Amount: 1")
    print(f"XRP Amount: 10")
    print(f"Trading Fee: {trading_fee/1000}%")
    
    try:
        # Sign transaction
        signed_tx = sign(amm_tx, wallet)
        
        # Submit transaction
        response = submit(signed_tx, client)
        
        # Check the result
        if "engine_result" in response.result and response.result["engine_result"] == "tesSUCCESS":
            print("\nAMM created successfully!")
            print(f"Transaction hash: {response.result.get('tx_json', {}).get('hash')}")
            return response
        else:
            print("\nAMM creation failed")
            print(f"Error: {response.result.get('engine_result_message')}")
            return response
            
    except Exception as e:
        print(f"\nError creating AMM: {str(e)}")
        raise e
    
    print("==============================\n")

if __name__ == "__main__":
    # Example usage - replace with your values
    seed = "sEd71CfChR48xigRKg5AJcarEcgFMPk"  # Replace with your wallet seed
    
    try:
        # Create AMM with 0.5% trading fee
        response = create_amm(seed, trading_fee=500)
    except Exception as e:
        print(f"Final error: {str(e)}")