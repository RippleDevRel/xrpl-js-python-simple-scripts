from xrpl.clients import JsonRpcClient
from xrpl.models.transactions import Payment
from xrpl.transaction import submit_and_wait
from xrpl.wallet import Wallet

def send_rlusd(seed, destination_address, amount, issuer_address):
    """
    Sends RLUSD from a wallet to a destination address
    
    Parameters:
    seed: The seed of the sending wallet
    destination_address: The address to send RLUSD to
    amount: Amount of RLUSD to send
    issuer_address: The address of the RLUSD issuer
    """
    # Define the network client
    client = JsonRpcClient("https://s.altnet.rippletest.net:51234")
    
    # Create wallet from seed
    wallet = Wallet.from_seed(seed)
    
    # Convert currency code to hex
    currency_hex = "524C555344000000000000000000000000000000"  # Hex for "RLUSD"
    
    # Prepare payment transaction
    payment = Payment(
        account=wallet.classic_address,
        amount={
            "currency": currency_hex,
            "value": str(amount),
            "issuer": issuer_address
        },
        destination=destination_address
    )
    
    print("\n=== Sending RLUSD ===")
    print(f"From: {wallet.classic_address}")
    print(f"To: {destination_address}")
    print(f"Amount: {amount} RLUSD")
    print(f"Issuer: {issuer_address}")
    
    try:
        # Submit and wait for validation
        response = submit_and_wait(payment, client, wallet)
        
        # Check the result
        if response.is_successful():
            print("\nPayment successful!")
            print(f"Transaction hash: {response.result['hash']}")
        else:
            print("\nPayment failed")
            print(f"Error: {response.result.get('engine_result_message')}")
            
    except Exception as e:
        print(f"\nError sending payment: {str(e)}")
    
    print("==============================\n")

if __name__ == "__main__":
    # Example usage - replace with your values
    seed = "sEd71CfChR48xigRKg5AJcarEcgFMPk"  # Replace with sender's seed
    destination = "rNB4HFHi7Cqoz9Uv8x6JzBrn4xLBKeQLTt"  # Replace with destination address wich hqs RLUSD trustline enabled
    amount = 1  # Amount of RLUSD to send
    issuer = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV"  # RLUSD issuer address
    
    send_rlusd(seed, destination, amount, issuer)