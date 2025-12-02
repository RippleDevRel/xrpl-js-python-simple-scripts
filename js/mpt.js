const { Client } = require('xrpl');
/*
===============================================================================
                    MULTI-PURPOSE TOKENS (MPT) ON XRPL TESTNET
===============================================================================

Multi-Purpose Tokens (MPTs) - XLS-33 standard
MPT Transaction Flow:
1. MPTokenIssuanceCreate → Creates token issuance with metadata
2. MPTokenAuthorize → Holders authorize themselves to receive tokens)
3. Payment → Transfer tokens using mpt_issuance_id
https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens

===============================================================================
*/

function textToHex(text) {
  return Buffer.from(text, 'utf8').toString('hex').toUpperCase();
}

function hexToText(hex) {
  return Buffer.from(hex, 'hex').toString('utf8');
}

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

async function getMPTIssuanceId(client, txHash) {
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
}

async function getMPTIssuanceInfo(client, mptIssuanceId) {
  try {
    const request = {
      command: 'ledger_entry',
      mpt_issuance: mptIssuanceId,
      ledger_index: 'validated'
    };
    const response = await client.request(request);
    return response.result.node;
  } catch (error) {
    console.log(`⚠️  Error getting MPT Issuance info: ${error.message}`);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Multi-Purpose Tokens (MPT) Demo on XRPL Testnet');
  console.log('='.repeat(70));
  
  console.log('🌐 Connecting to XRPL Testnet...');
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();
  
  console.log('\n💰 Creating funded test wallets...');
  const { wallet: issuerWallet } = await client.fundWallet();
  const { wallet: holderWallet } = await client.fundWallet();
  
  console.log(`🏦 Issuer: ${issuerWallet.address}`);
  console.log(`👤 Holder: ${holderWallet.address}`);
  
  console.log('\n⏳ Waiting for accounts to be ready...');
  await sleep(3000);
  
  console.log('\n' + '='.repeat(50));
  console.log('STEP 1: Creating MPT Issuance');
  console.log('='.repeat(50));
  
  const tokenMetadata = {
    ticker: "DDT",
    name: "Testnet Demo Token",
    desc: "A demonstration Multi-Purpose Token for XRPL Testnet testing",
    icon: "https://xrpl.org/assets/favicon.16698f9bee80e5687493ed116f24a6633bb5eaa3071414d64b3bed30c3db1d1d.8a5edab2.ico",
    asset_class: "other",
    issuer_name: "yourfavdevrel",
    urls: [
        {
            url: "https://xrpl.org/docs",
            type: "document",
            title: "XRPL Documentation"
        }
    ],
    additional_info: {
        purpose: "Educational demonstration",
        network: "Testnet"
    }
  };
  
  const assetScale = 2;
  const metadataHex = textToHex(JSON.stringify(tokenMetadata, null, 0));
  
  console.log(`📋 Token Metadata:`);
  console.log(JSON.stringify(tokenMetadata, null, 2));
  
  const mptCreateTx = {
    TransactionType: 'MPTokenIssuanceCreate',
    Account: issuerWallet.address,
    AssetScale: assetScale,
    MaximumAmount: "100000000",
    TransferFee: 1000,
    MPTokenMetadata: metadataHex,
    Flags: 0x0008 + 0x0010 + 0x0020 + 0x0040
    };
  
  const createResponse = await submitMPTTransaction(
    mptCreateTx,
    client,
    issuerWallet,
    "Creating MPT issuance"
  );
  
  const txHash = createResponse.result?.hash;
  console.log(`\n🔍 Extracting MPT Issuance ID from transaction: ${txHash}`);
  
  await sleep(2000);
  
  const mptIssuanceId = await getMPTIssuanceId(client, txHash);
  
  if (mptIssuanceId) {
    console.log(`   🆔 MPT Issuance ID: ${mptIssuanceId}`);
  } else {
    console.log('   ❌ Could not extract MPT Issuance ID');
    console.log('   📝 Check the testnet explorer for transaction details:');
    console.log(`   🔗 https://testnet.xrpl.org/transactions/${txHash}`);
    await client.disconnect();
    return;
  }
  
  console.log('\n🔍 Fetching MPT Issuance details from ledger...');
  const mptIssuanceInfo = await getMPTIssuanceInfo(client, mptIssuanceId);
  
  if (mptIssuanceInfo) {
    console.log(`\n📊 On-Chain MPT Issuance Information:`);
    console.log(`   🆔 Issuance ID: ${mptIssuanceId}`);
    console.log(`   🏦 Issuer: ${mptIssuanceInfo.Issuer}`);
    console.log(`   📏 Asset Scale: ${mptIssuanceInfo.AssetScale}`);
    console.log(`   💰 Max Amount: ${mptIssuanceInfo.MaximumAmount}`);
    console.log(`   💸 Transfer Fee: ${mptIssuanceInfo.TransferFee} (${mptIssuanceInfo.TransferFee / 1000}%)`);
    console.log(`   🔢 Outstanding Amount: ${mptIssuanceInfo.OutstandingAmount}`);
    
    if (mptIssuanceInfo.MPTokenMetadata) {
      try {
        const metadataText = hexToText(mptIssuanceInfo.MPTokenMetadata);
        const metadata = JSON.parse(metadataText);
        console.log(`   🏷️  Ticker: ${metadata.ticker}`);
        console.log(`   📝 Name: ${metadata.name}`);
      } catch (e) {
        console.log(`   📝 Metadata (hex): ${mptIssuanceInfo.MPTokenMetadata}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('STEP 2: Token Holder authorize MPT');
  console.log('='.repeat(50));
  
  
  console.log(`🔐 Holder approve to receive MPT: ${mptIssuanceId}`);
  
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

  
  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: Transferring MPT Tokens');
  console.log('='.repeat(50));
  
  const transferAmount = '1000';
  const displayAmount = transferAmount / Math.pow(10, mptIssuanceInfo.AssetScale);
  
  console.log(`💸 Transferring ${displayAmount} ${tokenMetadata.ticker} (${transferAmount} base units) to holder`);
  
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
    `Transferring ${displayAmount} MPT tokens to holder`
  );
  
  console.log('\n' + '='.repeat(50));
  console.log('FINAL STATUS & SUMMARY');
  console.log('='.repeat(50));
  
  try {
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
    console.log(`📤 Holder MPToken Objects: ${holderMPTs.result.account_objects.length}`);
    console.log(`📥 Issuer MPToken Objects: ${issuerMPTs.result.account_objects.length}`);
    
    if (holderMPTs.result.account_objects.length > 0) {
      const holderMPToken = holderMPTs.result.account_objects[0];
      const holderBalance = holderMPToken.MPTAmount;
      const displayBalance = holderBalance / Math.pow(10, mptIssuanceInfo.AssetScale);
      console.log(`📤 Holder Balance: ${displayBalance} ${tokenMetadata.ticker} (${holderBalance} base units)`);
      console.log(`   🆔 MPToken ID: ${holderMPToken.MPTokenIssuanceID}`);
    }
    
    if (issuerMPTs.result.account_objects.length > 0) {
      const issuerMPToken = issuerMPTs.result.account_objects[0];
      const issuerBalance = issuerMPToken.MPTAmount;
      const displayBalance = issuerBalance / Math.pow(10, mptIssuanceInfo.AssetScale);
      console.log(`📥 Issuer Balance: ${displayBalance} ${tokenMetadata.ticker} (${issuerBalance} base units)`);
      console.log(`   🆔 MPToken ID: ${issuerMPToken.MPTokenIssuanceID}`);
    }
    
    console.log('\n🔍 Fetching updated MPT Issuance info...');
    const updatedIssuanceInfo = await getMPTIssuanceInfo(client, mptIssuanceId);
    if (updatedIssuanceInfo) {
      const outstandingDisplay = updatedIssuanceInfo.OutstandingAmount / Math.pow(10, mptIssuanceInfo.AssetScale);
      console.log(`📊 Total Outstanding Amount: ${outstandingDisplay} ${tokenMetadata.ticker} (${updatedIssuanceInfo.OutstandingAmount} base units)`);
    }
    
  } catch (error) {
    console.log(`⚠️  Could not fetch token balances: ${error.message}`);
  }
  
  console.log(`\n🎯 Key Information (Retrieved from Ledger):`);
  console.log(`🆔 MPT Issuance ID: ${mptIssuanceId}`);
  console.log(`🏷️ Token Symbol: ${tokenMetadata.ticker}`);
  console.log(`📊 Asset Scale: ${mptIssuanceInfo.AssetScale} (divisible by 10^${mptIssuanceInfo.AssetScale})`);
  console.log(`🔗 Issuer: ${issuerWallet.address}`);
  
  console.log(`\n🌐 Explore on Testnet:`);
  console.log(` 📱 Issuer Account: https://testnet.xrpl.org/accounts/${issuerWallet.address}`);
  console.log(` 📱 Holder Account: https://testnet.xrpl.org/accounts/${holderWallet.address}`);
  
  console.log(`\n✨ MPT Demo Completed Successfully!`);
  console.log('\n📚 What happened:');
  console.log('   1. ✅ Created MPT issuance with metadata and transfer capabilities');
  console.log('   2. ✅ Retrieved MPT issuance details from the ledger using ledger_entry');
  console.log('   3. ✅ Holder approved the MPT to receive tokens');
  console.log('   4. ✅ Transferred tokens from issuer to holder');
  console.log('   5. ✅ Displayed balances using AssetScale from on-chain data');
  
  console.log('\n💡 Important Notes:');
  console.log('   • AssetScale determines token divisibility (2 = divisible by 100)');
  console.log('   • All amounts on-chain are stored as base units (integers)');
  console.log('   • Display amounts = base units / 10^AssetScale');
  console.log('   • Use ledger_entry to query MPT issuance details from the ledger');
  
  await client.disconnect();
}

main()
  .then(() => {
    console.log(`\n📖 Learn More:`);
    console.log(`   🔗 XLS-33 Specification: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens`);
    console.log(`   🔗 XRPL MPT Docs: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens`);
    console.log(`   🔗 Testnet Explorer: https://testnet.xrpl.org/`);
  })
  .catch((error) => {
    console.error(`\n💥 Error in main execution: ${error.message}`);
    console.error(error.stack);
  });