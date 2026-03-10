// middleware/authMiddleware.js
const { userExists } = require('../services/azure');

const protect = async (req, res, next) => {
    const studentId = req.headers['x-student-id'];

    if (!studentId) {
        return res.status(401).json({ success: false, message: "No Student ID provided. Access denied." });
    }

    const exists = await userExists(studentId);
    if (!exists) {
        return res.status(401).json({ success: false, message: "Invalid session. Please login again." });
    }

    req.studentId = studentId; // Pass it to the next function
    next();
};

module.exports = { protect };