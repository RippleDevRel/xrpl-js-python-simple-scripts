const xrpl = require("xrpl");

// Transaction Configuration
/**
 * 🔑 SOURCE_SEED: The secret seed of the sending wallet
 * 🎯 DESTINATION_ADDRESS: The XRP address receiving the payment
 * 💰 AMOUNT_RLUSD: The amount of RLUSD to send
 * 🏦 ISSUER_ADDRESS: The address of the RLUSD issuer
 */
const SOURCE_SEED = "sEd71CfChR48xigRKg5AJcarEcgFMPk"; // Replace with the source wallet seed
const DESTINATION_ADDRESS = "rNB4HFHi7Cqoz9Uv8x6JzBrn4xLBKeQLTt"; // Destination wallet address with RLUSD trustline enabled
const AMOUNT_RLUSD = "1"; // Amount in RLUSD to send
const ISSUER_ADDRESS = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV"; // RLUSD issuer address

/**
 * Sends RLUSD from one account to another on the XRP Ledger
 * 
 * This function connects to the XRPL, loads a wallet from seed,
 * prepares and submits a payment transaction for RLUSD tokens,
 * and verifies the transaction result.
 * 
 * @async
 * @function sendRLUSD
 * @returns {Promise<void>}
 */
async function sendRLUSD() {
    console.log("⏳ Connecting to the XRPL network...");
    const client= new xrpl.Client("wss://s.altnet.rippletest.net:51233");
    try {
        // Step 1: Connect to the XRPL
        await client.connect();
        console.log("✅ Connected to the XRPL Testnet");

        // Step 2: Load the source wallet from the seed
        const sourceWallet = xrpl.Wallet.fromSeed(SOURCE_SEED);
        console.log(`🔑 Wallet loaded: ${sourceWallet.address}`);
        
        // Step 3: Define currency code in hex (RLUSD)
        const CURRENCY_HEX = "524C555344000000000000000000000000000000"; // Hex for "RLUSD"
        
        // Step 4: Create the transaction
        console.log("\n🔄 TRANSACTION DETAILS");
        console.log("---------------------");
        console.log(`🔹 From:   ${sourceWallet.address}`);
        console.log(`🔹 To:     ${DESTINATION_ADDRESS}`);
        console.log(`🔹 Amount: ${AMOUNT_RLUSD} RLUSD`);
        console.log(`🔹 Issuer: ${ISSUER_ADDRESS}`);
        
        const transaction = {
            TransactionType: "Payment",
            Account: sourceWallet.address,
            Destination: DESTINATION_ADDRESS,
            Amount: {
                currency: CURRENCY_HEX,
                value: AMOUNT_RLUSD,
                issuer: ISSUER_ADDRESS
            }
        };

        // Step 5: Prepare, sign and submit the transaction
        console.log("\n📜 Preparing transaction...");
        const preparedTx = await client.autofill(transaction);
        const signedTx = sourceWallet.sign(preparedTx);
        console.log(`✍️ Transaction signed (Hash: ${signedTx.hash})`);

        console.log("🚀 Submitting transaction...");
        const txResponse = await client.submitAndWait(signedTx.tx_blob);

        // Step 6: Process transaction result
        const txResult = txResponse.result.meta.TransactionResult;
        if (txResult === "tesSUCCESS") {
            console.log("\n✅ TRANSACTION SUCCESSFUL");
            console.log("------------------------");
            console.log(`🔹 Transaction Hash: ${txResponse.result.hash}`);
        } else {
            console.error("\n❌ TRANSACTION FAILED");
            console.error("--------------------");
            console.error(`🔹 Result code: ${txResult}`);
            console.error(`🔹 Transaction Hash: ${txResponse.result.hash}`);
        }

    } catch (error) {
        console.error("\n🚨 ERROR OCCURRED");
        console.error("----------------");
        console.error(`🔹 Message: ${error.message}`);
        if (error.data) {
            console.error(`🔹 Details: ${JSON.stringify(error.data)}`);
        }
    } finally {
        // Step 7: Disconnect from XRPL
        await client.disconnect();
        console.log("\n🔌 Disconnected from the XRPL");
    }
}

// Execute the transaction function
console.log("🚀 Starting RLUSD payment process...");
sendRLUSD().then(() => {
    console.log("✨ Process completed!");
});