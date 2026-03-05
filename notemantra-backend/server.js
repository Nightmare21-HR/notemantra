require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const { BlobServiceClient } = require("@azure/storage-blob");
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sdk = require("microsoft-cognitiveservices-speech-sdk");

const app = express();
app.use(cors());
app.use(express.json());

// Serve the 'audio_output' folder
app.use('/audio', express.static(path.join(__dirname, 'audio_output')));

// Ensure folders exist
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('audio_output')) fs.mkdirSync('audio_output');

const upload = multer({ dest: 'uploads/' });

// --- 1. MONGODB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB Atlas"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Schema
const NoteSchema = new mongoose.Schema({
    originalText: String,
    imageUrl: String,
    subject: String,
    explanation: String,
    quiz: Array,
    vectorEmbedding: [Number], // 1536 dimensions
    createdAt: { type: Date, default: Date.now }
});
const Note = mongoose.model('Note', NoteSchema);

// --- 2. CLIENTS ---

// Google Gemini (For Explanation/Quiz)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Azure OpenAI (For Embeddings ONLY)
const openaiClient = new OpenAI({ 
    apiKey: process.env.AZURE_OPENAI_API_KEY, 
    // IMPORTANT: Azure requires base URL ending in /openai/v1
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/v1`, 
    defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
});

// --- HELPER 1: UPLOAD TO AZURE ---
async function uploadToAzureBlob(filePath) {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient("notes");
        await containerClient.createIfNotExists({ access: 'blob' });
        
        const blobName = `note-${Date.now()}.jpg`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadFile(filePath);
        return blockBlobClient.url;
    } catch (error) {
        console.error("Storage Error:", error.message);
        return "https://via.placeholder.com/150"; 
    }
}

// --- HELPER 2: AZURE OCR ---
async function extractTextFromImage(filePath) {
    try {
        const imageBuffer = fs.readFileSync(filePath);
        const endpoint = process.env.AZURE_VISION_ENDPOINT.endsWith('/') 
            ? process.env.AZURE_VISION_ENDPOINT 
            : `${process.env.AZURE_VISION_ENDPOINT}/`;

        // Change '2023-02-01-preview' to '2023-10-01'
        const apiUrl = `${endpoint}computervision/imageanalysis:analyze?api-version=2023-10-01&features=read`;

        const response = await axios.post(apiUrl, imageBuffer, {
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY,
                'Content-Type': 'application/octet-stream'
            }
        });
        return response.data.readResult?.content || "No text detected.";
    } catch (error) {
        console.error("OCR Error:", error.message);
        return "Manual override: Text extraction failed."; 
    }
}

// --- HELPER 3: GEMINI 1.5 FLASH (Chat) ---
async function generateExplanation(text) {
    try {
        console.log("   ✨ Calling Gemini 1.5 Flash...");
        // Change 'gemini-1.5-flash' to 'gemini-1.5-flash-001'
       const model = genAI.getGenerativeModel({ 
    model: "gemini-pro", // <--- USE THIS (It works everywhere)
    // Note: gemini-pro 1.0 doesn't support "responseMimeType", so we remove that config
});

      const prompt = `You are a Tutor. Analyze: "${text.substring(0, 5000)}".
Return a valid JSON object (no markdown, no backticks) with:
{
  "explanation": "3-sentence summary",
  "subject": "Short topic title",
  "quiz": [{ "q": "Question", "options": ["A","B","C","D"], "ans": "Correct Option" }, { ... }]
}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text());
    } catch (error) {
        console.error("❌ Gemini Error:", error.message);
        return { explanation: "AI service busy.", subject: "General", quiz: [] };
    }
}

// --- HELPER 4: AZURE SPEECH ---
async function textToSpeech(text, outputFileName) {
    return new Promise((resolve) => {
        const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_SPEECH_REGION);
        speechConfig.speechSynthesisVoiceName = "en-IN-NeerjaNeural"; 
        const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputFileName);
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
        synthesizer.speakTextAsync(text, 
            () => { synthesizer.close(); resolve(); }, 
            () => { synthesizer.close(); resolve(); });
    });
}

// --- HELPER 5: AZURE EMBEDDINGS (text-embedding-ada-002) ---
async function getVectorEmbedding(text) {
    try {
        console.log("   🔢 Calling Azure Embeddings...");
        const response = await openaiClient.embeddings.create({
            // Explicitly using your deployment name here
            model: "text-embedding-ada-002", 
            input: text.substring(0, 8000), 
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error("❌ Embedding Error:", error.message);
        return Array.from({ length: 1536 }, () => Math.random());
    }
}

// --- MAIN ROUTE ---
app.post('/process-note', upload.single('noteImage'), async (req, res) => {
    try {
        console.log("\n--- Processing Note ---");
        const imagePath = req.file.path;

        // 1. OCR & Upload
        const [azureUrl, transcribedText] = await Promise.all([
            uploadToAzureBlob(imagePath),
            extractTextFromImage(imagePath)
        ]);

        // 2. Gemini Chat & Azure Embedding
        const [aiResult, vector] = await Promise.all([
            generateExplanation(transcribedText),
            getVectorEmbedding(transcribedText)
        ]);

        // 3. Save to MongoDB
        await new Note({
            originalText: transcribedText,
            imageUrl: azureUrl,
            subject: aiResult.subject,
            explanation: aiResult.explanation,
            quiz: aiResult.quiz,
            vectorEmbedding: vector
        }).save();

        // 4. Speech
        const audioFileName = `speech-${Date.now()}.wav`;
        const audioPath = path.join(__dirname, 'audio_output', audioFileName);
        await textToSpeech(aiResult.explanation, audioPath);

        fs.unlinkSync(imagePath);

        res.json({
            success: true,
            data: aiResult,
            audioUrl: `http://localhost:5000/audio/${audioFileName}`
        });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Hybrid Server running on port ${PORT}`));