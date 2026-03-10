require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OpenAI } = require('openai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openaiClient = new OpenAI({ 
    apiKey: process.env.AZURE_OPENAI_API_KEY, 
    baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/v1`, 
    defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
});

// 1. EMBEDDING
async function getVector(text) {
    try {
        const response = await openaiClient.embeddings.create({
            model: "text-embedding-ada-002", 
            input: text.substring(0, 8000).replace(/\n/g, ' '), 
        });
        return response.data[0].embedding;
    } catch (e) { return Array(1536).fill(0); }
}

// 2. MATCHING
function findBestMatch(noteVector, syllabusFiles) {
    let topScore = 0;
    let bestChunkContent = "";
    let matchedFile = "General_Notes";

    if (syllabusFiles && Array.isArray(syllabusFiles)) {
        syllabusFiles.forEach(file => {
            if (file.chunks && Array.isArray(file.chunks)) {
                file.chunks.forEach(chunk => {
                    const score = cosineSimilarity(noteVector, chunk.vector);
                    if (score > topScore) {
                        topScore = score;
                        bestChunkContent = chunk.content;
                        matchedFile = file.fileName;
                    }
                });
            }
        });
    }

    return { context: bestChunkContent, fileName: matchedFile, topScore: topScore };
}

function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB) return 0;
    const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return (magA && magB) ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

// 3. GENERATE (Professional Professor Mode)
async function generatePersonalizedGuide(noteText, syllabusContext, language = "English") {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are a University Professor.
    SYLLABUS CONTEXT: """${syllabusContext}"""
    STUDENT NOTE: """${noteText}"""
    
    TASK:
    1. Look at the SYLLABUS CONTEXT and find the EXACT Unit/Topic title this note belongs to.
    2. **STRICT RULE:** Do not invent a new topic name. Use the exact text from the syllabus.
    3. Explain the concept in **${language}** using professional HTML formatting.
    
    Output ONLY JSON:
    { 
      "detectedTopic": "EXACT_TOPIC_FROM_SYLLABUS", 
      "explanation": "...", 
      "quiz": ["..."] 
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            return JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
        }
        throw new Error("No JSON found");
    } catch (error) {
        return { 
            detectedTopic: "Uncategorized", 
            explanation: "I could not generate a professional explanation at this time.", 
            quiz: [] 
        };
    }
}
// ... keep existing code ...

// --- NEW FUNCTION: TRANSFORM TOPIC NOTES INTO MASTER GUIDE ---
async function generateTopicSummary(topicName, combinedNotesText) {
    console.log(`   ✨ Generating Master Guide for: ${topicName}...`);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const prompt = `
You are a strict University Professor.
TOPIC: "${topicName}"
RAW STUDENT NOTES: 
"""${combinedNotesText.substring(0, 20000)}""" 

TASK:
1. Analyze the "RAW STUDENT NOTES" provided above.
2. If the notes are empty, too short, or gibberish, return a JSON with "summary": "Insufficient data to generate summary." and an empty quiz.
3. **DO NOT USE OUTSIDE KNOWLEDGE.** Only summarize what is explicitly written in the notes.
4. If valid notes exist, synthesize them into a **Cohesive Master Study Guide** and create a **5-Question Quiz** based ONLY on those notes.

Output ONLY JSON:
{
    "summary": "<h1>Master Guide: ${topicName}</h1><p>...</p>",
    "quiz": ["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]
}
`;

    try {
        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        return JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
    } catch (error) {
        console.error("AI Transformer Error:", error);
        return { summary: "Could not generate summary.", quiz: [] };
    }
}

// UPDATE EXPORTS
module.exports = { getVector, findBestMatch, generatePersonalizedGuide, generateTopicSummary };