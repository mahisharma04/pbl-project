// server/middleware/auth.js
const admin = require('../config/firebase');
const User = require('../models/User');

// Middleware to verify Firebase token
const protect = async (req, res, next) => {
  try {
    // Get token from Authorization header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user exists in database
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    // If user doesn't exist in our database, create them
    if (!user) {
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        photoURL: decodedToken.picture || null,
        role: 'user' // Default role for new users
      });
    }

    // Add user to request object
    req.user = user;
    req.firebaseUser = decodedToken;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
  }
};

// For development mode - bypass authentication
const bypassAuth = async (req, res, next) => {
  try {
    // For development, find an existing user or create a test user
    let testUser = await User.findOne();
    if (!testUser) {
      testUser = await User.create({
        firebaseUid: 'dev-test-uid',
        email: 'test@example.com',
        name: 'Development Test User',
        role: 'user'
      });
    }
    req.user = testUser;
    console.log('Auth bypassed in development mode. Using test user:', testUser.name);
    next();
  } catch (error) {
    console.error('Bypass auth error:', error);
    next(error);
  }
};

// Middleware to authorize based on user role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `User role '${req.user.role}' is not authorized to access this route` 
      });
    }
    
    next();
  };
};

// Helper function to determine which auth middleware to use
const getAuthMiddleware = () => {
  const bypassAuthEnabled = process.env.NODE_ENV === 'development' && 
                           process.env.BYPASS_AUTH === 'true';
  
  if (bypassAuthEnabled) {
    console.log('Using bypass authentication middleware for development');
    return bypassAuth;
  } else {
    console.log('Using Firebase authentication middleware');
    return protect;
  }
};

module.exports = { protect, bypassAuth, getAuthMiddleware, authorize };