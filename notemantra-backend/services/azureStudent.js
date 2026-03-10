const { BlobServiceClient } = require("@azure/storage-blob");
const crypto = require('crypto');

// Setup Azure Connection
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient("notemantra-storage");

// --- HELPER: Stream to String ---
async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => chunks.push(data.toString()));
        readableStream.on("end", () => resolve(chunks.join("")));
        readableStream.on("error", reject);
    });
}

// --- AUTH 1: CHECK IF USER EXISTS ---
async function userExists(username) {
    try {
        const blobPath = `users/${username}.json`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
        return await blockBlobClient.exists();
    } catch (e) {
        return false;
    }
}

// --- AUTH 2: CREATE NEW USER (SIGNUP) ---
async function createUser(username, password) {
    const blobPath = `users/${username}.json`;
    const userData = { 
        username, 
        password, // For a real app, you would hash this
        joinedAt: new Date().toISOString() 
    };
    
    const dataBuffer = Buffer.from(JSON.stringify(userData));
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    
    await blockBlobClient.uploadData(dataBuffer, {
        blobHTTPHeaders: { blobContentType: "application/json" }
    });
    
    console.log(`👤 New student created: ${username}`);
    return userData;
}

// --- AUTH 3: VERIFY USER (LOGIN) ---
async function verifyUser(username, password) {
    const blobPath = `users/${username}.json`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
    
    if (!(await blockBlobClient.exists())) return null;

    const downloadResponse = await blockBlobClient.download(0);
    const downloaded = await streamToString(downloadResponse.readableStreamBody);
    const userData = JSON.parse(downloaded);

    // Basic password check
    return userData.password === password ? userData : null;
}

module.exports = {
    userExists,
    createUser,
    verifyUser
};