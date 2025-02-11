from xrpl.clients import JsonRpcClient
from xrpl.models.transactions import TrustSet
from xrpl.utils import xrp_to_drops
from xrpl.transaction import submit_and_wait
from xrpl.wallet import generate_faucet_wallet

def text_to_hex(text):
    """Convert text to hex with proper padding"""
    if len(text) > 20:
        raise ValueError("Text must be 20 characters or less")
    # Convert to hex and remove '0x' prefix
    hex_text = text.encode('ascii').hex().upper()
    # Pad with zeros to make it exactly 40 characters
    return hex_text.ljust(40, '0')

def create_trustline(issuer_address, currency_code, limit_amount="1000000000"):
    """
    Creates a trustline for a specific currency on XRPL testnet
    
    Parameters:
    issuer_address: The address of the token issuer
    currency_code: The currency code (e.g., 'USD')
    limit_amount: The trust line limit amount (default: 1000000000)
    """
    # Define the network client
    client = JsonRpcClient("https://s.altnet.rippletest.net:51234")
    wallet = generate_faucet_wallet(client)
    
    # Convert currency code to proper hex format
    try:
        currency_hex = text_to_hex(currency_code)
    except ValueError as e:
        print(f"Error: {e}")
        return
    
    # Prepare the trust set transaction
    trust_set_tx = TrustSet(
        account=wallet.classic_address,
        limit_amount={
            "currency": currency_hex,
            "issuer": issuer_address,
            "value": str(limit_amount)
        }
    )
    
    print("\n=== Creating Trustline ===")
    print(f"Account: {wallet.classic_address}")
    print(f"Currency (original): {currency_code}")
    print(f"Currency (hex): {currency_hex}")
    print(f"Issuer: {issuer_address}")
    print(f"Limit: {limit_amount}")
    
    try:
        # Submit and wait for validation
        response = submit_and_wait(trust_set_tx, client, wallet)
        
        # Check the result
        if response.is_successful():
            print("\nTrustline created successfully!")
            print(f"Transaction hash: {response.result['hash']}")
            print(f"Wallet Address: {wallet.classic_address}")
            print(f"Wallet Seed: {wallet.seed}")
        else:
            print("\nFailed to create trustline")
            print(f"Error: {response.result.get('engine_result_message')}")
            
    except Exception as e:
        print(f"\nError creating trustline: {str(e)}")
    
    print("==============================\n")

if __name__ == "__main__":
    issuer_address = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV"
    currency_code = "RLUSD"
    
    create_trustline(issuer_address, currency_code)