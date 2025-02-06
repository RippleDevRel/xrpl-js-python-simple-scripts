const xrpl = require("xrpl");

const XRPL_SERVER = "wss://s.altnet.rippletest.net:51233"; // XRPL Testnet server

// Configuration: Modify these values
const SOURCE_SEED = "sEdVCaL6T58qafGb52xQn82M4vWzDjx"; // 🔑 Replace with the source wallet seed
const DESTINATION_ADDRESS = "rnqpUDjYSjAG5YGhrHFbVXRg92GWgmgfow"; // 🎯 Destination wallet address
const AMOUNT_XRP = "1"; // 💰 Amount in XRP to send

async function sendTransaction() {
    console.log("⏳ Connecting to the XRPL network...");
    const client = new xrpl.Client(XRPL_SERVER);

    try {
        await client.connect();
        console.log("✅ Connected to the XRPL Testnet");

        // Load the source wallet from the seed
        const sourceWallet = xrpl.Wallet.fromSeed(SOURCE_SEED);
        console.log(`🔑 Wallet loaded: ${sourceWallet.address}`);

        // Check balance before the transaction
        const balanceResponse = await client.getXrpBalance(sourceWallet.address);
        console.log(`💰 Available balance: ${balanceResponse} XRP`);

        if (parseFloat(balanceResponse) < parseFloat(AMOUNT_XRP) + 0.000012) {
            console.error("❌ Insufficient balance (minimum balance + transaction fee required)");
            return;
        }
        const preDestBalance= await client.getXrpBalance(DESTINATION_ADDRESS);
        console.log(`💰 Destination Address Available balance: ${preDestBalance} XRP`);

        // Create the transaction
        const transaction = {
            TransactionType: "Payment",
            Account: sourceWallet.address,
            Destination: DESTINATION_ADDRESS,
            Amount: xrpl.xrpToDrops(AMOUNT_XRP), // Convert XRP to drops
        };

        console.log("📜 Preparing transaction...");
        const preparedTx = await client.autofill(transaction);
        const signedTx = sourceWallet.sign(preparedTx);
        console.log("✍️ Signed transaction: ", signedTx);

        console.log("🚀 Submitting transaction...");
        const txResponse = await client.submitAndWait(signedTx.tx_blob);

        // Check if the transaction was successful
        if (txResponse.result.meta.TransactionResult === "tesSUCCESS") {
            console.log("✅ Transaction successful!");
            console.log("🔹 Transaction Hash:", txResponse.result.hash);
        } else {
            console.error("❌ Transaction failed:", txResponse.result.meta.TransactionResult);
        }
        const actualBalance= await client.getXrpBalance(sourceWallet.address);
        console.log(`💰 Your Available balance updated : ${actualBalance} XRP`);
        const postDestBalance= await client.getXrpBalance(DESTINATION_ADDRESS);
        console.log(`💰 Destination Address Available balance updated: ${postDestBalance} XRP`);
    } catch (error) {
        console.error("🚨 Error:", error);
    } finally {
        // Disconnect from XRPL
        await client.disconnect();
        console.log("🔌 Disconnected from the XRPL");
    }
}

// Execute the transaction function
sendTransaction();
