import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';

function App() {
    const [studentId, setStudentId] = useState(localStorage.getItem('studentId') || "");
    const [view, setView] = useState("login");

    const handleAuthSuccess = (id) => {
        setStudentId(id);
        localStorage.setItem('studentId', id);
    };

    if (!studentId) {
        return view === "login" ? 
            <Login onLogin={handleAuthSuccess} onSwitch={() => setView("signup")} /> :
            <Signup onLogin={handleAuthSuccess} onSwitch={() => setView("login")} />;
    }

    return <Dashboard studentId={studentId} onLogout={() => {
        setStudentId("");
        localStorage.clear();
    }} />;
}

export default App;