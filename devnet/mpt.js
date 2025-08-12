const { Client } = require('xrpl');
/*
===============================================================================
                    MULTI-PURPOSE TOKENS (MPT) ON XRPL DEVNET
===============================================================================

Multi-Purpose Tokens (MPTs) - XLS-33 standard
MPT Transaction Flow:
1. MPTokenIssuanceCreate → Creates token issuance with metadata
2. MPTokenAuthorize → Holders authorize themselves to receive tokens)
3. Payment → Transfer tokens using mpt_issuance_id
https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens

===============================================================================
*/

// Helper function to convert text to hex
function textToHex(text) {
  return Buffer.from(text, 'utf8').toString('hex').toUpperCase();
}

// Helper function to submit MPT transactions with detailed logging
async function submitMPTTransaction(txn, client, wallet, description = '') {
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
    console.log(`📊 Validated: ${result?.validated || false}`);
    
    if (txResult === 'tesSUCCESS') {
      console.log(`🎉 Transaction successful!`);
    } else {
      console.log(`❌ Transaction failed with: ${txResult}`);
    }
    
    return response;
    
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    throw error;
  }
}

// Helper function to extract MPT Issuance ID from transaction
async function getMPTIssuanceId(client, txHash) {
  try {
    const txRequest = {
      command: 'tx',
      transaction: txHash
    };   
    const response = await client.request(txRequest);
        
    // Check in meta field
    if (response.result.meta?.mpt_issuance_id) {
      return response.result.meta.mpt_issuance_id;
    }
    return null;
  } catch (error) {
    console.log(`⚠️  Error getting MPT ID: ${error.message}`);
    return null;
  }
}

