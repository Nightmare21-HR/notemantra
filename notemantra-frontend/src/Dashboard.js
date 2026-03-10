import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ studentId, onLogout }) => {
    // --- CORE STATES ---
    const [file, setFile] = useState(null);
    const [syllabusFile, setSyllabusFile] = useState(null);
    const [language, setLanguage] = useState("English");
    const [result, setResult] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    // --- SEARCH & TOPIC STATES ---
    const [availableSubjects, setAvailableSubjects] = useState([]); 
    const [selectedSubject, setSelectedSubject] = useState(""); 
    const [availableTopics, setAvailableTopics] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState("");
    const [foundNotes, setFoundNotes] = useState([]);

    // --- TRANSFORMER STATES ---
    const [summaryResult, setSummaryResult] = useState(null);
    const [generatingSummary, setGeneratingSummary] = useState(false);

    // --- AUTO-LOAD DATA ON MOUNT ---
    useEffect(() => { 
        if (studentId) {
            console.log(`📊 Dashboard active for: ${studentId}`);
            fetchSubjects(); 
        }
    }, [studentId]);

    useEffect(() => { 
        if (selectedSubject) fetchTopics(selectedSubject); 
    }, [selectedSubject]);

    // --- API HELPERS ---
    const fetchSubjects = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/get-syllabi?studentId=${studentId}`);
            if (res.data.success) setAvailableSubjects(res.data.subjects);
        } catch (err) { console.error("Error fetching subjects"); }
    };

    const fetchTopics = async (subject) => {
        try {
            const res = await axios.get(`http://localhost:5000/get-topics`, { params: { studentId, syllabusName: subject } });
            if (res.data.success) {
                setAvailableTopics(res.data.topics);
                setSelectedTopic(res.data.topics[0] || "");
            }
        } catch (err) { console.error("Error fetching topics"); }
    };

    // --- LOGIC HANDLERS ---
    const handleUploadSyllabus = async () => {
        if (!syllabusFile) return alert("⚠️ Select PDF");
        setUploading(true);
        const formData = new FormData();
        formData.append('pdfFile', syllabusFile);
        formData.append('studentId', studentId);
        try {
            await axios.post('http://localhost:5000/upload-syllabus', formData);
            alert("✅ Syllabus Linked!");
            fetchSubjects(); 
        } catch (err) { alert("❌ Upload Failed"); } finally { setUploading(false); }
    };

    const handleProcessNote = async () => {
        if (!file) return alert("⚠️ Select Note");
        setLoading(true);
        setResult(null);
        setAudioUrl(null); 
        const formData = new FormData();
        formData.append('noteImage', file);
        formData.append('studentId', studentId);
        formData.append('language', language);
        try {
            const res = await axios.post('http://localhost:5000/process-note', formData);
            setResult(res.data.data);
            setAudioUrl(`${res.data.audioUrl}?t=${new Date().getTime()}`);
            fetchTopics(selectedSubject); 
        } catch (err) { alert("❌ Analysis Failed"); } finally { setLoading(false); }
    };

    const handleSearch = async () => {
        if (!selectedSubject || !selectedTopic) return alert("Select Subject & Topic");
        try {
            const res = await axios.get(`http://localhost:5000/search-notes`, {
                params: { studentId, syllabusName: selectedSubject, topic: selectedTopic }
            });
            setFoundNotes(res.data.notes);
        } catch (err) { alert("❌ Search Error"); }
    };

    const handleGenerateSummary = async () => {
        if (!selectedSubject || !selectedTopic) return alert("Select Subject & Topic");
        setGeneratingSummary(true);
        setSummaryResult(null);
        try {
            const res = await axios.post('http://localhost:5000/summarize-topic', {
                studentId, syllabusName: selectedSubject, topic: selectedTopic
            });
            if (res.data.success) setSummaryResult(res.data.data);
        } catch (err) { alert("Generation Failed"); } finally { setGeneratingSummary(false); }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                .nm-root {
                    font-family: 'Sora', sans-serif;
                    background-color: #07080f;
                    min-height: 100vh;
                    color: #e2e8f0;
                    background-image:
                        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56, 100, 255, 0.12) 0%, transparent 60%),
                        radial-gradient(ellipse 40% 30% at 90% 80%, rgba(120, 60, 220, 0.07) 0%, transparent 60%);
                }

                .nm-wrapper {
                    max-width: 980px;
                    margin: 0 auto;
                    padding: 36px 24px 80px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                /* HEADER */
                .nm-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 28px;
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 18px;
                    backdrop-filter: blur(12px);
                }

                .nm-brand { display: flex; flex-direction: column; gap: 3px; }

                .nm-logo {
                    font-size: 1.35rem;
                    font-weight: 700;
                    letter-spacing: -0.03em;
                    background: linear-gradient(100deg, #7eb3ff 0%, #a78bfa 50%, #7eb3ff 100%);
                    background-size: 200%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shimmer 4s linear infinite;
                }

                @keyframes shimmer {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }

                .nm-tagline {
                    font-size: 0.72rem;
                    color: #475569;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    font-weight: 500;
                }

                .nm-profile {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .nm-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #3b82f6, #7c3aed);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                }

                .nm-student-info { display: flex; flex-direction: column; gap: 2px; }
                .nm-student-name { font-size: 0.82rem; font-weight: 600; color: #cbd5e1; }
                .nm-status {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.68rem;
                    color: #10b981;
                    font-family: 'JetBrains Mono', monospace;
                }
                .nm-dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: #10b981;
                    animation: pulse 2s ease-in-out infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                }

                .nm-divider-v {
                    width: 1px;
                    height: 32px;
                    background: rgba(255,255,255,0.08);
                }

                .nm-logout {
                    background: transparent;
                    border: 1px solid rgba(239,68,68,0.25);
                    color: #f87171;
                    font-family: 'Sora', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 500;
                    padding: 7px 14px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    letter-spacing: 0.02em;
                }
                .nm-logout:hover {
                    background: rgba(239,68,68,0.1);
                    border-color: rgba(239,68,68,0.5);
                }

                /* CARDS */
                .nm-card {
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 20px;
                    padding: 28px;
                    transition: border-color 0.3s;
                    position: relative;
                    overflow: hidden;
                }
                .nm-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                }
                .nm-card:hover { border-color: rgba(255,255,255,0.1); }

                .nm-card-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 24px;
                }

                .nm-card-icon {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    flex-shrink: 0;
                }

                .icon-blue { background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.2); }
                .icon-violet { background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.2); }
                .icon-amber { background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.2); }

                .nm-card-title {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #f1f5f9;
                    letter-spacing: -0.01em;
                }
                .nm-card-sub {
                    font-size: 0.72rem;
                    color: #475569;
                    margin-top: 2px;
                }

                /* FORM ELEMENTS */
                .nm-row {
                    display: flex;
                    gap: 14px;
                    flex-wrap: wrap;
                    align-items: flex-end;
                }

                .nm-field {
                    flex: 1;
                    min-width: 180px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .nm-label {
                    font-size: 0.72rem;
                    font-weight: 500;
                    color: #64748b;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                }

                .nm-input, .nm-select {
                    width: 100%;
                    padding: 11px 14px;
                    border-radius: 11px;
                    border: 1px solid rgba(255,255,255,0.08);
                    background: rgba(0,0,0,0.3);
                    color: #e2e8f0;
                    font-family: 'Sora', sans-serif;
                    font-size: 0.85rem;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    appearance: none;
                    -webkit-appearance: none;
                }
                .nm-input:focus, .nm-select:focus {
                    border-color: rgba(99,102,241,0.5);
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
                }
                .nm-input[type="file"] {
                    padding: 9px 14px;
                    cursor: pointer;
                    color: #64748b;
                    font-size: 0.8rem;
                }
                .nm-input[type="file"]::file-selector-button {
                    background: rgba(59,130,246,0.15);
                    border: 1px solid rgba(59,130,246,0.25);
                    color: #60a5fa;
                    padding: 5px 12px;
                    border-radius: 7px;
                    font-family: 'Sora', sans-serif;
                    font-size: 0.78rem;
                    cursor: pointer;
                    margin-right: 10px;
                    transition: background 0.2s;
                }
                .nm-input[type="file"]::file-selector-button:hover {
                    background: rgba(59,130,246,0.25);
                }

                /* SELECT arrow */
                .nm-select-wrap {
                    position: relative;
                }
                .nm-select-wrap::after {
                    content: '▾';
                    position: absolute;
                    right: 13px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #475569;
                    pointer-events: none;
                    font-size: 0.75rem;
                }
                .nm-select { padding-right: 32px; }
                .nm-select option { background: #0f172a; }

                /* BUTTONS */
                .nm-btn-primary {
                    padding: 11px 22px;
                    border-radius: 11px;
                    border: 1px solid rgba(59,130,246,0.3);
                    background: rgba(59,130,246,0.15);
                    color: #60a5fa;
                    font-family: 'Sora', sans-serif;
                    font-size: 0.84rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    white-space: nowrap;
                    letter-spacing: 0.01em;
                }
                .nm-btn-primary:hover:not(:disabled) {
                    background: rgba(59,130,246,0.25);
                    border-color: rgba(59,130,246,0.5);
                    box-shadow: 0 0 20px rgba(59,130,246,0.15);
                }
                .nm-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

                .nm-btn-full {
                    width: 100%;
                    padding: 13px;
                    margin-top: 16px;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
                    color: white;
                    font-family: 'Sora', sans-serif;
                    font-size: 0.88rem;
                    font-weight: 600;
                    cursor: pointer;
                    letter-spacing: 0.01em;
                    transition: all 0.2s;
                    position: relative;
                    overflow: hidden;
                }
                .nm-btn-full::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%);
                }
                .nm-btn-full:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 24px rgba(59,130,246,0.3);
                }
                .nm-btn-full:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

                .nm-btn-ghost {
                    flex: 1;
                    padding: 11px 18px;
                    border-radius: 11px;
                    border: 1px solid rgba(255,255,255,0.07);
                    background: rgba(255,255,255,0.03);
                    color: #94a3b8;
                    font-family: 'Sora', sans-serif;
                    font-size: 0.84rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .nm-btn-ghost:hover { background: rgba(255,255,255,0.06); color: #cbd5e1; border-color: rgba(255,255,255,0.12); }

                .nm-btn-magic {
                    flex: 1;
                    padding: 11px 18px;
                    border-radius: 11px;
                    border: 1px solid rgba(245,158,11,0.25);
                    background: rgba(245,158,11,0.1);
                    color: #fbbf24;
                    font-family: 'Sora', sans-serif;
                    font-size: 0.84rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    letter-spacing: 0.01em;
                }
                .nm-btn-magic:hover:not(:disabled) {
                    background: rgba(245,158,11,0.18);
                    border-color: rgba(245,158,11,0.4);
                    box-shadow: 0 0 20px rgba(245,158,11,0.12);
                }
                .nm-btn-magic:disabled { opacity: 0.45; cursor: not-allowed; }

                /* LOADING STATE */
                .nm-spinner {
                    display: inline-block;
                    width: 13px;
                    height: 13px;
                    border: 2px solid rgba(255,255,255,0.2);
                    border-top-color: currentColor;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                    margin-right: 8px;
                    vertical-align: middle;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* RESULT BOX */
                .nm-result {
                    margin-top: 24px;
                    padding: 22px;
                    background: rgba(0,0,0,0.3);
                    border-radius: 14px;
                    border: 1px solid rgba(255,255,255,0.06);
                    animation: fadeUp 0.4s ease;
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .nm-result-label {
                    font-size: 0.68rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #475569;
                    font-weight: 600;
                    margin-bottom: 14px;
                    font-family: 'JetBrains Mono', monospace;
                }

                .nm-result audio {
                    width: 100%;
                    margin-bottom: 16px;
                    border-radius: 8px;
                    height: 40px;
                    filter: invert(1) hue-rotate(180deg);
                    opacity: 0.85;
                }

                .nm-result-content {
                    color: #94a3b8;
                    font-size: 0.875rem;
                    line-height: 1.8;
                }

                .nm-summary-result {
                    margin-top: 20px;
                    padding: 22px;
                    background: rgba(0,0,0,0.3);
                    border-radius: 14px;
                    border: 1px solid rgba(245,158,11,0.15);
                    border-left: 3px solid rgba(245,158,11,0.5);
                    animation: fadeUp 0.4s ease;
                }

                .nm-summary-label {
                    font-size: 0.68rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: #d97706;
                    font-weight: 600;
                    margin-bottom: 14px;
                    font-family: 'JetBrains Mono', monospace;
                }

                /* NOTES GRID */
                .nm-notes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 14px;
                    margin-top: 22px;
                    animation: fadeUp 0.4s ease;
                }

                .nm-note-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 12px;
                    overflow: hidden;
                    transition: all 0.2s;
                }
                .nm-note-card:hover {
                    border-color: rgba(255,255,255,0.14);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                }

                .nm-note-img {
                    width: 100%;
                    height: 95px;
                    object-fit: cover;
                    display: block;
                }

                .nm-note-footer {
                    padding: 8px 10px;
                }

                .nm-note-link {
                    font-size: 0.68rem;
                    color: #60a5fa;
                    font-family: 'JetBrains Mono', monospace;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: color 0.2s;
                }
                .nm-note-link:hover { color: #93c5fd; }

                /* SECTION SEPARATOR */
                .nm-sep {
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
                    margin: 4px 0;
                }
            `}</style>

            <div className="nm-root">
                <div className="nm-wrapper">

                    {/* HEADER */}
                    <header className="nm-header">
                        <div className="nm-brand">
                            <div className="nm-logo">NoteMantra AI</div>
                            <div className="nm-tagline">Intelligent Study Companion</div>
                        </div>
                        <div className="nm-profile">
                            <div className="nm-avatar">
                                {studentId ? studentId.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div className="nm-student-info">
                                <div className="nm-student-name">{studentId}</div>
                                <div className="nm-status">
                                    <span className="nm-dot"></span>
                                    active session
                                </div>
                            </div>
                            <div className="nm-divider-v"></div>
                            <button onClick={onLogout} className="nm-logout">Sign out</button>
                        </div>
                    </header>

                    {/* 1. KNOWLEDGE BASE */}
                    <div className="nm-card">
                        <div className="nm-card-header">
                            <div className="nm-card-icon icon-blue">📚</div>
                            <div>
                                <div className="nm-card-title">Knowledge Base</div>
                                <div className="nm-card-sub">Upload your syllabus to enable topic mapping</div>
                            </div>
                        </div>
                        <div className="nm-row">
                            <div className="nm-field">
                                <label className="nm-label">Syllabus PDF</label>
                                <input
                                    type="file"
                                    onChange={(e) => setSyllabusFile(e.target.files[0])}
                                    className="nm-input"
                                    accept="application/pdf"
                                />
                            </div>
                            <button
                                onClick={handleUploadSyllabus}
                                className="nm-btn-primary"
                                disabled={uploading}
                                style={{marginBottom: '0', alignSelf: 'flex-end', padding: '11px 22px'}}
                            >
                                {uploading ? <><span className="nm-spinner"></span>Training...</> : 'Link Syllabus'}
                            </button>
                        </div>
                    </div>

                    {/* 2. ANALYZE NOTE */}
                    <div className="nm-card">
                        <div className="nm-card-header">
                            <div className="nm-card-icon icon-violet">✨</div>
                            <div>
                                <div className="nm-card-title">Analyze Handwritten Note</div>
                                <div className="nm-card-sub">Upload an image of your note for AI-powered explanation</div>
                            </div>
                        </div>
                        <div className="nm-row">
                            <div className="nm-field" style={{flex: '0 0 160px', minWidth: '140px'}}>
                                <label className="nm-label">Language</label>
                                <div className="nm-select-wrap">
                                    <select
                                        className="nm-select"
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                    >
                                        <option>English</option>
                                        <option>Hindi</option>
                                        <option>Spanish</option>
                                    </select>
                                </div>
                            </div>
                            <div className="nm-field">
                                <label className="nm-label">Note Image</label>
                                <input
                                    type="file"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    className="nm-input"
                                    accept="image/*"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleProcessNote}
                            className="nm-btn-full"
                            disabled={loading}
                        >
                            {loading ? <><span className="nm-spinner"></span>Analyzing your note...</> : 'Process & Explain'}
                        </button>

                        {result && (
                            <div className="nm-result">
                                <div className="nm-result-label">↳ AI Analysis</div>
                                {audioUrl && (
                                    <audio controls autoPlay>
                                        <source src={audioUrl} type="audio/wav" />
                                    </audio>
                                )}
                                <div className="nm-result-content" dangerouslySetInnerHTML={{ __html: result.explanation }} />
                            </div>
                        )}
                    </div>

                    {/* 3. ARCHIVE & GUIDE */}
                    <div className="nm-card">
                        <div className="nm-card-header">
                            <div className="nm-card-icon icon-amber">🔍</div>
                            <div>
                                <div className="nm-card-title">Archive & Master Guide</div>
                                <div className="nm-card-sub">Browse saved notes or generate a comprehensive topic summary</div>
                            </div>
                        </div>

                        <div className="nm-row" style={{marginBottom: '18px'}}>
                            <div className="nm-field">
                                <label className="nm-label">Syllabus</label>
                                <div className="nm-select-wrap">
                                    <select
                                        className="nm-select"
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                    >
                                        <option value="">Choose syllabus...</option>
                                        {availableSubjects.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="nm-field">
                                <label className="nm-label">Topic</label>
                                <div className="nm-select-wrap">
                                    <select
                                        className="nm-select"
                                        value={selectedTopic}
                                        onChange={(e) => setSelectedTopic(e.target.value)}
                                        disabled={!selectedSubject}
                                    >
                                        <option value="">Choose topic...</option>
                                        {availableTopics.map(topic => (
                                            <option key={topic} value={topic}>{topic}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="nm-row">
                            <button onClick={handleSearch} className="nm-btn-ghost">
                                View Notes
                            </button>
                            <button onClick={handleGenerateSummary} className="nm-btn-magic" disabled={generatingSummary}>
                                {generatingSummary
                                    ? <><span className="nm-spinner"></span>Generating...</>
                                    : '✦ Create Master Guide'
                                }
                            </button>
                        </div>

                        {summaryResult && (
                            <div className="nm-summary-result">
                                <div className="nm-summary-label">✦ Master Guide</div>
                                <div className="nm-result-content" dangerouslySetInnerHTML={{ __html: summaryResult.summary }} />
                            </div>
                        )}

                        {foundNotes.length > 0 && (
                            <div className="nm-notes-grid">
                                {foundNotes.map((note, i) => (
                                    <div key={i} className="nm-note-card">
                                        <img src={note.url} alt="note" className="nm-note-img" />
                                        <div className="nm-note-footer">
                                            <a href={note.url} target="_blank" rel="noreferrer" className="nm-note-link">
                                                ↗ View full
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </>
    );
};

export default Dashboard;
