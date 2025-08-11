const { Client, xrpToDrops, dropsToXrp } = require('xrpl');

/*
===============================================================================
                    BATCH TRANSACTIONS (XLS-56) ON XRPL DEVNET
===============================================================================

Batch Transactions - XLS-56 standard
Batch Transaction Flow:
1. Create Batch transaction with RawTransactions array
2. Set appropriate batch mode (ALLORNOTHING, ONLYONE, UNTILFAILURE, INDEPENDENT)
3. Include multiple inner transactions that execute atomically
4. Pay combined fees for all transactions in the batch

Batch Modes:
- ALLORNOTHING (0x00010000): All transactions must succeed
- ONLYONE (0x00020000): Only first successful transaction executes
- UNTILFAILURE (0x00040000): Execute until first failure
- INDEPENDENT (0x00080000): Execute all regardless of failures

https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0056-batch
===============================================================================
*/

// Batch transaction flags
const BATCH_FLAGS = {
  ALLORNOTHING: 0x00010000,  // tfAllOrNothing
  ONLYONE: 0x00020000,       // tfOnlyOne
  UNTILFAILURE: 0x00040000,  // tfUntilFailure
  INDEPENDENT: 0x00080000    // tfIndependent
};

const INNER_BATCH_FLAG = 0x40000000; // tfInnerBatchTxn

// Helper function to submit Batch transactions with detailed logging
async function submitBatchTransaction(txn, client, wallet, description = '') {
  if (description) {
    console.log(`\n🔄 ${description}`);
  }
  
  console.log(`📤 Submitting: ${txn.TransactionType}`);
  console.log(`🏷️ Batch Mode: ${getBatchModeName(txn.Flags)}`);
  console.log(`📊 Inner Transactions: ${txn.RawTransactions.length}`);
  
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
      console.log(`🎉 Batch transaction successful!`);
    } else {
      console.log(`❌ Batch transaction failed with: ${txResult}`);
    }
    
    return response;
    
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    throw error;
  }
}

// Helper function to get batch mode name
function getBatchModeName(flag) {
  switch(flag) {
    case BATCH_FLAGS.ALLORNOTHING: return 'ALL_OR_NOTHING';
    case BATCH_FLAGS.ONLYONE: return 'ONLY_ONE';
    case BATCH_FLAGS.UNTILFAILURE: return 'UNTIL_FAILURE';
    case BATCH_FLAGS.INDEPENDENT: return 'INDEPENDENT';
    default: return 'UNKNOWN';
  }
}

// Helper function to get account information and balance
async function getAccountInfo(client, address) {
  try {
    const accountInfoRequest = {
      command: 'account_info',
      account: address
    };
    const response = await client.request(accountInfoRequest);
    return response.result.account_data;
  } catch (error) {
    console.log(`⚠️  Error getting account info for ${address}: ${error.message}`);
    return null;
  }
}

