const dayjs = require('dayjs');
const crypto = require('crypto');
const { Client, isoTimeToRippleTime, xrpToDrops } = require('xrpl');
const cc = require('five-bells-condition');

/*
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
*/

// Helper function to generate condition and fulfillment
const generateConditionAndFulfillment = () => {
  console.log(
    "******* LET'S GENERATE A CRYPTO CONDITION AND FULFILLMENT *******"
  );
  console.log();

  // use cryptographically secure random bytes generation
  const preimage = crypto.randomBytes(32);

  const fulfillment = new cc.PreimageSha256();
  fulfillment.setPreimage(preimage);

  const condition = fulfillment
    .getConditionBinary()
    .toString('hex')
    .toUpperCase();
  console.log('Condition:', condition);

  // Keep secret until you want to finish the escrow
  const fulfillment_hex = fulfillment
    .serializeBinary()
    .toString('hex')
    .toUpperCase();
  console.log(
    'Fulfillment (keep secret until you want to finish the escrow):',
    fulfillment_hex
  );

  console.log();

  return {
    condition,
    fulfillment: fulfillment_hex,
  };
};

// Helper function to submit escrow transactions
const escrowTransaction = async ({ txn, client, wallet }) => {
  const escrowResponse = await client.submitAndWait(txn, {
    autofill: true,
    wallet,
  });

  console.log(JSON.stringify(escrowResponse, null, 2));

  return escrowResponse;
};

// Sleep function to wait
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

///////////// MAIN FUNCTION - Create condition

const main = async () => {
  console.log('Creating an escrow with a crypto condition!');
  
  // Connect the client to the network
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  const { wallet: walletOne } = await client.fundWallet();
  const { wallet: walletTwo } = await client.fundWallet();
  console.log({ walletOne, walletTwo });

  // Time after which the destination user can claim the funds
  const WAITING_TIME = 10; // seconds

  // Define the time from when the Destination wallet can claim the money in the escrow
  const finishAfter = dayjs().add(WAITING_TIME, 'seconds').toISOString();

  // Generate the condition and fulfillment
  const { condition, fulfillment } = generateConditionAndFulfillment();

  // Create the escrow
  console.log('Creating escrow...');
  const escrowCreateResponse = await escrowTransaction({
    txn: {
      Account: walletOne.address,
      TransactionType: 'EscrowCreate',
      Amount: xrpToDrops('1'),
      Destination: walletTwo.address,
      FinishAfter: isoTimeToRippleTime(finishAfter),
      Condition: condition,
    },
    client,
    wallet: walletOne,
  });
  // We need the sequence to finish an escrow, if it is not there, stop the function
  console.log(escrowCreateResponse.result.tx_json.Sequence);
  if (!escrowCreateResponse.result.tx_json.Sequence) {
    console.log('No sequence number found, stopping...');
    await client.disconnect();
    return;
  }

  // Wait for the specified time before finishing the escrow
  console.log(`Waiting ${WAITING_TIME} seconds before finishing escrow...`);
  await sleep(WAITING_TIME * 1000);

  // Finish the escrow
  console.log('Finishing escrow...');
  await escrowTransaction({
    txn: {
      Account: walletTwo.address,
      TransactionType: 'EscrowFinish',
      Condition: condition,
      Fulfillment: fulfillment,
      OfferSequence: escrowCreateResponse.result.tx_json.Sequence,
      Owner: walletOne.address,
    },
    client,
    wallet: walletTwo, // Make sure this is the wallet which was in the "Destination" field during the escrow creation
  });

  console.log('Escrow transaction sent successfully');

  // Example of how to cancel an escrow (commented out since we already finished it)
  /*
  console.log('Canceling escrow...');
  await escrowTransaction({
    txn: {
      Account: walletOne.address, // The account submitting the cancel request
      TransactionType: 'EscrowCancel',
      Owner: walletOne.address, // The account that created the escrow
      OfferSequence: escrowCreateResponse.result.Sequence, // The sequence number of the EscrowCreate transaction
    },
    client,
    wallet: walletOne, // The wallet of the account that created the escrow
  });
  */

  await client.disconnect();
};

main().catch(console.error);