// Helper function to get account information
async function getAccountInfo(client, address) {
  const accountInfoRequest = {
    command: 'account_info',
    account: address
  };
  const response = await client.request(accountInfoRequest);
  return response.result.account_data;
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to demonstrate MPT creation and transfer

async function main() {
  console.log('🚀 Multi-Purpose Tokens (MPT) Demo on XRPL Devnet');
  console.log('='.repeat(70));
  
  // Connect to XRPL Devnet where MPT amendment is active
  console.log('🌐 Connecting to XRPL Devnet...');
  const client = new Client('wss://s.devnet.rippletest.net:51233');
  await client.connect();
  
  // Generate funded wallets for the demo
  console.log('\n💰 Creating funded test wallets...');
  const { wallet: issuerWallet } = await client.fundWallet();
  const { wallet: holderWallet } = await client.fundWallet();
  
  console.log(`🏦 Issuer: ${issuerWallet.address}`);
  console.log(`👤 Holder: ${holderWallet.address}`);
  
  // Wait for accounts to be fully funded and ready
  console.log('\n⏳ Waiting for accounts to be ready...');
  await sleep(3000);
  
  // === STEP 1: CREATE MPT ISSUANCE ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 1: Creating MPT Issuance');
  console.log('='.repeat(50));
  
  // Prepare comprehensive token metadata
  // See 
  const tokenMetadata = {
    name: "DevNet Demo Token",
    ticker: "DDT",
    description: "A demonstration Multi-Purpose Token for XRPL Devnet testing",
    decimals: 2,
    total_supply: "100000000", // 1,000,000 units
    asset_class: "other", 
    icon: "https://xrpl.org/assets/favicon.16698f9bee80e5687493ed116f24a6633bb5eaa3071414d64b3bed30c3db1d1d.8a5edab2.ico",
    use_case: "Educational demonstration",
    issuer_name: "yourfavdevrel"
  };
  
  const metadataHex = textToHex(JSON.stringify(tokenMetadata, null, 0));
  
  console.log(`📋 Token Metadata:`);
  console.log(JSON.stringify(tokenMetadata, null, 2));
  
  // Create MPT with institutional-grade features
  const mptCreateTx = {
    TransactionType: 'MPTokenIssuanceCreate',
    Account: issuerWallet.address,
    AssetScale: 2, // <-- Divisible into 100 units / 10^2
    MaximumAmount: "100000000", //  <-- 1,000,000 units
    TransferFee: 1000, // 1% transfer fee 
    MPTokenMetadata: metadataHex,
    Flags: 0x0008 + 0x0010 + 0x0020 + 0x0040 // Enable lsfMPTCanEscrow, lsfMPTCanTrade, lsfMPTCanTransfer, lsfMPTCanClawback. Find more: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens#21122-flags 
    };
  
  const createResponse = await submitMPTTransaction(
    mptCreateTx,
    client,
    issuerWallet,
    "Creating MPT issuance"
  );
  
  // Extract the MPT Issuance ID
  const txHash = createResponse.result?.hash;
  console.log(`\n🔍 Extracting MPT Issuance ID from transaction: ${txHash}`);
  
  // Wait a moment for transaction to be processed
  await sleep(2000);
  
  const mptIssuanceId = await getMPTIssuanceId(client, txHash);
  
  if (mptIssuanceId) {
    console.log(`   🆔 MPT Issuance ID: ${mptIssuanceId}`);
  } else {
    console.log('   ❌ Could not extract MPT Issuance ID');
    console.log('   📝 Check the Devnet explorer for transaction details:');
    console.log(`   🔗 https://devnet.xrpl.org/transactions/${txHash}`);
    await client.disconnect();
    return;
  }
  
  // === STEP 2: AUTHORIZE HOLDERS (Required despite flags) ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 2: Token Holder authorize MPT');
  console.log('='.repeat(50));
  
  
  console.log(`🔐 Holder approve to receive MPT: ${mptIssuanceId}`);
  
  // First: Holder must authorize receiving a specific MPT tokens
  // Second: In case lsfMPTRequireAuth has been set during MPT creation, the issuer needs to authorize the holder
  // Learn more: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens#a231-without-allow-listing 
  const authHolderTx = {
    TransactionType: 'MPTokenAuthorize',
    Account: holderWallet.address,
    MPTokenIssuanceID: mptIssuanceId
  };
  
  try {
    await submitMPTTransaction(
      authHolderTx,
      client,
      holderWallet
    );
  } catch (error) {
    console.log(`   ❌ Holder authorization failed: ${error.message}`);
  }

  
  // === STEP 3: TRANSFER MPT TOKENS ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: Transferring MPT Tokens');
  console.log('='.repeat(50));
  
  // Transfer tokens from issuer to holder
  const transferAmount = '1000'; // 10 tokens 
  
  console.log(`💸 Transferring ${transferAmount/Math.pow(10, tokenMetadata.decimals)} token units to holder`);
  
  const paymentTx = {
    TransactionType: 'Payment',
    Account: issuerWallet.address,
    Destination: holderWallet.address,
    Amount: {
      mpt_issuance_id: mptIssuanceId,
      value: transferAmount
    }
  };
  
  await submitMPTTransaction(
    paymentTx,
    client,
    issuerWallet,
    `Transferring ${transferAmount/ Math.pow(10, tokenMetadata.decimals)} MPT tokens to holder`
  );
  
  // === FINAL STATUS ===
  console.log('\n' + '='.repeat(50));
  console.log('FINAL STATUS & SUMMARY');
  console.log('='.repeat(50));
  
  // Get MPT balances for both accounts
  try {
    // Check MPT balances
    const holderMPTs = await client.request({
      command: "account_objects",
      account: holderWallet.address,
      ledger_index: "validated",
      type: "mptoken"
    });
    
    const issuerMPTs = await client.request({
      command: "account_objects",
      account: issuerWallet.address,
      ledger_index: "validated",
      type: "mptoken"
    });
    
    console.log(`\n💳 Token Balances:`);
    console.log(`📤 Holder MPT Holdings: ${holderMPTs.result.account_objects.length} tokens`);
    console.log(`📥 Issuer MPT Holdings: ${issuerMPTs.result.account_objects.length} tokens`);
    
    // Display balances if available
    if (holderMPTs.result.account_objects.length > 0) {
      const holderBalance = holderMPTs.result.account_objects[0].MPTAmount;
      console.log(`📤 Holder Balance: ${holderBalance / Math.pow(10, tokenMetadata.decimals)} ${tokenMetadata.ticker}`);
    }
    
    if (issuerMPTs.result.account_objects.length > 0) {
      const issuerBalance = issuerMPTs.result.account_objects[0].MPTAmount;
      console.log(`📥 Issuer Balance: ${issuerBalance / Math.pow(10, tokenMetadata.decimals)} ${tokenMetadata.ticker}`);
    }
    
  } catch (error) {
    console.log(`⚠️  Could not fetch token balances: ${error.message}`);
  }
  
  console.log(`\n🎯 Key Information:`);
  console.log(`🆔 MPT Issuance ID: ${mptIssuanceId}`);
  console.log(`🏷️ Token Symbol: ${tokenMetadata.ticker}`);
  console.log(`📊 Decimals: ${tokenMetadata.decimals}`);
  console.log(`🔗 Issuer: ${issuerWallet.address}`);
  
  console.log(`\n🌐 Explore on Devnet:`);
  console.log(` 📱 Issuer Account: https://devnet.xrpl.org/accounts/${issuerWallet.address}`);
  console.log(` 📱 Holder Account: https://devnet.xrpl.org/accounts/${holderWallet.address}`);
  
  console.log(`\n✨ MPT Demo Completed Successfully!`);
  console.log('\n📚 What happened:');
  console.log('   1. ✅ Created MPT issuance with metadata and transfer capabilities');
  console.log('   2. ✅ Holder approves the MPT in order to receive the token');
  console.log('   3. ✅ Transferred tokens directly from issuer to holder');
  console.log('   4. 🆔 Generated unique MPT Issuance ID for all operations');
  
  console.log('\n💡 Important Notes:');
  console.log('   • Only recipients need MPTokenAuthorize, not the issuer');
  console.log('   • Issuer can directly send tokens without self-authorization');
  console.log('   • Holder MUST approve the MPT in order to receive the token');
  
  await client.disconnect();
}

main()
  .then(() => {
    console.log(`\n📖 Learn More:`);
    console.log(`   🔗 XLS-33 Specification: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens`);
    console.log(`   🔗 XRPL MPT Docs: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens`);
    console.log(`   🔗 Devnet Explorer: https://devnet.xrpl.org/`);
  })
  .catch((error) => {
    console.error(`\n💥 Error in main execution: ${error.message}`);
    console.error(error.stack);
  });