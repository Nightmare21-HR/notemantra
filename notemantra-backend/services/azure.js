const { BlobServiceClient } = require("@azure/storage-blob");
const axios = require('axios');
const fs = require('fs');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const crypto = require('crypto'); // Built-in Node module for hashing

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient("notemantra-storage");
// 1. UPLOAD
async function uploadToAzure(fileBuffer, blobPath, metadata = {}) {
    try {
        await containerClient.createIfNotExists({ access: 'blob' });
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
        await blockBlobClient.uploadData(fileBuffer, { metadata });
        return blockBlobClient.url;
    } catch (error) {
        console.error("❌ Azure Upload Error:", error.message);
        throw error;
    }
}

// 2. FETCH VECTORS
async function listSyllabusVectors(studentId) {
    const vectorData = [];
    try {
        const prefix = `${studentId}/syllabus-brains/`;
        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
            const downloadBlockBlobResponse = await blockBlobClient.download(0);
            const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);
            vectorData.push(JSON.parse(downloaded));
        }
        return vectorData;
    } catch (e) { return []; }
}

// 3. GET SYLLABUS LIST
async function getSyllabusList(studentId) {
    const subjects = [];
    try {
        const prefix = `${studentId}/syllabus-brains/`;
        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            const fileName = blob.name.split('/').pop();
            const subjectName = fileName.replace('.json', '').replace('.pdf', ''); 
            subjects.push(subjectName);
        }
        return subjects;
    } catch (e) { return []; }
}

// 4. GET TOPICS LIST
async function getTopicsList(studentId, syllabusName) {
    const topics = new Set();
    try {
        const cleanSyllabusName = syllabusName.replace('.pdf', '');
        const prefix = `${studentId}/${cleanSyllabusName}/`;
        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            const parts = blob.name.split('/');
            if (parts.length > 2) topics.add(parts[2]); 
        }
        return Array.from(topics);
    } catch (e) { return []; }
}

// 5. SEARCH NOTES
// 5. SEARCH NOTES (Filtered to show ONLY Images)
async function listNotesByTopic(studentId, syllabusName, topicName) {
    const notes = [];
    try {
        const cleanSyllabusName = syllabusName.replace('.pdf', '');
        const prefix = `${studentId}/${cleanSyllabusName}/${topicName}/`; 
        
        console.log(`🔎 Searching Azure Path: [${prefix}]`);

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            // FILTER: Skip .txt files and .json files
            // We only want images (jpg, png, jpeg) for the gallery
            if (!blob.name.endsWith('.txt') && !blob.name.endsWith('.json')) {
                const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
                notes.push({
                    url: blockBlobClient.url,
                    name: blob.name
                });
            }
        }
        return notes;
    } catch (e) { 
        console.error("Search Logic Error:", e.message);
        return []; 
    }
}
// 6. SPEECH SYNTHESIS (RESTORED!)
async function textToSpeech(text, outputFilePath) {
    return new Promise((resolve, reject) => {
        try {
            const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_SPEECH_REGION);
            speechConfig.speechSynthesisVoiceName = "en-IN-NeerjaNeural"; 
            
            const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputFilePath);
            const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
            
            // Log that we are starting
            console.log(`🗣️ Speaking ${text.length} characters...`);

            synthesizer.speakTextAsync(
                text,
                (result) => {
                    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                        console.log("✅ Audio Generation Complete.");
                        synthesizer.close();
                        resolve(true); // Success
                    } else {
                        console.error("❌ Audio Generation Cancelled:", result.errorDetails);
                        synthesizer.close();
                        resolve(false); // Failed but resolve to prevent crash
                    }
                },
                (error) => {
                    console.error("❌ Audio Generation Error:", error);
                    synthesizer.close();
                    resolve(false);
                }
            );
        } catch (e) { 
            console.error("TTS Critical Error:", e); 
            resolve(false); 
        }
    });
}

// HELPERS
async function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => chunks.push(data.toString()));
        readableStream.on("end", () => resolve(chunks.join("")));
        readableStream.on("error", reject);
    });
}

async function extractTextFromImage(filePath) {
    try {
        const imageBuffer = fs.readFileSync(filePath);
        const endpoint = process.env.AZURE_VISION_ENDPOINT.replace(/\/$/, "") + "/";
        const apiUrl = `${endpoint}computervision/imageanalysis:analyze?api-version=2023-10-01&features=read`;
        const response = await axios.post(apiUrl, imageBuffer, {
            headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY, 'Content-Type': 'application/octet-stream' }
        });
        if (response.data?.readResult?.blocks) {
            return response.data.readResult.blocks.flatMap(b => b.lines.map(l => l.text)).join(' ');
        }
        return "";
    } catch (error) { return ""; }
}

async function getTopicTexts(studentId, syllabusName, topicName) {
    let combinedText = "";
    try {
        const cleanSyllabusName = syllabusName.replace('.pdf', '');
        const prefix = `${studentId}/${cleanSyllabusName}/${topicName}/`;
        
        console.log(`📖 Reading notes from: ${prefix}`);

        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
            // We only want the text files, not the images
            if (blob.name.endsWith('.txt')) {
                const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
                const downloadResponse = await blockBlobClient.download(0);
                const textContent = await streamToString(downloadResponse.readableStreamBody);
                combinedText += textContent + "\n\n";
            }
        }
        return combinedText;
    } catch (e) {
        console.error("Error reading topic texts:", e.message);
        return "";
    }
}

// ... keep helper functions like streamToString ...
// --- CACHE SYSTEM (DUPLICATE CHECK) ---
// --- UPDATED CACHE SYSTEM (Student-Specific) ---
async function checkCache(studentId, fileBuffer) {
    try {
        const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
        // Path: studentId / cache / hash.json
        const cachePath = `${studentId}/cache/${hash}.json`;
        
        const blockBlobClient = containerClient.getBlockBlobClient(cachePath);
        if (await blockBlobClient.exists()) {
            console.log(`⚡ Cache Hit for ${studentId}!`);
            const downloadResponse = await blockBlobClient.download(0);
            const downloaded = await streamToString(downloadResponse.readableStreamBody);
            return JSON.parse(downloaded);
        }
    } catch (e) { console.error("Cache Check Error:", e.message); }
    return null;
}

async function saveCache(studentId, fileBuffer, data) {
    try {
        const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
        const cachePath = `${studentId}/cache/${hash}.json`;
        const dataBuffer = Buffer.from(JSON.stringify(data));
        
        await uploadToAzure(dataBuffer, cachePath, { type: 'analysis_cache' });
        console.log(`💾 Analysis cached in ${studentId}'s private folder.`);
    } catch (e) { console.error("Cache Save Error:", e.message); }
}
// UPDATE EXPORTS
module.exports = { 
    uploadToAzure, 
    listSyllabusVectors, 
    extractTextFromImage, 
    textToSpeech, // The Fixed Version
    getSyllabusList, 
    getTopicsList,
    listNotesByTopic,
    getTopicTexts,
    checkCache, // Exported
    saveCache   // Exported
};