require('dotenv').config();
console.log("🚀 Script started..."); // If you don't see this, something is wrong with Node/Path

const { BlobServiceClient } = require('@azure/storage-blob');

async function runTest() {
    try {
        const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
        console.log("🔗 Connection String exists:", !!connStr);

        if (!connStr) throw new Error("Connection string is undefined! Check .env");

        const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
        console.log("⏳ Contacting Azure Storage...");

        // Try to list containers (Simplest live test)
        let iter = blobServiceClient.listContainers();
        let container = await iter.next();
        
        console.log("✅ Connection Successful! Found container:", container.value?.name || "None (but connected)");
    } catch (err) {
        console.error("❌ Caught Error:", err.message);
    }
}

runTest().then(() => console.log("🏁 Script finished."));