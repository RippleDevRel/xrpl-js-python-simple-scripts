/**
 * XRPL XRP Payment Transaction Script
 * 
 * This script demonstrates how to send XRP from one account to another on the XRP Ledger.
 * It connects to the XRPL Testnet, verifies balances, sends the transaction, and confirms the results.
 */

const xrpl = require("xrpl");

// XRPL Network Configuration
const XRPL_SERVER = "wss://s.altnet.rippletest.net:51233"; // XRPL Testnet server

// Transaction Configuration
/**
 * 🔑 SOURCE_SEED: The secret seed of the sending wallet
 * 🎯 DESTINATION_ADDRESS: The XRP address receiving the payment
 * 💰 AMOUNT_XRP: The amount of XRP to send
 */
const SOURCE_SEED = "sEd7HWeVRiA5uLAUVe8PybGf5rmkUHP"; // Replace with the source wallet seed
const DESTINATION_ADDRESS = "rnqpUDjYSjAG5YGhrHFbVXRg92GWgmgfow"; // Destination wallet address
const AMOUNT_XRP = "1"; // Amount in XRP to send

/**
 * Sends XRP from one account to another on the XRP Ledger
 * 
 * This function connects to the XRPL, loads a wallet from seed,
 * checks balances, prepares and submits a payment transaction,
 * and verifies the updated balances afterward.
 * 
 * @async
 * @function sendTransaction
 * @returns {Promise<void>}
 */
async function sendTransaction() {
    console.log("⏳ Connecting to the XRPL network...");
    const client = new xrpl.Client(XRPL_SERVER);

    try {
        // Step 1: Connect to the XRPL
        await client.connect();
        console.log("✅ Connected to the XRPL Testnet");

        // Step 2: Load the source wallet from the seed
        const sourceWallet = xrpl.Wallet.fromSeed(SOURCE_SEED);
        console.log(`🔑 Wallet loaded: ${sourceWallet.address}`);

        // Step 3: Check initial balances
        console.log("\n📊 INITIAL BALANCES");
        console.log("-------------------");
        const sourceBalance = await client.getXrpBalance(sourceWallet.address);
        console.log(`💰 Source balance:      ${sourceBalance} XRP`);
        const destBalance = await client.getXrpBalance(DESTINATION_ADDRESS);
        console.log(`💰 Destination balance: ${destBalance} XRP`);

        // Step 4: Verify sufficient balance (amount + transaction fee)
        const minRequired = parseFloat(AMOUNT_XRP) + 0.000012; // Adding minimum transaction fee
        if (parseFloat(sourceBalance) < minRequired) {
            console.error(`❌ Insufficient balance: ${sourceBalance} XRP available, ${minRequired} XRP required`);
            return;
        }

        // Step 5: Create the transaction
        console.log("\n🔄 TRANSACTION DETAILS");
        console.log("---------------------");
        console.log(`🔹 From:   ${sourceWallet.address}`);
        console.log(`🔹 To:     ${DESTINATION_ADDRESS}`);
        console.log(`🔹 Amount: ${AMOUNT_XRP} XRP`);
        
        const transaction = {
            TransactionType: "Payment",
            Account: sourceWallet.address,
            Destination: DESTINATION_ADDRESS,
            Amount: xrpl.xrpToDrops(AMOUNT_XRP), // Convert XRP to drops (1 XRP = 1,000,000 drops)
        };

        // Step 6: Prepare, sign and submit the transaction
        console.log("\n📜 Preparing transaction...");
        const preparedTx = await client.autofill(transaction);
        const signedTx = sourceWallet.sign(preparedTx);
        console.log(`✍️ Transaction signed (Hash: ${signedTx.hash})`);

        console.log("🚀 Submitting transaction...");
        const txResponse = await client.submitAndWait(signedTx.tx_blob);

        // Step 7: Process transaction result
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

        // Step 8: Check updated balances
        console.log("\n📊 UPDATED BALANCES");
        console.log("------------------");
        const newSourceBalance = await client.getXrpBalance(sourceWallet.address);
        console.log(`💰 Source balance:      ${newSourceBalance} XRP (change: ${(parseFloat(newSourceBalance) - parseFloat(sourceBalance)).toFixed(6)} XRP)`);
        const newDestBalance = await client.getXrpBalance(DESTINATION_ADDRESS);
        console.log(`💰 Destination balance: ${newDestBalance} XRP (change: ${(parseFloat(newDestBalance) - parseFloat(destBalance)).toFixed(6)} XRP)`);

    } catch (error) {
        console.error("\n🚨 ERROR OCCURRED");
        console.error("----------------");
        console.error(`🔹 Message: ${error.message}`);
        if (error.data) {
            console.error(`🔹 Details: ${JSON.stringify(error.data)}`);
        }
    } finally {
        // Step 9: Disconnect from XRPL
        await client.disconnect();
        console.log("\n🔌 Disconnected from the XRPL");
    }
}

// Execute the transaction function
console.log("🚀 Starting XRP payment process...");
sendTransaction().then(() => {
    console.log("✨ Process completed!");
});