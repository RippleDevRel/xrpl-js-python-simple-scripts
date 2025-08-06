import time
import hashlib
import secrets
from datetime import datetime, timedelta
from xrpl.clients import JsonRpcClient
from xrpl.models.transactions import EscrowCreate, EscrowFinish, EscrowCancel
from xrpl.utils import xrp_to_drops, datetime_to_ripple_time
from xrpl.transaction import submit_and_wait
from xrpl.wallet import generate_faucet_wallet

"""
===============================================================================
                    CRYPTO CONDITIONS EXPLAINED
===============================================================================

 1. PREIMAGE (Secret Data)
    ┌─────────────────────────────────────┐
    │  Random 32 bytes (kept private)    │
    │  [175, 42, 183, 91, 203, 45, ...]  │
    └─────────────────────────────────────┘
                      │
                      ▼ SHA256 Hash
                      
 2. CONDITION (Public Lock)
    ┌─────────────────────────────────────┐
    │  Hash of preimage (visible on-chain)│
    │  "A1B2C3D4E5F6..." (hex format)    │
    └─────────────────────────────────────┘
                      
 3. FULFILLMENT (Secret Key)
    ┌─────────────────────────────────────┐
    │  Preimage + Metadata                │
    │  - Type: "preimage-sha-256"         │
    │  - Length: 32                       │
    │  - Data: [175, 42, 183, 91, ...]   │
    └─────────────────────────────────────┘

===============================================================================
                         ESCROW FLOW
===============================================================================

STEP 1: Create Escrow
┌─────────────┐    EscrowCreate     ┌─────────────┐
│  Wallet 1   │ ──────────────────► │ XRPL Ledger │
│ (Creator)   │    + Condition      │             │
└─────────────┘    (public hash)    └─────────────┘

STEP 2: Wait for conditions (time + crypto condition)

STEP 3: Finish Escrow  
┌─────────────┐    EscrowFinish     ┌─────────────┐
│  Wallet 2   │ ──────────────────► │ XRPL Ledger │
│(Destination)│  + Condition        │             │
└─────────────┘  + Fulfillment      └─────────────┘
                 (secret revealed)

STEP 4: Ledger verifies SHA256(fulfillment.preimage) === condition
        ✅ Match? → Funds released to Wallet 2
        ❌ No match? → Transaction fails

===============================================================================
                         SECURITY MODEL
===============================================================================

🔒 CONDITION (Public):    "I can prove I know a secret"
🔑 FULFILLMENT (Private): "Here's the actual secret"
🛡️  VERIFICATION:         Network checks the secret matches the promise

Think of it like:
- Condition = Lock on a treasure chest (everyone can see it)  
- Fulfillment = The key to open the lock (kept secret until needed)
- Preimage = The specific shape/pattern of that key

===============================================================================
"""

def generate_condition_and_fulfillment():
    """Generate a crypto condition and fulfillment using SHA256"""
    print("******* LET'S GENERATE A CRYPTO CONDITION AND FULFILLMENT *******")
    print()
    
    # Generate cryptographically secure random bytes (preimage)
    preimage = secrets.token_bytes(32)
    
    # Create the condition (SHA256 hash of preimage)
    condition_hash = hashlib.sha256(preimage).digest()
    
    # XRPL condition format: 0xA0 + 0x25 + 0x80 + 0x20 + hash + 0x81 + 0x01 + 0x20
    # This follows the Crypto-Conditions RFC standard
    condition = bytes([0xA0, 0x25, 0x80, 0x20]) + condition_hash + bytes([0x81, 0x01, 0x20])
    condition_hex = condition.hex().upper()
    
    # XRPL fulfillment format: 0xA0 + length + 0x80 + 0x20 + preimage
    fulfillment = bytes([0xA0, 0x22, 0x80, 0x20]) + preimage
    fulfillment_hex = fulfillment.hex().upper()
    
    print(f'Condition: {condition_hex}')
    print(f'Fulfillment (keep secret until you want to finish the escrow): {fulfillment_hex}')
    print()
    
    return {
        'condition': condition_hex,
        'fulfillment': fulfillment_hex,
        'preimage': preimage.hex().upper()
    }

def escrow_transaction(txn, client, wallet):
    """Submit an escrow transaction and wait for validation"""
    print(f'Submitting transaction: {txn.transaction_type}')
    
    try:
        response = submit_and_wait(txn, client, wallet)
        
        print(f'Transaction result: {response.result.get("meta", {}).get("TransactionResult", "Unknown")}')
        print(f'Transaction validated: {response.result.get("validated", False)}')
        
        return response
        
    except Exception as e:
        print(f'Error submitting transaction: {str(e)}')
        raise

def main():
    """Main function to demonstrate escrow with crypto conditions"""
    print('Creating an escrow with a crypto condition!')
    
    # Connect to XRPL testnet
    client = JsonRpcClient("https://s.altnet.rippletest.net:51234")
    
    # Generate funded wallets
    print('Generating funded wallets...')
    wallet_one = generate_faucet_wallet(client, debug=True)
    wallet_two = generate_faucet_wallet(client, debug=True)
    
    print(f'Wallet One: {wallet_one.classic_address}')
    print(f'Wallet Two: {wallet_two.classic_address}')
    
    # Time after which the destination user can claim the funds
    WAITING_TIME = 15  # seconds
    
    # Define the time from when the destination wallet can claim the money
    finish_after = datetime.now() + timedelta(seconds=WAITING_TIME)
    finish_after_ripple = datetime_to_ripple_time(finish_after)
    
    # Generate the condition and fulfillment
    crypto_data = generate_condition_and_fulfillment()
    
    # Create the escrow
    print('Creating escrow...')
    escrow_create_tx = EscrowCreate(
        account=wallet_one.classic_address,
        amount=xrp_to_drops(1),  # 1 XRP
        destination=wallet_two.classic_address,
        finish_after=finish_after_ripple,
        condition=crypto_data['condition']
    )
    
    escrow_create_response = escrow_transaction(escrow_create_tx, client, wallet_one)
    
    # Get the sequence number for finishing the escrow
    sequence = escrow_create_response.result.get('tx_json', {}).get('Sequence')
    if not sequence:
        print('No sequence number found, stopping...')
        print('Full response:', escrow_create_response.result)
        return
    
    print(f'Escrow created successfully with sequence: {sequence}')
    
    # Wait for the specified time before finishing the escrow
    print(f'Waiting {WAITING_TIME} seconds before finishing escrow...')
    time.sleep(WAITING_TIME)
    
    # Finish the escrow
    print('Finishing escrow...')
    escrow_finish_tx = EscrowFinish(
        account=wallet_two.classic_address,
        condition=crypto_data['condition'],
        fulfillment=crypto_data['fulfillment'],
        offer_sequence=sequence,
        owner=wallet_one.classic_address
    )
    
    escrow_finish_response = escrow_transaction(escrow_finish_tx, client, wallet_two)
    
    print('Escrow transaction completed successfully!')
    
    # Example of how to cancel an escrow (commented out since we already finished it)
    """
    print('Canceling escrow...')
    escrow_cancel_tx = EscrowCancel(
        account=wallet_one.classic_address,  # The account submitting the cancel request
        owner=wallet_one.classic_address,    # The account that created the escrow
        offer_sequence=sequence              # The sequence number of the EscrowCreate transaction
    )
    
    escrow_cancel_response = escrow_transaction(escrow_cancel_tx, client, wallet_one)
    """

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error in main execution: {str(e)}")