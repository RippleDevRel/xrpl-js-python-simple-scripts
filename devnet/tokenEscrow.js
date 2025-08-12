const dayjs = require('dayjs');
const crypto = require('crypto');
const { Client, isoTimeToRippleTime } = require('xrpl');
const cc = require('five-bells-condition');

/*
===============================================================================
                    TOKEN-ENABLED ESCROWS (XLS-85d)
===============================================================================

This script demonstrates Token-Enabled Escrows combining:
1. Multi-Purpose Tokens (MPT) creation
2. Crypto conditions (preimage-sha256)
3. Token escrows with time and condition locks

Flow:
1. Create MPT with escrow capabilities (flag 0x0008)
2. Generate crypto condition and fulfillment  
3. Create token escrow with condition and time lock
4. Wait for time condition
5. Finish escrow with fulfillment
https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0085-token-escrow
===============================================================================
*/

// Helper function to convert text to hex
const textToHex = (text) => {
  return Buffer.from(text, 'utf8').toString('hex').toUpperCase();
};

// Helper function to submit transactions with detailed logging
const submitTransaction = async (txn, client, wallet, description = '') => {
  if (description) {
    console.log(`\n🔄 ${description}`);
  }
  
  console.log(`📤 Submitting: ${txn.TransactionType}`);
  
  try {
    const response = await client.submitAndWait(txn, {
      autofill: true,
      wallet: wallet,
    });
    
    const result = response.result;
    const txResult = result?.meta?.TransactionResult || 'Unknown';
    
    console.log(`✅ Result: ${txResult}`);
    console.log(`🔗 Hash: ${result?.hash || 'N/A'}`);
    
    if (txResult === 'tesSUCCESS') {
      console.log(`🎉 Transaction successful!`);
    } else {
      console.log(`❌ Transaction failed with: ${txResult}`);
      console.log(JSON.stringify(result, null, 2));
    }
    
    return response;
    
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    throw error;
  }
};

// Helper function to extract MPT Issuance ID from transaction
const getMPTIssuanceId = async (client, txHash) => {
  try {
    const txRequest = {
      command: 'tx',
      transaction: txHash
    };   
    const response = await client.request(txRequest);
        
    if (response.result.meta?.mpt_issuance_id) {
      return response.result.meta.mpt_issuance_id;
    }
    return null;
  } catch (error) {
    console.log(`⚠️  Error getting MPT ID: ${error.message}`);
    return null;
  }
};

// Helper function to generate condition and fulfillment
const generateConditionAndFulfillment = () => {
  console.log("\n🔐 Generating crypto condition and fulfillment...");
  
  const preimage = crypto.randomBytes(32);
  const fulfillment = new cc.PreimageSha256();
  fulfillment.setPreimage(preimage);

  const condition = fulfillment
    .getConditionBinary()
    .toString('hex')
    .toUpperCase();
    
  const fulfillment_hex = fulfillment
    .serializeBinary()
    .toString('hex')
    .toUpperCase();

  console.log('🔒 Condition:', condition);
  console.log('🔑 Fulfillment (keep secret):', fulfillment_hex);

  return {
    condition,
    fulfillment: fulfillment_hex,
  };
};

