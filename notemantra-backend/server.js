require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const PDFParser = require("pdf2json");

// Import Services (Now including textToSpeech)
const { 
    uploadToAzure, 
    listSyllabusVectors, 
    extractTextFromImage, 
    textToSpeech,
    getSyllabusList, 
    getTopicsList, 
    listNotesByTopic,
    getTopicTexts,
    checkCache, 
    saveCache   
} = require('./services/azure');
const { getVector, findBestMatch, generatePersonalizedGuide, generateTopicSummary } = require('./services/ai');
const {signup,login}=require('./controllers/auth')
const app = express();
app.use(cors());
app.use(express.json());
// Serve audio files statically
app.use('/audio', express.static(path.join(__dirname, 'audio_output')));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('audio_output')) fs.mkdirSync('audio_output');
const upload = multer({ dest: 'uploads/' });

// --- ROUTE 1: UPLOAD SYLLABUS ---
app.post('/upload-syllabus', upload.single('pdfFile'), async (req, res) => {
    try {
        console.log("\n📚 Processing Syllabus...");
        const studentId = req.body.studentId || "default_student";
        const pdfParser = new PDFParser(null, 1);

        pdfParser.on("pdfParser_dataReady", async () => {
            const fullText = pdfParser.getRawTextContent().trim();
            const rawChunks = fullText.match(/[\s\S]{1,600}/g) || [];
            
            const processedChunks = await Promise.all(rawChunks.map(async (chunk) => ({
                content: chunk,
                vector: await getVector(chunk)
            })));

            const syllabusBrain = { fileName: req.file.originalname, chunks: processedChunks };
            const jsonBuffer = Buffer.from(JSON.stringify(syllabusBrain));
            const blobPath = `${studentId}/syllabus-brains/${req.file.originalname}.json`;
            await uploadToAzure(jsonBuffer, blobPath);
            
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.json({ success: true, message: "Syllabus Saved!" });
        });
        pdfParser.loadPDF(req.file.path);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ROUTE 2: PROCESS NOTE (With Speech) ---
app.post('/process-note', upload.single('noteImage'), async (req, res) => {
    try {
        const studentId = req.body.studentId || "default_student";
        const language = req.body.language || "English";

        // --- ADD THESE TWO LINES AT THE VERY TOP ---
        if (!req.file) return res.status(400).json({ error: "No image uploaded" });
        const imagePath = req.file.path; // This defines the missing variable
        // -------------------------------------------

        const fileBuffer = fs.readFileSync(imagePath);

        // 1. DUPLICATE CHECK (Cache)
        const cachedResult = await checkCache(studentId, fileBuffer);
        if (cachedResult) {
            console.log("⚡ Cache Hit!");
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath); // Now imagePath is defined!
            return res.json({ 
                success: true, 
                ...cachedResult, 
                cached: true 
            });
        }

        // 2. IF NOT CACHED, PROCESS NORMALLY
        const noteText = await extractTextFromImage(imagePath);
        console.log(`📝 Extracted: "${noteText.substring(0,30)}..."`);
        
        const noteVector = await getVector(noteText);
        const syllabusFiles = await listSyllabusVectors(studentId);
        const { context, fileName, topScore } = findBestMatch(noteVector, syllabusFiles);
        const aiResult = await generatePersonalizedGuide(noteText, context, language);

        // Sanitize
        const rawTopic = aiResult.detectedTopic || "Uncategorized";
        const detectedTopic = rawTopic
        .replace(/[^a-zA-Z0-9 \-_]/g, "") // Remove symbols
        .trim()
        .replace(/\s+/g, '_');
        const syllabusName = fileName ? fileName.replace('.json', '').replace('.pdf', '') : "General";
        
        // Uploads
        const blobPath = `${studentId}/${syllabusName}/${detectedTopic}/${Date.now()}-${req.file.originalname}`;
        const safeMetaTopic = (aiResult.detectedTopic || "Uncategorized").replace(/[^a-zA-Z0-9 \-_]/g, "");
        const azureUrl = await uploadToAzure(fileBuffer, blobPath, { topic: safeMetaTopic });

        const textBlobPath = `${studentId}/${syllabusName}/${detectedTopic}/${Date.now()}-text.txt`;
        const textBuffer = Buffer.from(noteText);
        await uploadToAzure(textBuffer, textBlobPath, { topic: safeMetaTopic });

        // 3. GENERATE SPEECH (With Clean Text)
        const cleanText = aiResult.explanation.replace(/<[^>]*>?/gm, ''); // Strip HTML
        const audioFile = `speech-${Date.now()}.wav`;
        const audioLocalPath = path.join(__dirname, 'audio_output', audioFile);
        
        await textToSpeech(cleanText, audioLocalPath);

        // 4. PREPARE RESPONSE DATA
        const responseData = {
            data: aiResult, 
            imageUrl: azureUrl, 
            audioUrl: `http://localhost:5000/audio/${audioFile}`, 
            matchScore: topScore
        };

        // 5. SAVE TO CACHE
        // We save the responseData so next time we can just return it!
        await saveCache(studentId, fileBuffer, responseData);

        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

        res.json({ success: true, ...responseData });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    }
});
// --- ROUTE 3: SEARCH ROUTES (Kept Same) ---
app.get('/get-syllabi', async (req, res) => {
    try {
        const subjects = await getSyllabusList(req.query.studentId || "default_student");
        res.json({ success: true, subjects });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/get-topics', async (req, res) => {
    try {
        const topics = await getTopicsList(req.query.studentId, req.query.syllabusName);
        res.json({ success: true, topics });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/search-notes', async (req, res) => {
    try {
        const notes = await listNotesByTopic(req.query.studentId, req.query.syllabusName, req.query.topic);
        res.json({ success: true, notes });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/summarize-topic', async (req, res) => {
    try {
        const { studentId, syllabusName, topic } = req.body;
        
        // 1. Get all text from all notes in this topic folder
        const allText = await getTopicTexts(studentId, syllabusName, topic);
        
        if (!allText) return res.json({ success: false, message: "No notes found to summarize." });

        // 2. Send to Gemini to transform into a Master Guide
        const result = await generateTopicSummary(topic, allText);
        
        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// Auth Routes
app.post('/auth/signup', signup);
app.post('/auth/login', login);
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Azure-Only Server running on port ${PORT}`));