import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin, onSwitch }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5000/auth/login', { username, password });
            if (res.data.success) {
                onLogin(res.data.studentId);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                .nm-auth-root {
                    font-family: 'Sora', sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background-color: #07080f;
                    background-image:
                        radial-gradient(ellipse 70% 50% at 50% 0%, rgba(56, 100, 255, 0.13) 0%, transparent 60%),
                        radial-gradient(ellipse 40% 40% at 85% 85%, rgba(120, 60, 220, 0.08) 0%, transparent 60%);
                    padding: 20px;
                }

                .nm-auth-card {
                    width: 100%;
                    max-width: 420px;
                    background: rgba(255,255,255,0.025);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 24px;
                    padding: 44px 40px;
                    position: relative;
                    overflow: hidden;
                    animation: cardIn 0.5s cubic-bezier(0.22, 1, 0.36, 1);
                }

                @keyframes cardIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .nm-auth-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
                }

                .nm-auth-glow {
                    position: absolute;
                    top: -60px; left: 50%;
                    transform: translateX(-50%);
                    width: 200px; height: 120px;
                    background: radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 70%);
                    pointer-events: none;
                }

                .nm-auth-logo {
                    font-size: 1.55rem;
                    font-weight: 700;
                    letter-spacing: -0.03em;
                    background: linear-gradient(100deg, #7eb3ff 0%, #a78bfa 50%, #7eb3ff 100%);
                    background-size: 200%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: shimmer 4s linear infinite;
                    text-align: center;
                    margin-bottom: 6px;
                }

                @keyframes shimmer {
                    0%   { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }

                .nm-auth-tagline {
                    font-size: 0.72rem;
                    color: #475569;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    text-align: center;
                    font-weight: 500;
                    margin-bottom: 6px;
                }

                .nm-auth-divider {
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
                    margin: 24px 0;
                }

                .nm-auth-heading {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #f1f5f9;
                    letter-spacing: -0.01em;
                    text-align: center;
                    margin-bottom: 4px;
                }

                .nm-auth-sub {
                    font-size: 0.78rem;
                    color: #475569;
                    text-align: center;
                    margin-bottom: 28px;
                }

                .nm-auth-field {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 14px;
                }

                .nm-auth-label {
                    font-size: 0.7rem;
                    font-weight: 500;
                    color: #64748b;
                    letter-spacing: 0.07em;
                    text-transform: uppercase;
                }

                .nm-auth-input {
                    width: 100%;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.08);
                    background: rgba(0,0,0,0.3);
                    color: #e2e8f0;
                    font-family: 'Sora', sans-serif;
                    font-size: 0.875rem;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .nm-auth-input::placeholder { color: #334155; }
                .nm-auth-input:focus {
                    border-color: rgba(99,102,241,0.5);
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
                }

                .nm-auth-btn {
                    width: 100%;
                    padding: 13px;
                    margin-top: 8px;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
                    color: white;
                    font-family: 'Sora', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    letter-spacing: 0.01em;
                    transition: all 0.2s;
                    position: relative;
                    overflow: hidden;
                }
                .nm-auth-btn::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%);
                }
                .nm-auth-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 28px rgba(59,130,246,0.35);
                }
                .nm-auth-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

                .nm-spinner {
                    display: inline-block;
                    width: 13px; height: 13px;
                    border: 2px solid rgba(255,255,255,0.2);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                    margin-right: 8px;
                    vertical-align: middle;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                .nm-auth-switch {
                    display: block;
                    text-align: center;
                    margin-top: 22px;
                    font-size: 0.78rem;
                    color: #475569;
                }

                .nm-auth-switch-link {
                    color: #60a5fa;
                    cursor: pointer;
                    font-weight: 500;
                    transition: color 0.2s;
                    background: none;
                    border: none;
                    font-family: 'Sora', sans-serif;
                    font-size: inherit;
                    padding: 0;
                    display: inline;
                }
                .nm-auth-switch-link:hover { color: #93c5fd; }

                .nm-auth-badge {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    margin-bottom: 28px;
                    font-size: 0.68rem;
                    color: #10b981;
                    font-family: 'JetBrains Mono', monospace;
                }
                .nm-auth-dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: #10b981;
                    animation: pulse 2s ease-in-out infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%       { opacity: 0.4; transform: scale(0.7); }
                }
            `}</style>

            <div className="nm-auth-root">
                <div className="nm-auth-card">
                    <div className="nm-auth-glow"></div>

                    <div className="nm-auth-logo">NoteMantra AI</div>
                    <div className="nm-auth-tagline">Intelligent Study Companion</div>

                    <div className="nm-auth-divider"></div>

                    <div className="nm-auth-heading">Welcome back</div>
                    <div className="nm-auth-sub">Sign in to continue your session</div>

                    <div className="nm-auth-badge">
                        <span className="nm-auth-dot"></span>
                        secure login
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="nm-auth-field">
                            <label className="nm-auth-label">Username</label>
                            <input
                                type="text"
                                placeholder="Enter your username"
                                className="nm-auth-input"
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="nm-auth-field">
                            <label className="nm-auth-label">Password</label>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                className="nm-auth-input"
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="nm-auth-btn" disabled={loading}>
                            {loading ? <><span className="nm-spinner"></span>Verifying...</> : 'Sign In'}
                        </button>
                    </form>

                    <span className="nm-auth-switch">
                        New here?{' '}
                        <button className="nm-auth-switch-link" onClick={onSwitch}>
                            Create an account
                        </button>
                    </span>
                </div>
            </div>
        </>
    );
};

export default Login;
