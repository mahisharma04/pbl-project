// controllers/issueController.js - Issue controller
const Issue = require('../models/Issue');
const User = require('../models/User');

// @desc    Get all issues
// @route   GET /api/issues
// @access  Public
exports.getIssues = async (req, res, next) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude (these will be used for other functionality)
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = Issue.find(JSON.parse(queryStr))
      .populate({
        path: 'createdBy',
        select: 'name'
      })
      .populate({
        path: 'assignedTo',
        select: 'name'
      });

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      // Default sort by priority (descending) and createdAt (newest first)
      query = query.sort('-priority -createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Issue.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const issues = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: issues.length,
      pagination,
      data: issues
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single issue
// @route   GET /api/issues/:id
// @access  Public
exports.getIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate({
        path: 'createdBy',
        select: 'name'
      })
      .populate({
        path: 'assignedTo',
        select: 'name'
      })
      .populate({
        path: 'statusHistory.updatedBy',
        select: 'name'
      });

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: `Issue not found with id of ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new issue
// @route   POST /api/issues
// @access  Private
exports.createIssue = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;

    // Create initial status history entry
    req.body.statusHistory = [{
      status: 'reported',
      notes: 'Issue reported by citizen',
      updatedBy: req.user.id
    }];

    const issue = await Issue.create(req.body);

    res.status(201).json({
      success: true,
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update issue
// @route   PUT /api/issues/:id
// @access  Private (Admin/Worker only)
exports.updateIssue = async (req, res, next) => {
  try {
    let issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: `Issue not found with id of ${req.params.id}`
      });
    }

    // Make sure only admin/worker can update most fields
    if (req.user.role !== 'admin' && req.user.role !== 'worker') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this issue'
      });
    }

    // If status is being updated, add to status history
    if (req.body.status && req.body.status !== issue.status) {
      const statusHistoryEntry = {
        status: req.body.status,
        notes: req.body.statusNotes || `Status updated to ${req.body.status}`,
        updatedBy: req.user.id
      };

      // Add new status to history array
      if (!issue.statusHistory) {
        issue.statusHistory = [];
      }
      
      issue.statusHistory.push(statusHistoryEntry);
      
      // Remove statusNotes from the body as it's not a field in our schema
      delete req.body.statusNotes;
    }

    // Update the issue
    issue = await Issue.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete issue
// @route   DELETE /api/issues/:id
// @access  Private (Admin only)
exports.deleteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: `Issue not found with id of ${req.params.id}`
      });
    }

    // Make sure only admin can delete
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this issue'
      });
    }

    await issue.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upvote an issue
// @route   POST /api/issues/:id/upvote
// @access  Private
exports.upvoteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: `Issue not found with id of ${req.params.id}`
      });
    }

    // Check if the user already upvoted this issue
    const alreadyUpvoted = issue.upvotes.find(
      upvote => upvote.user.toString() === req.user.id.toString()
    );

    if (alreadyUpvoted) {
      // Remove upvote if already upvoted
      issue.upvotes = issue.upvotes.filter(
        upvote => upvote.user.toString() !== req.user.id.toString()
      );
    } else {
      // Add upvote
      issue.upvotes.push({ user: req.user.id });
    }

    await issue.save();

    res.status(200).json({
      success: true,
      data: issue
    });
  } catch (error) {
    next(error);
  }
};