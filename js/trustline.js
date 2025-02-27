// Import the xrpl library
const xrpl = require("xrpl");

// Utils
function toHexCurrency(currency) {
    if (/^[A-F0-9]{40}$/.test(currency)) {
        return currency;
    }
    if (currency.length < 3 || currency.length > 6) {
        throw new Error("Currency code must be 3 to 6 characters long.");
    }
    let hex = Buffer.from(currency, "ascii").toString("hex").toUpperCase();
    return hex.padEnd(40, '0'); // Fill with 0 to achieve 160 bits
}

/**
 * Main function to:
 * 1. Connect to the XRPL Testnet.
 * 2. Generate a wallet and fund it with test XRP.
 * 3. Approve a trustline for the RLUSD token.
 */
async function main() {
    const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");

    try {
        // Step 1: Connect to the XRPL Testnet
        await client.connect();
        console.log("✅ Connected to the XRPL Testnet");

        // Step 2: Generate a new wallet
        const wallet = xrpl.Wallet.generate();
        console.log("🔑 Wallet generated:");
        console.log("  - Address:", wallet.address);
        console.log("  - Seed:", wallet.seed);

        // Step 3: Fund the wallet with test XRP
        const fundingResponse = await client.fundWallet(wallet);
        console.log("💰 Wallet funded with test XRP:");
        console.log("  - Balance:", fundingResponse.balance, "XRP");

        // Step 4: Approve a trustline for RLUSD
        const trustlineTx = {
            TransactionType: "TrustSet",
            Account: wallet.address,
            LimitAmount: {
                currency: toHexCurrency("RLUSD"),
                issuer: "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV", // RLUSD issuer address
                value: "1000000", // Maximum amount of RLUSD you trust (1 million in this case)
            },
        };

        // Sign and submit the trustline transaction
        console.log("📜 Preparing trustline transaction...");
        const preparedTx = await client.autofill(trustlineTx);
        const signedTx = wallet.sign(preparedTx);
        console.log("✍️ Signed transaction:", signedTx);

        console.log("🚀 Submitting transaction...");
        const txResponse = await client.submitAndWait(signedTx.tx_blob);

        if (txResponse.result.meta.TransactionResult === "tesSUCCESS") {
            console.log("✅ Trustline approved for RLUSD!");
            console.log("🔹 Transaction Hash:", txResponse.result.hash);
        } else {
            console.error("❌ Trustline transaction failed:", txResponse.result.meta.TransactionResult);
        }

    } catch (error) {
        console.error("🚨 Error:", error);
        process.exit(1); // Exit with a non-zero status code to indicate failure
    } finally {
        // Step 5: Disconnect from the XRPL
        await client.disconnect();
        console.log("🔌 Disconnected from the XRPL");
    }
}

// Execute the main function
main();
