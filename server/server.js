// server.js - Main entry point for the Fix My City backend

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

require('dotenv').config();

// Display environment info
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
  console.log('⚠️ Running in development mode with authentication bypassed');
}

// Route imports
const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');
const userRoutes = require('./routes/userRoutes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB().catch(err => {
  console.error('Failed to connect to database:', err.message);
  // Don't exit process in development to allow for troubleshooting
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  } else {
    console.warn('Continuing without database connection in development mode');
  }
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev')); // Logging

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/users', userRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({
    message: 'Fix My City API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Development route to check configuration
if (process.env.NODE_ENV === 'development') {
  const mongoose = require('mongoose');
  app.get('/api/config', (req, res) => {
    res.json({
      serverRunning: true,
      databaseConnected: mongoose.connection.readyState === 1,
      authBypass: process.env.BYPASS_AUTH === 'true',
      devUserRole: process.env.DEV_USER_ROLE || 'admin'
    });
  });
}

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Only exit in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});