// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, getCurrentUser, logout } = require('../controllers/authController');
const { getAuthMiddleware } = require('../middleware/auth');

// Get the appropriate auth middleware based on environment
const auth = getAuthMiddleware();

// Public route for user login validation
router.post('/login', login);

// Protected route to get current user
router.get('/me', auth, getCurrentUser);

// Route for logging out
router.post('/logout', auth, logout);

module.exports = router;