// Sleep function
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Main function
const main = async () => {
  console.log('🚀 Token-Enabled Escrows Demo (XLS-85d)');
  console.log('='.repeat(70));
  
  // Connect to XRPL Devnet where both MPT and TokenEscrow amendments are active
  console.log('🌐 Connecting to XRPL Devnet...');
  const client = new Client('wss://s.devnet.rippletest.net:51233');
  await client.connect();
  
  // Generate funded wallets
  console.log('\n💰 Creating funded test wallets...');
  const { wallet: issuerWallet } = await client.fundWallet();
  const { wallet: senderWallet } = await client.fundWallet();
  const { wallet: receiverWallet } = await client.fundWallet();
  
  console.log(`🏦 Issuer: ${issuerWallet.address}`);
  console.log(`📤 Sender: ${senderWallet.address}`);
  console.log(`📥 Receiver: ${receiverWallet.address}`);
  
  await sleep(3000);
  
  // === STEP 1: CREATE MPT WITH ESCROW CAPABILITIES ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 1: Creating MPT with Escrow Capabilities');
  console.log('='.repeat(50));
  
  const tokenMetadata = {
    name: "Escrowable Token",
    ticker: "ESC",
    description: "A token designed for escrow operations",
    decimals: 2,
    total_supply: "10000000", // 100,000 units
    asset_class: "other",
    icon: "https://xrpl.org/assets/favicon.16698f9bee80e5687493ed116f24a6633bb5eaa3071414d64b3bed30c3db1d1d.8a5edab2.ico",
    issuer_name: "yourfavdevrel"
  };
  
  const metadataHex = textToHex(JSON.stringify(tokenMetadata, null, 0));
  
  // Create MPT with escrow and transfer capabilities
  const mptCreateTx = {
    TransactionType: 'MPTokenIssuanceCreate',
    Account: issuerWallet.address,
    AssetScale: 2,
    MaximumAmount: "10000000",
    TransferFee: 0, // you can try to adjust the fee and see how it reflects in the final transaction
    MPTokenMetadata: metadataHex,
    // Enable escrow, transfer, and trade capabilities
    Flags: 0x0008 + 0x0010 + 0x0020 // lsfMPTCanEscrow + lsfMPTCanTransfer + lsfMPTCanTrade
  };
  
  const createResponse = await submitTransaction(
    mptCreateTx,
    client,
    issuerWallet,
    "Creating MPT with escrow capabilities"
  );
  
  const txHash = createResponse.result?.hash;
  await sleep(2000);
  
  const mptIssuanceId = await getMPTIssuanceId(client, txHash);
  
  if (!mptIssuanceId) {
    console.log('❌ Could not extract MPT Issuance ID');
    await client.disconnect();
    return;
  }
  
  console.log(`🆔 MPT Issuance ID: ${mptIssuanceId}`);
  
  // === STEP 2: ACCOUNTS AUTHORIZE MPT ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 2: Accounts autohorize MPT');
  console.log('='.repeat(50));
  
  // Sender authorization
  const authSenderTx = {
    TransactionType: 'MPTokenAuthorize',
    Account: senderWallet.address,
    MPTokenIssuanceID: mptIssuanceId
  };
  
  await submitTransaction(
    authSenderTx,
    client,
    senderWallet,
    "Sender authorizing MPT"
  );
  
  // Receiver authorization
  const authReceiverTx = {
    TransactionType: 'MPTokenAuthorize',
    Account: receiverWallet.address,
    MPTokenIssuanceID: mptIssuanceId
  };
  
  await submitTransaction(
    authReceiverTx,
    client,
    receiverWallet,
    "Receiver authorizing MPT"
  );
  
  // === STEP 3: DISTRIBUTE TOKENS TO SENDER ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: Distributing Tokens to Sender');
  console.log('='.repeat(50));
  
  const initialAmount = '500000'; // 5,000 tokens
  
  const distributionTx = {
    TransactionType: 'Payment',
    Account: issuerWallet.address,
    Destination: senderWallet.address,
    Amount: {
      mpt_issuance_id: mptIssuanceId,
      value: initialAmount
    }
  };
  
  await submitTransaction(
    distributionTx,
    client,
    issuerWallet,
    `Sending ${initialAmount / Math.pow(10, tokenMetadata.decimals)} tokens to sender`
  );
  
  // === STEP 4: GENERATE CRYPTO CONDITION ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 4: Generating Crypto Condition');
  console.log('='.repeat(50));
  
  const { condition, fulfillment } = generateConditionAndFulfillment();
  
  // === STEP 5: CREATE TOKEN ESCROW ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 5: Creating Token Escrow');
  console.log('='.repeat(50));
  
  const WAITING_TIME = 15; // seconds
  const escrowAmount = '100000'; // 1,000 tokens 
  const finishAfter = dayjs().add(WAITING_TIME, 'seconds').toISOString();
  const cancelAfter = dayjs().add(WAITING_TIME + 30, 'seconds').toISOString(); // Required for token escrows
  
  console.log(`💰 Escrowing ${escrowAmount / Math.pow(10, tokenMetadata.decimals)} tokens`);
  console.log(`⏰ Finish after: ${dayjs(finishAfter).format('HH:mm:ss')}`);
  console.log(`❌ Cancel after: ${dayjs(cancelAfter).format('HH:mm:ss')}`);
  
  const escrowCreateTx = {
    TransactionType: 'EscrowCreate',
    Account: senderWallet.address,
    Destination: receiverWallet.address,
    Amount: {
      mpt_issuance_id: mptIssuanceId,
      value: escrowAmount
    },
    FinishAfter: isoTimeToRippleTime(finishAfter),
    CancelAfter: isoTimeToRippleTime(cancelAfter), // Required for token escrows
    Condition: condition
  };
  
  const escrowCreateResponse = await submitTransaction(
    escrowCreateTx,
    client,
    senderWallet,
    "Creating token escrow with condition"
  );
  
  const escrowSequence = escrowCreateResponse.result.tx_json.Sequence;
  if (!escrowSequence) {
    console.log('❌ No sequence number found, stopping...');
    await client.disconnect();
    return;
  }
  
  console.log(`📋 Escrow Sequence: ${escrowSequence}`);
  
  // === STEP 6: WAIT FOR TIME CONDITION ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 6: Waiting for Time Condition');
  console.log('='.repeat(50));
  
  console.log(`⏳ Waiting ${WAITING_TIME} seconds before finishing escrow...`);
  await sleep(WAITING_TIME * 1000);
  
  // === STEP 7: FINISH TOKEN ESCROW ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 7: Finishing Token Escrow');
  console.log('='.repeat(50));
  
  const escrowFinishTx = {
    TransactionType: 'EscrowFinish',
    Account: receiverWallet.address,
    Owner: senderWallet.address,
    OfferSequence: escrowSequence,
    Condition: condition,
    Fulfillment: fulfillment
  };
  
  await submitTransaction(
    escrowFinishTx,
    client,
    receiverWallet,
    "Finishing token escrow with fulfillment"
  );
  
  // === FINAL STATUS ===
  console.log('\n' + '='.repeat(50));
  console.log('FINAL STATUS & SUMMARY');
  console.log('='.repeat(50));
  
  try {
    // Check MPT balances
    const senderMPTs = await client.request({
      command: "account_objects",
      account: senderWallet.address,
      ledger_index: "validated",
      type: "mptoken"
    });
    
    const receiverMPTs = await client.request({
      command: "account_objects",
      account: receiverWallet.address,
      ledger_index: "validated",
      type: "mptoken"
    });
    
    console.log(`\n💳 Token Balances:`);
    console.log(`📤 Sender MPT Holdings: ${senderMPTs.result.account_objects.length} tokens`);
    console.log(`📥 Receiver MPT Holdings: ${receiverMPTs.result.account_objects.length} tokens`);
    
    // Display balances if available
    if (senderMPTs.result.account_objects.length > 0) {
      const senderBalance = senderMPTs.result.account_objects[0].MPTAmount;
      console.log(`📤 Sender Balance: ${senderBalance / Math.pow(10, tokenMetadata.decimals)} ${tokenMetadata.ticker}`);
    }
    
    if (receiverMPTs.result.account_objects.length > 0) {
      const receiverBalance = receiverMPTs.result.account_objects[0].MPTAmount;
      console.log(`📥 Receiver Balance: ${receiverBalance / Math.pow(10, tokenMetadata.decimals)} ${tokenMetadata.ticker}`);
    }
    
  } catch (error) {
    console.log(`⚠️  Could not fetch token balances: ${error.message}`);
  }
  
  console.log(`\n🎯 Key Information:`);
  console.log(`🆔 MPT Issuance ID: ${mptIssuanceId}`);
  console.log(`🏷️ Token Symbol: ${tokenMetadata.ticker}`);
  console.log(`💰 Escrowed Amount: ${escrowAmount / Math.pow(10, tokenMetadata.decimals)} tokens`);
  console.log(`🔒 Condition: ${condition}`);
  
  console.log(`\n🌐 Explore on Devnet:`);
  console.log(`📱 Issuer: https://devnet.xrpl.org/accounts/${issuerWallet.address}`);
  console.log(`📱 Sender: https://devnet.xrpl.org/accounts/${senderWallet.address}`);
  console.log(`📱 Receiver: https://devnet.xrpl.org/accounts/${receiverWallet.address}`);
  
  console.log(`\n✨ Token Escrow Demo Completed Successfully!`);
  console.log('\n📚 What happened:');
  console.log('   1. ✅ Created MPT with escrow and transfer capabilities');
  console.log('   2. ✅ Sender and receiver authorize the MPT');
  console.log('   3. ✅ Distributed tokens from issuer to sender');
  console.log('   4. ✅ Generated crypto condition (preimage-sha256)');
  console.log('   5. ✅ Created token escrow with time + condition locks');
  console.log('   6. ✅ Waited for time condition to be met');
  console.log('   7. ✅ Finished escrow by providing correct fulfillment');
  console.log('   8. ✅ Tokens transferred from escrow to receiver');
  
  await client.disconnect();
};

main()
  .then(() => {
    console.log(`\n📖 Learn More:`);
    console.log(`   🔗 XLS-85d Specification: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0085-token-escrow`);
    console.log(`   🔗 XLS-33 MPT Standard: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens`);
    console.log(`   🔗 Devnet Explorer: https://devnet.xrpl.org/`);
  })
  .catch((error) => {
    console.error(`\n💥 Error in main execution: ${error.message}`);
    console.error(error.stack);
  });