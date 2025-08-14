const { Client, dropsToXrp } = require('xrpl');

/*
===============================================================================
                    PERMISSIONED DOMAINS - Building on XLS-80
===============================================================================

This script demonstrates Permissioned Domains functionality:
1. Domain creation with credential-based eligibility rules (XLS-70)
2. Automatic eligibility based on regulatory compliance
3. Domain modification and management
4. Multi-tier financial services scenarios

RELATIONSHIP DIAGRAM:
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CREDENTIALS (1-to-1)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Isabel Financial ──KYC──→ Alice (Client)                                  │
│  Isabel Financial ──AML──→ Alice (Client)                                  │
│  RegulatorX (SEC) ──ACCREDITED──→ Charlie (Investor)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                       ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SERVICE TIERS (1-to-many)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Private Banking Tier (Owner: Bank)                                        │
│  ├── Requires: KYC verification from licensed institution                  │
│  ├── Eligible: Alice (KYC verified)                                        │
│  └── Not eligible: Bob (unverified)                                        │
│                                                                            │
│  Institutional Trading Desk (Owner: Bank)                                  │
│  ├── Requires: Accredited Investor OR AML compliance                       │
│  ├── Eligible: Alice (AML), Charlie (Accredited)                           │
│  └── Not eligible: Bob (unverified)                                        │
└─────────────────────────────────────────────────────────────────────────────┘

TRADITIONAL FINANCE ANALOGY: Think of it like banking service tiers:
- Credentials = Your financial certifications (KYC verification, AML clearance, accredited investor status)
- Domains = Different service tiers (Private Banking, Wealth Management, Institutional Trading)
- "Membership" = Automatic qualification if you meet regulatory requirements
- Domain Owner = Financial institution setting compliance criteria

https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0080-permissioned-domains
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
      
      // Extract domain ID if this is a PermissionedDomainSet transaction
      if (txn.TransactionType === 'PermissionedDomainSet' && !txn.DomainID) {
        const sequence = result.tx_json.Sequence;
        const account = result.tx_json.Account;
        console.log(`🏛️  Service tier created with Owner: ${account}, Sequence: ${sequence}`);
      }
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

// Helper function to get actual domain ID from ledger objects
const getDomainId = async (client, ownerAddress, sequence) => {
  try {
    const accountObjects = await client.request({
      command: "account_objects",
      account: ownerAddress,
      ledger_index: "validated",
      type: "permissioned_domain"
    });
    
    // Find the domain that matches the sequence
    const domain = accountObjects.result.account_objects.find(obj => 
      obj.Sequence === sequence
    );
    
    if (domain && domain.index) {
      return domain.index;
    }
    
    return null;
  } catch (error) {
    console.log(`⚠️  Error fetching domain ID: ${error.message}`);
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

// Helper function to check if account is eligible for service tier
const isEligibleForTier = (userCredentials, tierCriteria) => {
  // Check if user has any credential that matches tier's eligibility criteria
  for (const userCred of userCredentials) {
    for (const criteria of tierCriteria) {
      if (userCred.Issuer === criteria.Issuer && 
          userCred.CredentialType === criteria.CredentialType &&
          (userCred.Flags & 0x00010000) !== 0) { // Check if accepted
        return true;
      }
    }
  }
  return false;
};

// Sleep function
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Main function
const main = async () => {
  console.log('🚀 Permissioned Domains Demo - Financial Services Architecture');
  console.log('='.repeat(70));
  
  // Connect to XRPL Devnet where both Credentials and Domains amendments are active
  console.log('🌐 Connecting to XRPL Devnet...');
  const client = new Client('wss://s.devnet.rippletest.net:51233');
  await client.connect();
  
  // Generate funded wallets
  console.log('\n💰 Creating funded test wallets...');
  const { wallet: isabelWallet } = await client.fundWallet();    // Compliance Provider
  const { wallet: regulatorWallet } = await client.fundWallet(); // Securities Authority
  const { wallet: bankOwnerWallet } = await client.fundWallet(); // Financial Institution
  const { wallet: aliceWallet } = await client.fundWallet();     // Premium Client
  const { wallet: bobWallet } = await client.fundWallet();       // Standard Client
  const { wallet: charlieWallet } = await client.fundWallet();   // Institutional Investor
  
  console.log(`🏛️ Isabel Financial Services (Compliance Provider): ${isabelWallet.address}`);
  console.log(`🏛️ RegulatorX Securities Authority: ${regulatorWallet.address}`);
  console.log(`🏦 Global Bank (Financial Institution): ${bankOwnerWallet.address}`);
  console.log(`👩 Alice Stevens (Premium Client): ${aliceWallet.address}`);
  console.log(`👨 Bob Wilson (Standard Client): ${bobWallet.address}`);
  console.log(`👤 Charlie Davis (Institutional Investor): ${charlieWallet.address}`);
  
  await sleep(3000);
  
  // === STEP 1: REGULATORY COMPLIANCE SETUP ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 1: Regulatory Compliance Infrastructure Setup');
  console.log('='.repeat(50));
  
  const kycCredentialType = textToHex('KYC_VERIFICATION');
  const amlCredentialType = textToHex('AML_COMPLIANCE');
  const accreditedCredentialType = textToHex('ACCREDITED_INVESTOR');
  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = currentTime + (365 * 24 * 60 * 60); // 1 year
  
  // Isabel Financial issues KYC verification to Alice
  const kycCredentialCreateTx = {
    TransactionType: 'CredentialCreate',
    Account: isabelWallet.address,
    Subject: aliceWallet.address,
    CredentialType: kycCredentialType,
    Expiration: expirationTime,
    URI: textToHex('https://isabel-financial.com/kycportal')
  };
  
  await submitTransaction(
    kycCredentialCreateTx,
    client,
    isabelWallet,
    "Isabel Financial issuing KYC verification to Alice Stevens"
  );
  
  // Isabel Financial issues AML compliance to Alice
  const amlCredentialCreateTx = {
    TransactionType: 'CredentialCreate',
    Account: isabelWallet.address,
    Subject: aliceWallet.address,
    CredentialType: amlCredentialType,
    Expiration: expirationTime,
    URI: textToHex('https://isabel-financial.com/amlportal')
  };
  
  await submitTransaction(
    amlCredentialCreateTx,
    client,
    isabelWallet,
    "Isabel Financial issuing AML compliance to Alice Stevens"
  );
  
  // RegulatorX issues Accredited Investor certification to Charlie
  const accreditedCredentialCreateTx = {
    TransactionType: 'CredentialCreate',
    Account: regulatorWallet.address,
    Subject: charlieWallet.address,
    CredentialType: accreditedCredentialType,
    Expiration: expirationTime,
    URI: textToHex('https://regulatorx.gov/accredited/portal')
  };
  
  await submitTransaction(
    accreditedCredentialCreateTx,
    client,
    regulatorWallet,
    "RegulatorX issuing Accredited Investor certification to Charlie Davis"
  );
  
  // Clients accept their compliance certifications
  const credentialsToAccept = [
    { wallet: aliceWallet, issuer: isabelWallet.address, type: kycCredentialType, name: 'Alice accepting KYC verification' },
    { wallet: aliceWallet, issuer: isabelWallet.address, type: amlCredentialType, name: 'Alice accepting AML compliance' },
    { wallet: charlieWallet, issuer: regulatorWallet.address, type: accreditedCredentialType, name: 'Charlie accepting Accredited Investor certification' }
  ];
  
  for (const cred of credentialsToAccept) {
    const acceptTx = {
      TransactionType: 'CredentialAccept',
      Account: cred.wallet.address,
      Issuer: cred.issuer,
      CredentialType: cred.type
    };
    
    await submitTransaction(acceptTx, client, cred.wallet, cred.name);
  }
  
  // === STEP 2: PRIVATE BANKING TIER CREATION ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 2: Private Banking Tier Creation');
  console.log('='.repeat(50));
  
  console.log('🏛️  Creating "Private Banking Tier" - Exclusive services for KYC-verified clients');
  
  // Create Private Banking Tier (requires KYC verification from licensed institution)
  const privateBankingCreateTx = {
    TransactionType: 'PermissionedDomainSet',
    Account: bankOwnerWallet.address,
    AcceptedCredentials: [
      {
        Credential: {
          Issuer: isabelWallet.address,
          CredentialType: kycCredentialType
        }
      }
    ]
  };
  
  const privateBankingResponse = await submitTransaction(
    privateBankingCreateTx,
    client,
    bankOwnerWallet,
    "Creating Private Banking Tier"
  );
  
  const privateBankingSequence = privateBankingResponse.result.tx_json.Sequence;
  
  // Wait and get the actual domain ID from ledger
  await sleep(2000);
  const privateBankingId = await getDomainId(client, bankOwnerWallet.address, privateBankingSequence);
  
  if (!privateBankingId) {
    console.log('❌ Could not retrieve Private Banking Domain ID from ledger');
    await client.disconnect();
    return;
  }
  
  console.log(`🆔 Private Banking Tier ID: ${privateBankingId}`);
  console.log(`📋 Eligibility Requirements: Must have KYC verification from licensed institution`);
  
  // === STEP 3: CLIENT ELIGIBILITY ASSESSMENT ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 3: Client Eligibility Assessment');
  console.log('='.repeat(50));
  
  console.log('🔍 Checking eligibility for Private Banking services...');
  
  // Get compliance certifications for each client
  const aliceCredentials = await getAccountCredentials(client, aliceWallet.address);
  const bobCredentials = await getAccountCredentials(client, bobWallet.address);
  const charlieCredentials = await getAccountCredentials(client, charlieWallet.address);
  
  // Define Private Banking eligibility criteria
  const privateBankingCriteria = [
    { Issuer: isabelWallet.address, CredentialType: kycCredentialType }
  ];
  
  // Check eligibility
  const aliceEligible = isEligibleForTier(aliceCredentials, privateBankingCriteria);
  const bobEligible = isEligibleForTier(bobCredentials, privateBankingCriteria);
  const charlieEligible = isEligibleForTier(charlieCredentials, privateBankingCriteria);
  
  console.log(`\n👩 Alice Stevens: ${aliceEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'} (KYC-verified client)`);
  console.log(`👨 Bob Wilson: ${bobEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'} (unverified customer)`);
  console.log(`👤 Charlie Davis: ${charlieEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'} (accredited but not KYC-verified)`);
  
  console.log('\n💡 Eligibility is automatically determined by regulatory compliance status!');
  
  // === STEP 4: SERVICE TIER EXPANSION ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 4: Service Tier Expansion');
  console.log('='.repeat(50));
  
  console.log('🔄 Expanding Private Banking to also accept AML-compliant clients...');
  
  // Modify Private Banking to accept both KYC verification and AML compliance
  const privateBankingModifyTx = {
    TransactionType: 'PermissionedDomainSet',
    Account: bankOwnerWallet.address,
    DomainID: privateBankingId,
    AcceptedCredentials: [
      {
        Credential: {
          Issuer: isabelWallet.address,
          CredentialType: kycCredentialType
        }
      },
      {
        Credential: {
          Issuer: isabelWallet.address,
          CredentialType: amlCredentialType
        }
      }
    ]
  };
  
  await submitTransaction(
    privateBankingModifyTx,
    client,
    bankOwnerWallet,
    "Expanding Private Banking eligibility to include AML compliance"
  );
  
  console.log('📋 Updated Eligibility: Must have KYC verification OR AML compliance from licensed institution');
  
  // === STEP 5: INSTITUTIONAL TRADING DESK ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 5: Institutional Trading Desk Creation');
  console.log('='.repeat(50));
  
  console.log('🏛️  Creating "Institutional Trading Desk" - High-value services for qualified investors');
  
  // Create Institutional Trading Desk (requires Accredited Investor status OR AML compliance)
  const institutionalTradingCreateTx = {
    TransactionType: 'PermissionedDomainSet',
    Account: bankOwnerWallet.address,
    AcceptedCredentials: [
      {
        Credential: {
          Issuer: regulatorWallet.address,
          CredentialType: accreditedCredentialType
        }
      },
      {
        Credential: {
          Issuer: isabelWallet.address,
          CredentialType: amlCredentialType
        }
      }
    ]
  };
  
  const institutionalTradingResponse = await submitTransaction(
    institutionalTradingCreateTx,
    client,
    bankOwnerWallet,
    "Creating Institutional Trading Desk"
  );
  
  const institutionalTradingSequence = institutionalTradingResponse.result.tx_json.Sequence;
  
  // Wait and get the actual domain ID from ledger
  await sleep(2000);
  const institutionalTradingId = await getDomainId(client, bankOwnerWallet.address, institutionalTradingSequence);
  
  if (!institutionalTradingId) {
    console.log('❌ Could not retrieve Institutional Trading Domain ID from ledger');
    await client.disconnect();
    return;
  }
  
  console.log(`🆔 Institutional Trading Desk ID: ${institutionalTradingId}`);
  console.log(`📋 Eligibility Requirements: Must have Accredited Investor status OR AML compliance`);
  
  // Test eligibility across multiple service tiers
  console.log('\n🔍 Testing eligibility across service tiers...');
  
  const institutionalTradingCriteria = [
    { Issuer: regulatorWallet.address, CredentialType: accreditedCredentialType },
    { Issuer: isabelWallet.address, CredentialType: amlCredentialType }
  ];
  
  const aliceInstitutionalEligible = isEligibleForTier(aliceCredentials, institutionalTradingCriteria);
  const bobInstitutionalEligible = isEligibleForTier(bobCredentials, institutionalTradingCriteria);
  const charlieInstitutionalEligible = isEligibleForTier(charlieCredentials, institutionalTradingCriteria);
  
  console.log('\n📊 Service Tier Eligibility Matrix:');
  console.log('┌─────────────────┬─────────────────┬─────────────────┐');
  console.log('│     Client      │ Private Banking │ Institutional   │');
  console.log('├─────────────────┼─────────────────┼─────────────────┤');
  console.log(`│ Alice (KYC+AML) │ ${aliceEligible ? '✅ ELIGIBLE' : '❌ NOT ELG'} │ ${aliceInstitutionalEligible ? '✅ ELIGIBLE' : '❌ NOT ELG'} │`);
  console.log(`│ Bob (unverified)│ ${bobEligible ? '✅ ELIGIBLE' : '❌ NOT ELG'} │ ${bobInstitutionalEligible ? '✅ ELIGIBLE' : '❌ NOT ELG'} │`);
  console.log(`│ Charlie (ACCR)  │ ${charlieEligible ? '✅ ELIGIBLE' : '❌ NOT ELG'} │ ${charlieInstitutionalEligible ? '✅ ELIGIBLE' : '❌ NOT ELG'} │`);
  console.log('└─────────────────┴─────────────────┴─────────────────┘');
  
  // === STEP 6: SERVICE TIER LIFECYCLE MANAGEMENT ===
  console.log('\n' + '='.repeat(50));
  console.log('STEP 6: Service Tier Lifecycle Management');
  console.log('='.repeat(50));
  
  console.log('🗑️  Demonstrating service tier management...');
  
  // Create a temporary compliance tier for demonstration
  const tempComplianceTierCreateTx = {
    TransactionType: 'PermissionedDomainSet',
    Account: bankOwnerWallet.address,
    AcceptedCredentials: [
      {
        Credential: {
          Issuer: isabelWallet.address,
          CredentialType: textToHex('TEMP_COMPLIANCE')
        }
      }
    ]
  };
  
  const tempComplianceTierResponse = await submitTransaction(
    tempComplianceTierCreateTx,
    client,
    bankOwnerWallet,
    "Creating temporary compliance tier for demonstration"
  );
  
  const tempComplianceTierSequence = tempComplianceTierResponse.result.tx_json.Sequence;
  
  // Wait and get the actual domain ID from ledger
  await sleep(2000);
  const tempComplianceTierId = await getDomainId(client, bankOwnerWallet.address, tempComplianceTierSequence);
  
  if (!tempComplianceTierId) {
    console.log('❌ Could not retrieve temporary domain ID from ledger');
    return;
  }
  
  // Terminate the temporary compliance tier
  const tierDeleteTx = {
    TransactionType: 'PermissionedDomainDelete',
    Account: bankOwnerWallet.address,
    DomainID: tempComplianceTierId
  };
  
  await submitTransaction(
    tierDeleteTx,
    client,
    bankOwnerWallet,
    "Terminating temporary compliance tier"
  );
  
  // === FINAL STATUS ===
  console.log('\n' + '='.repeat(50));
  console.log('FINAL STATUS & FINANCIAL SERVICES ECOSYSTEM');
  console.log('='.repeat(50));
  
  // Display regulatory compliance infrastructure
  console.log('\n📋 Regulatory Compliance Infrastructure:');
  
  console.log(`\n🏛️ Isabel Financial Services (Compliance Provider):`);
  console.log(`   • Specializes in: KYC verification, AML compliance`);
  console.log(`   • Regulatory approval: Licensed financial institution`);
  console.log(`   • Client base: Retail and corporate clients`);
  
  console.log(`\n🏛️ RegulatorX Securities Authority:`);
  console.log(`   • Specializes in: Accredited Investor certification`);
  console.log(`   • Regulatory approval: Government securities regulator`);
  console.log(`   • Client base: High-net-worth individuals and institutions`);
  
  // Display service tier architecture
  console.log('\n🏛️  Financial Services Architecture:');
  
  console.log(`\n🏦 Private Banking Tier (Relationship Manager: Global Bank):`);
  console.log(`   • Service ID: ${privateBankingId.substring(0, 16)}...`);
  console.log(`   • Eligibility: KYC verification OR AML compliance`);
  console.log(`   • Client base: Alice Stevens (fully compliant)`);
  console.log(`   • Services: Wealth management, private lending, concierge banking`);
  
  console.log(`\n💼 Institutional Trading Desk (Relationship Manager: Global Bank):`);
  console.log(`   • Service ID: ${institutionalTradingId.substring(0, 16)}...`);
  console.log(`   • Eligibility: Accredited Investor OR AML compliance`);
  console.log(`   • Client base: Alice Stevens (AML), Charlie Davis (Accredited)`);
  console.log(`   • Services: Large-block trading, derivatives, structured products`);
  
  // Display client compliance profiles
  console.log('\n👥 Client Compliance Profiles:');
  
  console.log(`\n👩 Alice Stevens (Premium Client):`);
  console.log(`   • Compliance status: KYC verified ✅, AML compliant ✅`);
  console.log(`   • Service access: Private Banking ✅, Institutional Trading ✅`);
  console.log(`   • Client tier: Ultra-high-net-worth with full regulatory clearance`);
  
  console.log(`\n👨 Bob Wilson (Standard Client):`);
  console.log(`   • Compliance status: Unverified ❌`);
  console.log(`   • Service access: Basic banking only`);
  console.log(`   • Client tier: Retail customer requiring compliance verification`);
  
  console.log(`\n👤 Charlie Davis (Institutional Investor):`);
  console.log(`   • Compliance status: SEC Accredited Investor ✅`);
  console.log(`   • Service access: Institutional Trading ✅`);
  console.log(`   • Client tier: Qualified institutional buyer with trading privileges`);
  
  // Display account balances
  try {
    const accounts = [
      { name: 'Isabel Financial', wallet: isabelWallet, icon: '🏛️' },
      { name: 'RegulatorX', wallet: regulatorWallet, icon: '🏛️' },
      { name: 'Global Bank', wallet: bankOwnerWallet, icon: '🏦' },
      { name: 'Alice Stevens', wallet: aliceWallet, icon: '👩' },
      { name: 'Bob Wilson', wallet: bobWallet, icon: '👨' },
      { name: 'Charlie Davis', wallet: charlieWallet, icon: '👤' }
    ];
    
    console.log(`\n💰 Account Balances:`);
    for (const account of accounts) {
      const info = await client.request({
        command: "account_info",
        account: account.wallet.address,
        ledger_index: "validated"
      });
      console.log(`${account.icon} ${account.name}: ${ Number(dropsToXrp(info.result.account_data.Balance))} XRP`);
    }
  } catch (error) {
    console.log(`⚠️  Could not fetch account balances: ${error.message}`);
  }
  
  console.log(`\n🌐 Explore on Devnet:`);
  console.log(`🏛️ Isabel Financial: https://devnet.xrpl.org/accounts/${isabelWallet.address}`);
  console.log(`🏛️ RegulatorX: https://devnet.xrpl.org/accounts/${regulatorWallet.address}`);
  console.log(`🏦 Global Bank: https://devnet.xrpl.org/accounts/${bankOwnerWallet.address}`);
  console.log(`👩 Alice Stevens: https://devnet.xrpl.org/accounts/${aliceWallet.address}`);
  console.log(`👨 Bob Wilson: https://devnet.xrpl.org/accounts/${bobWallet.address}`);
  console.log(`👤 Charlie Davis: https://devnet.xrpl.org/accounts/${charlieWallet.address}`);
  
  console.log(`\n✨ Permissioned Domains Demo Completed Successfully!`);
  
  console.log('\n📚 What happened:');
  console.log('   1. ✅ Set up regulatory compliance infrastructure (KYC, AML, Accredited)');
  console.log('   2. ✅ Created Private Banking Tier with KYC requirements');
  console.log('   3. ✅ Verified automatic eligibility based on compliance status');
  console.log('   4. ✅ Modified tier criteria to accept multiple compliance types');
  console.log('   5. ✅ Created Institutional Trading Desk with different requirements');
  console.log('   6. ✅ Demonstrated multi-tier eligibility scenarios');
  console.log('   7. ✅ Showed service tier lifecycle management (create/modify/delete)');
  console.log('   8. ✅ Built complete financial services ecosystem');
  
  await client.disconnect();
};

main()
  .then(() => {
    console.log(`\n📖 Learn More:`);
    console.log(`   🔗 XLS-80 Permissioned Domains Specification: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0080-permissioned-domains `);
    console.log(`   🔗 XLS-70 On-Chain Credentials (prerequiste): https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0070-credentials`);
  })
  .catch((error) => {
    console.error(`\n💥 Error in main execution: ${error.message}`);
    console.error(error.stack);
  });