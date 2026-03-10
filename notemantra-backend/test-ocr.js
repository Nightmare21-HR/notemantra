require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const TEST_IMAGE_PATH = 'test.jpg'; 

async function testOCR() {
    console.log("--- 🧪 Testing Azure OCR (Robust) ---");

    if (!fs.existsSync(TEST_IMAGE_PATH)) {
        console.error(`❌ Missing file: '${TEST_IMAGE_PATH}'`);
        return;
    }

    try {
        const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
        const endpoint = process.env.AZURE_VISION_ENDPOINT.replace(/\/$/, "") + "/";
        const apiUrl = `${endpoint}computervision/imageanalysis:analyze?api-version=2023-10-01&features=read`;

        console.log(`Sending request to: ${apiUrl}`);

        const response = await axios.post(apiUrl, imageBuffer, {
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY,
                'Content-Type': 'application/octet-stream'
            }
        });

        // DEBUG: Print top-level keys to be 100% sure
        console.log("Response Keys:", Object.keys(response.data));

        // FIX: Check for 'read' (New) OR 'readResult' (Old)
        const readData = response.data.read || response.data.readResult;

        if (readData) {
             // Sometimes text is in 'pages', sometimes in 'blocks' (depending on version)
             const pages = readData.pages || readData.blocks;

             if (pages && pages.length > 0) {
                console.log("✅ OCR SUCCESS! Found text structure.");
                
                // Extract lines safely
                const lines = pages[0].lines || [];
                const fullText = lines.map(l => l.content || l.text).join('\n');
                
                console.log("\n--- EXTRACTED TEXT ---");
                console.log(fullText);
                console.log("----------------------");
             } else {
                 console.log("❌ Found 'read' object, but no 'pages' or 'blocks' inside.");
             }
        } else {
            console.log("❌ Could not find 'read' or 'readResult' in response.");
        }

    } catch (error) {
        console.error("❌ Request Failed:", error.message);
        if (error.response) {
            console.error("Server Response:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

testOCR();