// Helper function to display XRP balance in drops and XRP
function formatXRPBalance(drops) {
  const xrp = dropsToXrp(drops);
  return `${xrp} XRP$ | (${drops} drops)`;
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to demonstrate Batch transaction with XRP payments
async function main() {
  console.log('🚀 Batch Transactions (XLS-56) Demo on XRPL Devnet');
  console.log('='.repeat(70));
  
  // Connect to XRPL Devnet where Batch amendment should be active
  console.log('🌐 Connecting to XRPL Devnet...');
  const client = new Client('wss://s.devnet.rippletest.net:51233');
  await client.connect();
  
  // Generate funded wallets for the demo
  console.log('\n💰 Creating funded test wallets...');
  const { wallet: senderWallet } = await client.fundWallet();
  const { wallet: recipient1Wallet } = await client.fundWallet();
  const { wallet: recipient2Wallet } = await client.fundWallet();
  
  console.log(`💸 Sender: ${senderWallet.address}`);
  console.log(`👤 Recipient 1: ${recipient1Wallet.address}`);
  console.log(`👤 Recipient 2: ${recipient2Wallet.address}`);
  
  // Wait for accounts to be fully funded and ready
  console.log('\n⏳ Waiting for accounts to be ready...');
  await sleep(3000);
  
  // Check initial balances
  console.log('\n' + '='.repeat(50));
  console.log('INITIAL BALANCES');
  console.log('='.repeat(50));
  
  const senderInfo = await getAccountInfo(client, senderWallet.address);
  const recipient1Info = await getAccountInfo(client, recipient1Wallet.address);
  const recipient2Info = await getAccountInfo(client, recipient2Wallet.address);
  
  console.log(`💸 Sender Balance: ${formatXRPBalance(senderInfo?.Balance || '0')}`);
  console.log(`👤 Recipient 1 Balance: ${formatXRPBalance(recipient1Info?.Balance || '0')}`);
  console.log(`👤 Recipient 2 Balance: ${formatXRPBalance(recipient2Info?.Balance || '0')}`);
  
  // === STEP 1: CREATE BATCH TRANSACTION ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 1: Creating Batch Transaction');
  console.log('='.repeat(50));
  
  // Define payment amounts
  const payment1Amount = xrpToDrops(5); // 5 XRP in drops
  const payment2Amount = xrpToDrops(3); // 3 XRP in drops
  
  console.log(`💰 Payment 1: ${formatXRPBalance(payment1Amount)} to ${recipient1Wallet.address}`);
  console.log(`💰 Payment 2: ${formatXRPBalance(payment2Amount)} to ${recipient2Wallet.address}`);
  
  // Create inner transactions (unsigned and without fees)
  const innerTransaction1 = {
    TransactionType: 'Payment',
    Flags: INNER_BATCH_FLAG, // tfInnerBatchTxn flag
    Account: senderWallet.address,
    Destination: recipient1Wallet.address,
    Amount: payment1Amount,
    Fee: '0', // Must be 0 for inner transactions
    SigningPubKey: '', // Must be empty for inner transactions
    Sequence: senderInfo.Sequence + 1 // Next sequence number
  };
  
  const innerTransaction2 = {
    TransactionType: 'Payment',
    Flags: INNER_BATCH_FLAG, // tfInnerBatchTxn flag
    Account: senderWallet.address,
    Destination: recipient2Wallet.address,
    Amount: payment2Amount,
    Fee: '0', // Must be 0 for inner transactions
    SigningPubKey: '', // Must be empty for inner transactions
    Sequence: senderInfo.Sequence + 2 // Next sequence number
  };
  
  // Create the Batch transaction
  const batchTransaction = {
    TransactionType: 'Batch',
    Account: senderWallet.address,
    Flags: BATCH_FLAGS.ALLORNOTHING, // All transactions must succeed
    RawTransactions: [
      { RawTransaction: innerTransaction1 },
      { RawTransaction: innerTransaction2 }
    ],
    Sequence: senderInfo.Sequence // Current sequence for outer transaction
    // Fee will be calculated automatically: (n+2) * base_fee + sum of inner fees
    // BatchSigners not needed for single account batch
  };
  
  console.log(`\n🔧 Batch Transaction Details:`);
  console.log(`📋 Mode: ${getBatchModeName(batchTransaction.Flags)}`);
  console.log(`📊 Inner Transactions: ${batchTransaction.RawTransactions.length}`);
  console.log(`💸 Total Amount: ${formatXRPBalance((parseInt(payment1Amount) + parseInt(payment2Amount)).toString())}`);
  
  // === STEP 2: SUBMIT BATCH TRANSACTION ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 2: Submitting Batch Transaction');
  console.log('='.repeat(50));
  
  const batchResponse = await submitBatchTransaction(
    batchTransaction,
    client,
    senderWallet,
    "Executing atomic XRP payments to two recipients"
  );
  
  // Wait for transaction to be fully processed
  await sleep(3000);
  
  // === STEP 3: VERIFY RESULTS ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: Verifying Transaction Results');
  console.log('='.repeat(50));
  
  // Check final balances
  const senderInfoFinal = await getAccountInfo(client, senderWallet.address);
  const recipient1InfoFinal = await getAccountInfo(client, recipient1Wallet.address);
  const recipient2InfoFinal = await getAccountInfo(client, recipient2Wallet.address);
  
  console.log(`\n💳 Final Balances:`);
  console.log(`💸 Sender: ${formatXRPBalance(senderInfoFinal?.Balance || '0')}`);
  console.log(`👤 Recipient 1: ${formatXRPBalance(recipient1InfoFinal?.Balance || '0')}`);
  console.log(`👤 Recipient 2: ${formatXRPBalance(recipient2InfoFinal?.Balance || '0')}`);
  
  // Calculate balance changes
  const senderChange = parseInt(senderInfoFinal?.Balance || '0') - parseInt(senderInfo?.Balance || '0');
  const recipient1Change = parseInt(recipient1InfoFinal?.Balance || '0') - parseInt(recipient1Info?.Balance || '0');
  const recipient2Change = parseInt(recipient2InfoFinal?.Balance || '0') - parseInt(recipient2Info?.Balance || '0');
  
  console.log(`\n📈 Balance Changes:`);
  console.log(`💸 Sender: ${senderChange > 0 ? '+' : ''}${formatXRPBalance(senderChange.toString())}`);
  console.log(`👤 Recipient 1: ${recipient1Change > 0 ? '+' : ''}${formatXRPBalance(recipient1Change.toString())}`);
  console.log(`👤 Recipient 2: ${recipient2Change > 0 ? '+' : ''}${formatXRPBalance(recipient2Change.toString())}`);
  
  // === FINAL SUMMARY ===
  console.log('\n' + '='.repeat(50));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(50));
  
  const txHash = batchResponse.result?.hash;
  
  console.log(`\n🎯 Key Information:`);
  console.log(`🔗 Batch Transaction Hash: ${txHash}`);
  console.log(`🏷️ Batch Mode: ${getBatchModeName(BATCH_FLAGS.ALLORNOTHING)}`);
  console.log(`📊 Inner Transactions: 2 XRP Payments`);
  console.log(`💸 Sender Address: ${senderWallet.address}`);
  
  console.log(`\n🌐 Explore on Devnet:`);
  console.log(` 📱 Batch Transaction: https://devnet.xrpl.org/transactions/${txHash}`);
  console.log(` 📱 Sender Account: https://devnet.xrpl.org/accounts/${senderWallet.address}`);
  console.log(` 📱 Recipient 1: https://devnet.xrpl.org/accounts/${recipient1Wallet.address}`);
  console.log(` 📱 Recipient 2: https://devnet.xrpl.org/accounts/${recipient2Wallet.address}`);
  
  console.log(`\n✨ Batch Transaction Demo Completed Successfully!`);
  
  console.log('\n📚 What happened:');
  console.log('   1. ✅ Created single Batch transaction with 2 inner Payment transactions');
  console.log('   2. ✅ Used ALL_OR_NOTHING mode for atomic execution');
  console.log('   3. ✅ Both payments executed atomically in single ledger entry');
  console.log('   4. ✅ Single fee paid for entire batch operation');
  
  console.log('\n💡 Key Batch Features Demonstrated:');
  console.log('   • ⚛️  Atomic execution - both payments succeed or both fail');
  console.log('   • 💰 Single fee calculation for multiple operations');
  console.log('   • 🔒 Inner transactions cannot be submitted individually');
  console.log('   • 📊 Separate metadata for outer and inner transactions');
  
  await client.disconnect();
}

main()
  .then(() => {
    console.log(`\n📖 Learn More:`);
    console.log(`   🔗 XLS-56: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0056-batch`);
    console.log(`   🔗 XRPL Batch Transactions: https://xrpl.org/docs/references/protocol/transactions/types/batch#batch-flags`);
    console.log(`   🔗 Devnet Explorer: https://devnet.xrpl.org/`);
    console.log(`   🔗 Batch Transaction Types: ALL_OR_NOTHING, ONLY_ONE, UNTIL_FAILURE, INDEPENDENT`);
  })
  .catch((error) => {
    console.error(`\n💥 Error in main execution: ${error.message}`);
    console.error(error.stack);
    console.log(`\n🛠️  Troubleshooting:`);
    console.log(`   • Check devnet connectivity and account funding`);
    console.log(`   • Ensure Batch amendment is enabled on the selected network`);
    console.log(`   • Verify inner transaction format (no fees, no signatures)`);
  });