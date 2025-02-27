const xrpl = require('xrpl');

/**
 * Convert text to hex with proper padding
 * @param {string} text - The text to convert
 * @returns {string} - The hex representation
 */
function textToHex(text) {
  if (text.length > 20) {
    throw new Error("Text must be 20 characters or less");
  }
  // Convert to hex
  let hexText = '';
  for (let i = 0; i < text.length; i++) {
    hexText += text.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase();
  }
  // Pad with zeros to make it exactly 40 characters
  return hexText.padEnd(40, '0');
}

/**
 * Creates a trustline for a specific currency on XRPL testnet
 * 
 * @param {string} issuerAddress - The address of the token issuer
 * @param {string} currencyCode - The currency code (e.g., 'USD')
 * @param {string} limitAmount - The trust line limit amount (default: 1000000000)
 */
async function createTrustline(issuerAddress, currencyCode, limitAmount = "1000000000") {
  // Define the network client
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
  
  try {
    await client.connect();
    console.log("✅ Connected to the XRPL Testnet");
    
    // Generate a wallet using the testnet faucet
    const wallet = await client.fundWallet();
    console.log("💰 Wallet funded with test XRP");
    
    // Convert currency code to proper hex format
    let currencyHex;
    try {
      currencyHex = textToHex(currencyCode);
    } catch (error) {
      console.log(`🚨 Error: ${error.message}`);
      await client.disconnect();
      return;
    }
    
    // Prepare the trust set transaction
    const trustSetTx = {
      TransactionType: "TrustSet",
      Account: wallet.wallet.address,
      LimitAmount: {
        currency: currencyHex,
        issuer: issuerAddress,
        value: limitAmount
      }
    };
    
    console.log("\n🔗 === Creating Trustline ===");
    console.log(`  - Account: ${wallet.wallet.address}`);
    console.log(`  - Currency (original): ${currencyCode}`);
    console.log(`  - Currency (hex): ${currencyHex}`);
    console.log(`  - Issuer: ${issuerAddress}`);
    console.log(`  - Limit: ${limitAmount}`);
    
    // Submit and wait for validation
    console.log("🚀 Submitting transaction...");
    const response = await client.submitAndWait(trustSetTx, {
      wallet: wallet.wallet
    });
    
    // Check the result
    const txResult = response.result.meta.TransactionResult;
    
    if (txResult === "tesSUCCESS") {
      console.log("\n✅ Trustline created successfully!");
      console.log(`  - Transaction hash: ${response.result.hash}`);
      console.log(`  - Wallet Address: ${wallet.wallet.address}`);
      console.log(`  - Wallet Seed: ${wallet.wallet.seed}`);
    } else {
      console.log("\n❌ Failed to create trustline");
      console.log(`  - Error: ${txResult}`);
    }
  } catch (error) {
    console.log(`\n🚨 Error creating trustline: ${error.message}`);
  } finally {
    await client.disconnect();
    console.log("🔌 Disconnected from the XRPL");
  }
  
  console.log("==============================\n");
}

/**
 * Main function to execute the trustline creation
 */
async function main() {
  const issuerAddress = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
  const currencyCode = "RLUSD";
  
  console.log("🚀 Starting trustline creation process...");
  await createTrustline(issuerAddress, currencyCode);
  console.log("✨ Process completed!");
}

// Execute the main function
main().catch(error => {
  console.error("🚨 Fatal error:", error);
  process.exit(1);
});