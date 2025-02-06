// Import the xrpl library
const xrpl = require("xrpl");

/**
 * Main function to interact with the XRPL.
 * This function connects to the XRPL Testnet, generates a wallet,
 * funds it with test XRP, and disconnects.
 */
async function main() {
    // Step 1: Connect to the XRPL Testnet
    const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
    await client.connect();
    console.log("Connected to the XRPL Testnet");

    // Step 2: Generate a new wallet
    const wallet = xrpl.Wallet.generate();
    console.log("Wallet generated:");
    console.log("Address:", wallet.address); // XRPL address
    console.log("Seed:", wallet.seed); // Secret seed (keep this safe!)

    // Step 3: Fund the wallet with test XRP (only works on Testnet)
    const fundingResponse = await client.fundWallet(wallet);
    console.log("Wallet funded with test XRP:");
    console.log("Balance:", fundingResponse.balance); // Initial balance after funding

    // Step 4: Disconnect from the XRPL
    await client.disconnect();
    console.log("Disconnected from the XRPL");
}

// Execute the main function and handle errors
main().catch((error) => {
    console.error("Error:", error);
    process.exit(1); // Exit with a non-zero status code to indicate failure
});