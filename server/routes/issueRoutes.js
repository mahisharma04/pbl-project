// routes/issueRoutes.js - Issue routes
const express = require('express');
const {
  getIssues,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  upvoteIssue
} = require('../controllers/issueController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all issues and create new issue
router
  .route('/')
  .get(getIssues)
  .post(protect, createIssue);

// Get, update, delete single issue
router
  .route('/:id')
  .get(getIssue)
  .put(protect, authorize('admin', 'worker'), updateIssue)
  .delete(protect, authorize('admin'), deleteIssue);

// Upvote an issue
router.post('/:id/upvote', protect, upvoteIssue);

module.exports = router;