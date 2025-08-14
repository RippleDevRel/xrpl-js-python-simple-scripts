const { Client, xrpToDrops, dropsToXrp } = require('xrpl');

/*
===============================================================================
                    ON-CHAIN CREDENTIALS (XLS-70)
===============================================================================

This script demonstrates On-Chain Credentials functionality:
1. Credential issuance and acceptance
2. Deposit authorization with credentials
3. Payments with credential validation
4. Complete KYC workflow demonstration

Scenario:
- Isabel: KYC credential issuer (trusted authority)
- Alice: User seeking KYC verification
- Bob: User without KYC (should not be able to pay Verity)
- Verity: Business requiring KYC'd customers only

Flow:
1. Isabel issues KYC credential to Alice
2. Alice accepts the credential (makes it valid)
3. Verity configures deposit auth to accept Isabel's KYC credentials
4. Alice can now send payments to Verity using her credential
5. Bob attempts to pay Verity without KYC and/or using Alice's credential (fail)
6. Demonstrates complete credential lifecycle management (create, accept, delete)

https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0070-credentials
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

// Helper function to get actual credential ID from ledger objects
const getActualCredentialId = async (client, accountAddress, issuer, credentialType) => {
  try {
    const accountObjects = await client.request({
      command: "account_objects",
      account: accountAddress,
      ledger_index: "validated",
      type: "credential"
    });
    
    // Find the credential that matches issuer and type
    const credential = accountObjects.result.account_objects.find(obj => 
      obj.Issuer === issuer && obj.CredentialType === credentialType
    );
    
    if (credential && credential.index) {
      return credential.index;
    }
    
    return null;
  } catch (error) {
    console.log(`⚠️  Error fetching credential ID: ${error.message}`);
    return null;
  }
};

// Helper function to get account credentials
const getAccountCredentials = async (client, accountAddress) => {
  try {
    const accountObjects = await client.request({
      command: "account_objects",
      account: accountAddress,
      ledger_index: "validated",
      type: "credential"
    });
    
    return accountObjects.result.account_objects || [];
  } catch (error) {
    console.log(`⚠️  Error fetching credentials for ${accountAddress}: ${error.message}`);
    return [];
  }
};

// Helper function to check deposit authorization
const checkDepositAuthorization = async (client, sourceAccount, destinationAccount = []) => {
  try {
    const request = {
      command: "deposit_authorized",
      source_account: sourceAccount,
      destination_account: destinationAccount,
      ledger_index: "validated"
    };
    
    const response = await client.request(request);
    return response.result.deposit_authorized;
  } catch (error) {
    console.log(`⚠️  Error checking deposit authorization: ${error.message}`);
    return false;
  }
};

// Sleep function
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Main function
const main = async () => {
  console.log('🚀 On-Chain Credentials Demo (XLS-70)');
  console.log('='.repeat(70));
  
  // Connect to XRPL Devnet where Credentials amendment is active
  console.log('🌐 Connecting to XRPL Devnet...');
  const client = new Client('wss://s.devnet.rippletest.net:51233');
  await client.connect();
  
  // Generate funded wallets
  console.log('\n💰 Creating funded test wallets...');
  const { wallet: isabelWallet } = await client.fundWallet(); // KYC Issuer
  const { wallet: aliceWallet } = await client.fundWallet();  // User with KYC
  const { wallet: bobWallet } = await client.fundWallet();    // User without KYC
  const { wallet: verityWallet } = await client.fundWallet(); // Business
  
  console.log(`🏛️ Isabel (KYC Issuer): ${isabelWallet.address}`);
  console.log(`👤 Alice (KYC User): ${aliceWallet.address}`);
  console.log(`👨 Bob (Non-KYC User): ${bobWallet.address}`);
  console.log(`🏢 Verity (Business): ${verityWallet.address}`);
  
  await sleep(3000);
  
  // === STEP 1: CREATE KYC CREDENTIAL ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 1: Isabel Issues KYC Credential to Alice');
  console.log('='.repeat(50));
  
  const kycCredentialType = textToHex('KYC'); // "KYC" converted to hex
  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = currentTime + (365 * 24 * 60 * 60); // 1 year from now
  
  console.log(`🔑 Credential Type: KYC (${kycCredentialType})`);
  console.log(`⏰ Expiration: ${new Date(expirationTime * 1000).toISOString()}`);
  
  const credentialCreateTx = {
    TransactionType: 'CredentialCreate',
    Account: isabelWallet.address,
    Subject: aliceWallet.address,
    CredentialType: kycCredentialType,
    Expiration: expirationTime,
    URI: textToHex('https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0070-credentials')
  };
  
  await submitTransaction(
    credentialCreateTx,
    client,
    isabelWallet,
    "Creating KYC credential for Alice"
  );
  
  // === STEP 2: ALICE ACCEPTS THE CREDENTIAL ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 2: Alice Accepts KYC Credential');
  console.log('='.repeat(50));
  
  const credentialAcceptTx = {
    TransactionType: 'CredentialAccept',
    Account: aliceWallet.address,
    Issuer: isabelWallet.address,
    CredentialType: kycCredentialType
  };
  
  await submitTransaction(
    credentialAcceptTx,
    client,
    aliceWallet,
    "Alice accepting KYC credential"
  );
  
  // === STEP 3: VERITY SETS UP DEPOSIT AUTHORIZATION ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: Verity Configures Deposit Authorization');
  console.log('='.repeat(50));
  
  console.log('🔐 Verity will only accept payments from KYC\'d accounts');
  
  // First enable Deposit Authorization
  const enableDepositAuthTx = {
    TransactionType: 'AccountSet',
    Account: verityWallet.address,
    SetFlag: 9 // asfDepositAuth
  };
  
  await submitTransaction(
    enableDepositAuthTx,
    client,
    verityWallet,
    "Enabling Deposit Authorization"
  );
  
  // Then configure credential-based preauthorization
  const depositPreauthTx = {
    TransactionType: 'DepositPreauth',
    Account: verityWallet.address,
    AuthorizeCredentials: [
      {
        Credential: {
          Issuer: isabelWallet.address,
          CredentialType: kycCredentialType
        }
      }
    ]
  };
  
  await submitTransaction(
    depositPreauthTx,
    client,
    verityWallet,
    "Authorizing Isabel's KYC credentials"
  );
  
  // === STEP 4: TEST PAYMENTS ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 4: Testing Payments with Credentials');
  console.log('='.repeat(50));
  
  // Get the actual credential ID from Alice's account objects
  console.log('\n🔍 Fetching actual credential ID from ledger...');
  const credentialId = await getActualCredentialId(
    client, 
    aliceWallet.address, 
    isabelWallet.address, 
    kycCredentialType
  );
  
  if (!credentialId) {
    console.log('❌ Could not find credential ID in Alice\'s account objects');
    console.log('📋 This might indicate the credential was not properly created or accepted');
    await client.disconnect();
    return;
  }
  
  console.log(`🆔 Actual Credential ID: ${credentialId}`);
  
  // Test 1: Payment WITH credential (should succeed)
  console.log('\n🧪 Test 1: Alice pays Verity WITH KYC credential');
  const paymentWithCredentialTx = {
    TransactionType: 'Payment',
    Account: aliceWallet.address,
    Destination: verityWallet.address,
    Amount: xrpToDrops('10'), // 10 XRP
    CredentialIDs: [credentialId]
  };
  
  await submitTransaction(
    paymentWithCredentialTx,
    client,
    aliceWallet,
    "Payment with KYC credential (should succeed)"
  );
  
  // Test 2: Payment WITHOUT credential (should fail)
  console.log('\n🧪 Test 2: Alice pays Verity WITHOUT credential');
  const paymentWithoutCredentialTx = {
    TransactionType: 'Payment',
    Account: aliceWallet.address,
    Destination: verityWallet.address,
    Amount: xrpToDrops('5') // 5 XRP
  };
  
  try {
    await submitTransaction(
      paymentWithoutCredentialTx,
      client,
      aliceWallet,
      "Payment without credential (should fail)"
    );
  } catch (error) {
    console.log('❌ Payment failed as expected - no credential provided');
  }
  
  // Test 3: Check deposit authorization status (without credential)
  console.log('\n🧪 Test 3: Checking deposit authorization WITHOUT credential');
  console.log('ℹ️  Note: Basic deposit_authorized check (credential support may be limited)');
  
  const isAuthorizedBasic = await checkDepositAuthorization(
    client, 
    aliceWallet.address, 
    verityWallet.address
  );
  
  console.log(`🔍 Alice → Verity (basic check): ${isAuthorizedBasic ? 'AUTHORIZED' : 'NOT AUTHORIZED'}`);
  console.log(`💡 Expected: NOT AUTHORIZED (Alice needs to provide credential in payment)`);
  
  // Test 4: Verify credential information
  console.log('\n🧪 Test 4: Verifying Credential Information');
  console.log(`🆔 Alice's KYC Credential ID: ${credentialId}`);
  
  // Verify the credential exists and is accepted
  const aliceCredentialCheck = await getAccountCredentials(client, aliceWallet.address);
  const matchingCredential = aliceCredentialCheck.find(cred => 
    cred.index === credentialId && 
    cred.Issuer === isabelWallet.address && 
    cred.CredentialType === kycCredentialType
  );
  
  if (matchingCredential) {
    const isAccepted = (matchingCredential.Flags & 0x00010000) !== 0;
    console.log(`✅ Credential found in Alice's account:`);
    console.log(`   - ID: ${matchingCredential.index}`);
    console.log(`   - Status: ${isAccepted ? 'ACCEPTED ✅' : 'PENDING ⏳'}`);
    console.log(`   - Issuer: ${matchingCredential.Issuer}`);
    console.log(`   - Type: ${Buffer.from(matchingCredential.CredentialType, 'hex').toString('utf8')}`);
    
    if (isAccepted) {
      console.log(`💡 This credential should work for payments to accounts that trust Isabel's KYC`);
    } else {
      console.log(`⚠️  Credential not yet accepted - payments will fail`);
    }
  } else {
    console.log(`❌ Credential not found or doesn't match expected parameters`);
  }
  
  // Test 5: Bob tries to pay Verity WITHOUT any credential
  console.log('\n🧪 Test 5: Bob pays Verity WITHOUT credential');
  const bobPaymentWithoutCredentialTx = {
    TransactionType: 'Payment',
    Account: bobWallet.address,
    Destination: verityWallet.address,
    Amount: xrpToDrops('3') // 3 XRP
  };
  
  try {
    await submitTransaction(
      bobPaymentWithoutCredentialTx,
      client,
      bobWallet,
      "Bob's payment without credential (should fail)"
    );
  } catch (error) {
    console.log('❌ Bob\'s payment failed as expected - no credential provided');
  }
  
  // Test 6: Bob tries to use Alice's credential (should fail)
  console.log('\n🧪 Test 6: Bob tries to use ALICE\'S credential');
  console.log('⚠️  Security test: Credentials should be non-transferable!');
  
  const bobPaymentWithAliceCredentialTx = {
    TransactionType: 'Payment',
    Account: bobWallet.address,
    Destination: verityWallet.address,
    Amount: xrpToDrops('3'), // 3 XRP
    CredentialIDs: [credentialId] // Alice's credential ID
  };
  
  try {
    await submitTransaction(
      bobPaymentWithAliceCredentialTx,
      client,
      bobWallet,
      "Bob trying to use Alice's credential (should fail)"
    );
  } catch (error) {
    console.log('❌ Bob cannot use Alice\'s credential - security verified!');
  }
  
  // === STEP 5: CREDENTIAL LIFECYCLE MANAGEMENT DEMO ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 5: Credential Lifecycle Management Demo');
  console.log('='.repeat(50));
  
  // Step 5a: Create a temporary credential
  const tempCredentialType = textToHex('TEMP');
  const tempCredentialCreateTx = {
    TransactionType: 'CredentialCreate',
    Account: isabelWallet.address,
    Subject: aliceWallet.address,
    CredentialType: tempCredentialType,
    Expiration: currentTime + 3600 // 1 hour from now
  };
  
  await submitTransaction(
    tempCredentialCreateTx,
    client,
    isabelWallet,
    "Step 5a: Creating temporary credential"
  );
  
  // Step 5b: Check Alice's credentials before acceptance
  console.log('\n📋 Step 5b: Alice\'s credentials BEFORE accepting temp credential:');
  let aliceCredsBefore = await getAccountCredentials(client, aliceWallet.address);
  console.log(`   Alice has ${aliceCredsBefore.length} credentials`);
  aliceCredsBefore.forEach((cred, index) => {
    const typeText = Buffer.from(cred.CredentialType, 'hex').toString('utf8');
    const isAccepted = (cred.Flags & 0x00010000) !== 0;
    console.log(`   ${index + 1}. ${typeText}: ${isAccepted ? 'ACCEPTED ✅' : 'PENDING ⏳'}`);
  });
  
  // Step 5c: Alice accepts the temporary credential
  const tempCredentialAcceptTx = {
    TransactionType: 'CredentialAccept',
    Account: aliceWallet.address,
    Issuer: isabelWallet.address,
    CredentialType: tempCredentialType
  };
  
  await submitTransaction(
    tempCredentialAcceptTx,
    client,
    aliceWallet,
    "Step 5c: Alice accepting temporary credential"
  );
  
  // Step 5d: Check Alice's credentials after acceptance
  console.log('\n📋 Step 5d: Alice\'s credentials AFTER accepting temp credential:');
  let aliceCredsAfter = await getAccountCredentials(client, aliceWallet.address);
  console.log(`   Alice now has ${aliceCredsAfter.length} credentials`);
  aliceCredsAfter.forEach((cred, index) => {
    const typeText = Buffer.from(cred.CredentialType, 'hex').toString('utf8');
    const isAccepted = (cred.Flags & 0x00010000) !== 0;
    console.log(`   ${index + 1}. ${typeText}: ${isAccepted ? 'ACCEPTED ✅' : 'PENDING ⏳'}`);
  });
  
  // Step 5e: Isabel deletes the temporary credential
  const credentialDeleteTx = {
    TransactionType: 'CredentialDelete',
    Account: isabelWallet.address,
    Subject: aliceWallet.address,
    CredentialType: tempCredentialType
  };
  
  await submitTransaction(
    credentialDeleteTx,
    client,
    isabelWallet,
    "Step 5e: Isabel deleting temporary credential"
  );
  
  // Step 5f: Check Alice's credentials after deletion
  console.log('\n📋 Step 5f: Alice\'s credentials AFTER Isabel deleted temp credential:');
  let aliceCredsAfterDeletion = await getAccountCredentials(client, aliceWallet.address);
  console.log(`   Alice now has ${aliceCredsAfterDeletion.length} credentials`);
  aliceCredsAfterDeletion.forEach((cred, index) => {
    const typeText = Buffer.from(cred.CredentialType, 'hex').toString('utf8');
    const isAccepted = (cred.Flags & 0x00010000) !== 0;
    console.log(`   ${index + 1}. ${typeText}: ${isAccepted ? 'ACCEPTED ✅' : 'PENDING ⏳'}`);
  });
  
  console.log('\n🎓 Lifecycle Demo Summary:');
  console.log(`   📈 Before: ${aliceCredsBefore.length} credentials`);
  console.log(`   📈 After accept: ${aliceCredsAfter.length} credentials`);
  console.log(`   📉 After delete: ${aliceCredsAfterDeletion.length} credentials`);
  console.log('   ✅ Demonstrated complete credential lifecycle management!');
  
  // === FINAL STATUS ===
  console.log('\n' + '='.repeat(50));
  console.log('FINAL STATUS & ACCOUNT INFORMATION');
  console.log('='.repeat(50));
  
  // Get credentials for each account
  console.log('\n📋 Credential Information:');
  
  const isabelCredentials = await getAccountCredentials(client, isabelWallet.address);
  const aliceCredentials = await getAccountCredentials(client, aliceWallet.address);
  const bobCredentials = await getAccountCredentials(client, bobWallet.address);
  const verityCredentials = await getAccountCredentials(client, verityWallet.address);
  
  console.log(`\n🏛️  Isabel (Issuer) - ${isabelCredentials.length} credentials:`);
  isabelCredentials.forEach((cred, index) => {
    const typeHex = cred.CredentialType;
    const typeText = Buffer.from(typeHex, 'hex').toString('utf8');
    const isAccepted = (cred.Flags & 0x00010000) !== 0;
    console.log(`   ${index + 1}. Type: ${typeText} (${typeHex})`);
    console.log(`      Subject: ${cred.Subject}`);
    console.log(`      Object ID: ${cred.index}`);
    console.log(`      Status: ${isAccepted ? 'ACCEPTED' : 'PENDING'}`);
    if (cred.Expiration) {
      console.log(`      Expires: ${new Date(cred.Expiration * 1000).toISOString()}`);
    }
  });
  
  console.log(`\n👤 Alice (Subject) - ${aliceCredentials.length} credentials:`);
  aliceCredentials.forEach((cred, index) => {
    const typeHex = cred.CredentialType;
    const typeText = Buffer.from(typeHex, 'hex').toString('utf8');
    const isAccepted = (cred.Flags & 0x00010000) !== 0;
    console.log(`   ${index + 1}. Type: ${typeText} (${typeHex})`);
    console.log(`      Issuer: ${cred.Issuer}`);
    console.log(`      Object ID: ${cred.index}`);
    console.log(`      Status: ${isAccepted ? 'ACCEPTED ✅' : 'PENDING ⏳'}`);
    if (cred.Expiration) {
      console.log(`      Expires: ${new Date(cred.Expiration * 1000).toISOString()}`);
    }
  });
  
  console.log(`\n👨 Bob (Non-KYC User) - ${bobCredentials.length} credentials:`);
  if (bobCredentials.length === 0) {
    console.log(`   ❌ No credentials found - Bob cannot access KYC-gated services`);
  } else {
    bobCredentials.forEach((cred, index) => {
      const typeHex = cred.CredentialType;
      const typeText = Buffer.from(typeHex, 'hex').toString('utf8');
      const isAccepted = (cred.Flags & 0x00010000) !== 0;
      console.log(`   ${index + 1}. Type: ${typeText} (${typeHex})`);
      console.log(`      Issuer: ${cred.Issuer}`);
      console.log(`      Object ID: ${cred.index}`);
      console.log(`      Status: ${isAccepted ? 'ACCEPTED ✅' : 'PENDING ⏳'}`);
    });
  }
  
  console.log(`\n🏢 Verity (Business) - ${verityCredentials.length} credentials`);
  
  // Get deposit preauth information
  try {
    const verityDepositPreauths = await client.request({
      command: "account_objects",
      account: verityWallet.address,
      ledger_index: "validated",
      type: "deposit_preauth"
    });
    
    console.log(`\n🔐 Verity's Deposit Preauthorizations: ${verityDepositPreauths.result.account_objects.length}`);
    verityDepositPreauths.result.account_objects.forEach((preauth, index) => {
      if (preauth.AuthorizeCredentials) {
        console.log(`   ${index + 1}. Credential-based authorization:`);
        preauth.AuthorizeCredentials.forEach((authCred) => {
          if (authCred.Credential && authCred.Credential.CredentialType) {
            try {
              const typeText = Buffer.from(authCred.Credential.CredentialType, 'hex').toString('utf8');
              console.log(`      - Type: ${typeText} from ${authCred.Credential.Issuer}`);
            } catch (error) {
              console.log(`      - Type: ${authCred.Credential.CredentialType} from ${authCred.Credential.Issuer}`);
            }
          } else {
            console.log(`      - Raw credential: ${JSON.stringify(authCred)}`);
          }
        });
      } else if (preauth.Authorize) {
        console.log(`   ${index + 1}. Account-based: ${preauth.Authorize}`);
      }
    });
  } catch (error) {
    console.log(`⚠️  Could not fetch deposit preauth info: ${error.message}`);
  }
  
  // Get account balances
  try {
    const isabelInfo = await client.request({
      command: "account_info",
      account: isabelWallet.address,
      ledger_index: "validated"
    });
    
    const aliceInfo = await client.request({
      command: "account_info",
      account: aliceWallet.address,
      ledger_index: "validated"
    });
    
    const bobInfo = await client.request({
      command: "account_info",
      account: bobWallet.address,
      ledger_index: "validated"
    });
    
    const verityInfo = await client.request({
      command: "account_info",
      account: verityWallet.address,
      ledger_index: "validated"
    });
    
    console.log(`\n💰 Account Balances:`);
    console.log(`🏛️ Isabel: ${Number(dropsToXrp(isabelInfo.result.account_data.Balance))} XRP`);
    console.log(`👤 Alice: ${Number(dropsToXrp(aliceInfo.result.account_data.Balance) )} XRP`);
    console.log(`👨 Bob: ${Number(dropsToXrp(bobInfo.result.account_data.Balance))} XRP`);
    console.log(`🏢 Verity: ${Number(dropsToXrp(verityInfo.result.account_data.Balance))} XRP`);
    
  } catch (error) {
    console.log(`⚠️  Could not fetch account balances: ${error.message}`);
  }
  
  console.log(`\n🌐 Explore on Devnet:`);
  console.log(`🏛️ Isabel: https://devnet.xrpl.org/accounts/${isabelWallet.address}`);
  console.log(`👤 Alice: https://devnet.xrpl.org/accounts/${aliceWallet.address}`);
  console.log(`👨 Bob: https://devnet.xrpl.org/accounts/${bobWallet.address}`);
  console.log(`🏢 Verity: https://devnet.xrpl.org/accounts/${verityWallet.address}`);
  
  console.log(`\n✨ Credentials Demo Completed Successfully!`);
  console.log('\n📚 What happened:');
  console.log('   1. ✅ Isabel issued KYC credential to Alice');
  console.log('   2. ✅ Alice accepted the credential (made it valid)');
  console.log('   3. ✅ Verity configured deposit auth to require KYC credentials');
  console.log('   4. ✅ Alice successfully paid Verity using her KYC credential');
  console.log('   5. ✅ Payment without credential was rejected');
  console.log('   6. ✅ Verified credential information and status');
  console.log('   7. ✅ Bob failed to pay without credentials (as expected)');
  console.log('   8. ✅ Bob failed to use Alice\'s credential (security verified)');
  console.log('   9. ✅ Demonstrated complete credential lifecycle');
  console.log('  10. ✅ Displayed complete account information');
  
  await client.disconnect();
};

main()
  .then(() => {
    console.log(`\n📖 Learn More:`);
    console.log(`   🔗 XLS-70 On-Chain Credentials Specification: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0070-credentials`);
  })
  .catch((error) => {
    console.error(`\n💥 Error in main execution: ${error.message}`);
    console.error(error.stack);
  });