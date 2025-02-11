from xrpl.clients import JsonRpcClient
from xrpl.wallet import generate_faucet_wallet
from xrpl.models.transactions import Payment
from xrpl.utils import xrp_to_drops
from xrpl.transaction import submit_and_wait

def send_xrp(destination_address, amount):
    """
    Creates a wallet and sends XRP to a destination address
    
    Parameters:
    destination_address: The address to send XRP to
    amount: Amount of XRP to send
    """
    # Define the network client
    client = JsonRpcClient("https://s.altnet.rippletest.net:51234")
    
    # Generate and fund a test wallet
    wallet = generate_faucet_wallet(client)
    print("\n=== Wallet Created ===")
    print(f"Public Key: {wallet.public_key}")
    print(f"Private Key: {wallet.private_key}")
    print(f"Classic Address: {wallet.classic_address}")
    print(f"Seed: {wallet.seed}")
    
    # Prepare payment transaction
    payment = Payment(
        account=wallet.classic_address,
        amount=xrp_to_drops(amount),
        destination=destination_address
    )
    
    print("\n=== Sending XRP ===")
    print(f"From: {wallet.classic_address}")
    print(f"To: {destination_address}")
    print(f"Amount: {amount} XRP")
    
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
    # Example usage
    destination = "rP3Uk5UFbb7EpJKqsNtBGoHQNiwQbCYKDb"  # Replace with destination address
    amount = 1  # Amount in XRP
    
    send_xrp(destination, amount)