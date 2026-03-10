// controllers/auth.js
const { userExists, createUser, verifyUser } = require('../services/azureStudent');

async function signup(req, res) {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Fields required" });

        const safeUser = username.toLowerCase().replace(/\s/g, '_');
        
        if (await userExists(safeUser)) {
            return res.status(400).json({ success: false, message: "Username already taken" });
        }

        await createUser(safeUser, password);
        res.status(201).json({ success: true, studentId: safeUser });
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
}

async function login(req, res) {
    try {
        const { username, password } = req.body;
        const safeUser = username.toLowerCase().replace(/\s/g, '_');

        const user = await verifyUser(safeUser, password);
        if (user) {
            res.json({ success: true, studentId: safeUser });
        } else {
            res.status(401).json({ success: false, message: "Invalid username or password" });
        }
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    }
}

module.exports = { signup, login };