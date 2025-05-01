// config/firebase.js - Firebase Admin SDK setup

const admin = require('firebase-admin');

// Initialize Firebase Admin with different approaches based on available credentials
let firebaseConfig = {};

// Check if environment variable for service account exists
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  firebaseConfig = {
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  };
} else {
  // Try to load from file if it exists
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    firebaseConfig = {
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    };
  } catch (error) {
    // If no service account is available, use a placeholder for development
    console.warn('⚠️ No Firebase service account found. Authentication will not work properly.');
    console.warn('Please create a serviceAccountKey.json file or set FIREBASE_SERVICE_ACCOUNT env variable');
    
    // Initialize with application default credentials (won't work for auth but prevents crash)
    firebaseConfig = {
      // Use a minimal configuration to avoid crashing
      projectId: 'fix-my-city-4'
    };
  }
}

// Initialize Firebase Admin
admin.initializeApp(firebaseConfig);

module.exports = admin;