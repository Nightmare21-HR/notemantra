require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testRealGemini() {
    console.log("\n--- 🧠 Testing Real Gemini API Connection ---");
    console.log(`Key: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + "..." : "MISSING"}`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // We will try these models in order until one works
    const modelsToProbe = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-pro"
    ];

    for (const modelName of modelsToProbe) {
        console.log(`\n👉 Probing model: "${modelName}"...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Explain Quantum Computing in 1 sentence.");
            const response = await result.response;
            const text = response.text();
            
            console.log(`✅ SUCCESS! The working model is: "${modelName}"`);
            console.log(`📝 Output: "${text}"`);
            
            // If we found a working model, stop testing
            return; 
        } catch (error) {
            console.log(`❌ Failed (${modelName}): ${error.message.split('[')[0]}`); // Print short error
        }
    }

    console.log("\n❌ CRITICAL: All models failed. Your API Key might be invalid or has no quota.");
}

testRealGemini();