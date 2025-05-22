const xrpl = require("xrpl");

async function depositRlusd(seed, rlusdAmount = "0.5") {
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
    
    // Define RLUSD details 💲
    const RLUSD_CURRENCY = "524C555344000000000000000000000000000000"; // RLUSD in Hex
    const RLUSD_ISSUER = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
    
    // Convert XRP amount to drops (to also deposit XRP)
    const xrpAmount = "1"; // 1 XRP to deposit as well
    const xrpDrops = xrpl.xrpToDrops(xrpAmount); // Convert to drops
    
    // Define the AMM deposit transaction 📥
    // For single asset deposit, use Flags: 524288 and remove Amount2 -> only Amount
    // For two asset deposit, use Flags: 1048576 and include both Amount and Amount2
    const transaction = {
        TransactionType: "AMMDeposit",
        Account: wallet.address,
        Asset: { currency: "XRP" },
        Asset2: {
            currency: RLUSD_CURRENCY,
            issuer: RLUSD_ISSUER
        },
        Amount: xrpDrops, // XRP amount in drops
        Amount2: {
            currency: RLUSD_CURRENCY,
            issuer: RLUSD_ISSUER,
            value: rlusdAmount
        },
        Flags: 1048576, // tfTwoAsset flag (to deposit both assets) or 524288 for single asset
        Fee: "10", 
        Sequence: sequence,
    };
    
    console.log("\n💰 === Depositing RLUSD + XRP to AMM ===");
    console.log(`📌 Account: ${wallet.address}`);
    console.log(`💵 RLUSD Amount: ${rlusdAmount} RLUSD`);
    console.log(`💎 XRP Amount: ${xrpAmount} XRP`);
    
    try {
        // Prepare and sign transaction ✍️
        const prepared = await client.autofill(transaction);
        const signed = wallet.sign(prepared);
        console.log("🔏 Transaction signed");
        
        // Submit transaction to XRPL 🔄
        const response = await client.submitAndWait(signed.tx_blob);
        
        if (response.result.meta.TransactionResult === "tesSUCCESS") {
            console.log("\n🎉 Deposit successful!");
            console.log(`🔗 Transaction hash: ${response.result.hash}`);
            return response;
        } else {
            console.log("\n❌ Deposit failed");
            console.log(`⚠️ Error: ${response.result.meta.TransactionResult}`);
            return response;
        }
    } catch (error) {
        console.error("\n🚨 Error making deposit:", error);
        throw error;
    } finally {
        // Disconnect from XRPL 🔌
        await client.disconnect();
        console.log("🔌 Disconnected from XRPL");
    }
}

(async () => {
    const seed = "sEd71CfChR48xigRKg5AJcarEcgFMPk"; // rMQpZ8VS2vWNqfLjLzMgJG6n4igMAYBJPQ
    const rlusdAmount = "0.5";
    try {
        await depositRlusd(seed, rlusdAmount);
    } catch (error) {
        console.error(`🚨 Final error: ${error.message}`);
    }
})();
