require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require('openai');

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openaiClient = new OpenAI({ 
    apiKey: process.env.AZURE_OPENAI_API_KEY, 
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/v1`, 
    defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
});

// 1. GENERATE VECTOR (Embedding)
async function getVector(text) {
    try {
        const response = await openaiClient.embeddings.create({
            model: "text-embedding-ada-002", 
            input: text.substring(0, 8000).replace(/\n/g, ' '), 
        });
        return response.data[0].embedding;
    } catch (e) { return Array(1536).fill(0); }
}

// 2. MATHEMATICAL MATCHING (Cosine Similarity)
function findBestMatch(noteVector, syllabusChunks) {
    // Helper: Dot Product Math
    const cosineSim = (vecA, vecB) => {
        let dot = 0, magA = 0, magB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            magA += vecA[i] * vecA[i];
            magB += vecB[i] * vecB[i];
        }
        return (magA && magB) ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
    };

    // Safety check
    if (!syllabusChunks || syllabusChunks.length === 0) return { context: "", topScore: 0 };

    // Rank all chunks
    const ranked = syllabusChunks.map(chunk => ({
        content: chunk.content,
        score: chunk.vector ? cosineSim(noteVector, chunk.vector) : 0
    })).sort((a, b) => b.score - a.score);

    // Return top 3 matches and the top score
    return {
        context: ranked.slice(0, 3).map(r => r.content).join("\n\n"),
        topScore: ranked[0]?.score || 0
    };
}

// 3. GEMINI RAG GENERATION
async function generatePersonalizedGuide(noteText, syllabusContext) {
    console.log("   ✨ Asking Gemini...");
    
    // USE THIS EXACT MODEL NAME:
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 
    
    const prompt = `
    You are a Personalized AI Tutor. 
    SYLLABUS CONTEXT: """${syllabusContext}"""
    STUDENT NOTE TEXT: """${noteText}"""

    TASK:
    1. Match this note to a specific Unit (1-9) from the SYLLABUS CONTEXT.
    2. If the note mentions "Prevention", "Avoidance", or "Recovery", it belongs in UNIT 4: DEADLOCKS.
    3. Explain the note using the specific terms from that Unit.

    Return RAW JSON:
    {
        "detectedTopic": "Unit 4: Deadlocks",
        "explanation": "Summary grounded in the syllabus...",
        "quiz": ["Question 1", "Question 2"]
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // Remove Markdown formatting so JSON.parse works
        const cleanText = text.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanText);
    } catch (error) {
        console.error("AI Error:", error.message);
        return { detectedTopic: "Uncategorized", explanation: "AI Generation Failed.", quiz: [] };
    }
}

// NOTE: Do NOT export textToSpeech here. It is handled in server.js.
module.exports = { getVector, findBestMatch, generatePersonalizedGuide };