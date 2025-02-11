from xrpl.clients import JsonRpcClient
from xrpl.wallet import generate_faucet_wallet

def create_test_wallet():
    """
    Creates and funds a new test wallet on XRPL testnet
    """
    # Define the network client
    client = JsonRpcClient("https://s.altnet.rippletest.net:51234")
    
    # Create a test wallet with test XRP
    test_wallet = generate_faucet_wallet(client)
    
    # Print wallet details
    print("\n=== XRPL Test Wallet Details ===")
    print(f"Public Key: {test_wallet.public_key}")
    print(f"Private Key: {test_wallet.private_key}")
    print(f"Classic Address: {test_wallet.classic_address}")
    print(f"Seed: {test_wallet.seed}")
    print("==============================\n")
    
    return test_wallet

if __name__ == "__main__":
    print("Creating and funding a test wallet...")
    test_wallet = create_test_wallet()
    print("Done!")