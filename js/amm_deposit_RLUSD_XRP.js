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
    const currencyHex = "524C555344000000000000000000000000000000"; // RLUSD in Hex
    const issuer = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV";
    
    // Define the AMM deposit transaction 📥
    const transaction = {
        TransactionType: "AMMDeposit",
        Account: wallet.address,
        Amount: {
            currency: currencyHex,
            issuer: issuer,
            value: rlusdAmount,
        },
        Asset: {
            currency: currencyHex,
            issuer: issuer,
        },
        Asset2: {
            currency: "XRP",
        },
        Flags: 1048576, // tfSingleAsset 🚩 or tfTwoAsset if you want to deposit XRP to: 2097152
        Fee: "10", 
        Sequence: sequence,
    };
    
    console.log("\n💰 === Depositing RLUSD to AMM ===");
    console.log(`📌 Account: ${wallet.address}`);
    console.log(`💵 RLUSD Amount: ${rlusdAmount} RLUSD`);
    
    try {
        // Prepare and sign transaction ✍️
        const prepared = await client.autofill(transaction);
        const signed = wallet.sign(prepared);
        console.log("🔏 Transaction signed");
        // Submit transaction to XRPL 🔄
        const response = await client.submitAndWait(signed.tx_blob);
        
        if (response.result.meta.TransactionResult === "tesSUCCESS") {
            console.log("\n🎉 Deposit successful!");
            console.log(`🔗 Transaction hash: ${response.result.tx_json.hash}`);
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
    const seed = "sEd71CfChR48xigRKg5AJcarEcgFMPk";
    const rlusdAmount = "0.5";
    try {
        await depositRlusd(seed, rlusdAmount);
    } catch (error) {
        console.error(`🚨 Final error: ${error.message}`);
    }
})();
