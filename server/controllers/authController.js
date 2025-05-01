// server/controllers/authController.js
const User = require('../models/User');
const admin = require('../config/firebase');

// Login controller - validates the token and returns user info
const login = async (req, res) => {
  try {
    const { idToken, name } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'No ID token provided'
      });
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, picture } = decodedToken;
    
    // Find user by Firebase UID
    let user = await User.findOne({ firebaseUid: uid });
    
    // If user doesn't exist in our database, create them
    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        email: email,
        name: name || decodedToken.name || email.split('@')[0],
        photoURL: picture || null,
        role: 'user'
      });
    }
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    // User is already attached to request by auth middleware
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving user data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout - not much to do on server side with Firebase Auth
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = { login, getCurrentUser, logout };