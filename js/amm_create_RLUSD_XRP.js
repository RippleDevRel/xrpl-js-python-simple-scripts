const xrpl = require("xrpl");

async function createAmm(seed, tradingFee = 500) {
    // Connect to XRPL Testnet 🌐
    const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
    await client.connect();
    console.log("✅ Connected to XRPL Testnet");
    
    // Generate wallet from seed 🔑
    const wallet = xrpl.Wallet.fromSeed(seed);
    console.log(`🏦 Wallet Address: ${wallet.address}`);
    
    // Fetch account information 📜
    const accountInfo = await client.request({
        command: "account_info",
        account: wallet.address,
        ledger_index: "validated"
    });
    const sequence = accountInfo.result.account_data.Sequence;
    console.log(`🔢 Sequence: ${sequence}`);
    
    // Define the AMM creation transaction 📊
    const transaction = {
        TransactionType: "AMMCreate",
        Account: wallet.address,
        Amount: {
            currency: "524C555344000000000000000000000000000000", // RLUSD in Hex 💲
            issuer: "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV",
            value: "1",
        },
        Amount2: "10000000", // 10 XRP in drops 💰
        TradingFee: tradingFee,
        Fee: "2000000", // Transaction fee in drops 
        Flags: 2147483648, // FullyCanonicalSig 🚩
        Sequence: sequence,
    };
    
    console.log("\n🚀 === Creating AMM ===");
    console.log(`📌 Account: ${wallet.address}`);
    console.log("💵 RLUSD Amount: 1");
    console.log("💎 XRP Amount: 10");
    console.log(`📊 Trading Fee: ${tradingFee / 1000}%`);
    
    try {
        // Prepare and sign transaction ✍️
        const prepared = await client.autofill(transaction);
        const signed = wallet.sign(prepared);
        
        // Submit transaction to XRPL 🔄
        const response = await client.submitAndWait(signed.tx_blob);
        
        if (response.result.meta.TransactionResult === "tesSUCCESS") {
            console.log("\n🎉 AMM created successfully!");
            console.log(`🔗 Transaction hash: ${response.result.tx_json.hash}`);
            return response;
        } else {
            console.log("\n❌ AMM creation failed");
            console.log(`⚠️ Error: ${response.result.meta.TransactionResult}`);
            return response;
        }
    } catch (error) {
        console.error("\n🚨 Error creating AMM:", error);
        throw error;
    } finally {
        // Disconnect from XRPL 🔌
        await client.disconnect();
        console.log("🔌 Disconnected from XRPL");
    }
}

(async () => {
    const seed = "sEd71CfChR48xigRKg5AJcarEcgFMPk";
    try {
        await createAmm(seed, 500);
    } catch (error) {
        console.error(`🚨 Final error: ${error.message}`);
    }
})();
