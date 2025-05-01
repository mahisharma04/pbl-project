// models/Comment.js - Comment model
const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  issue: {
    type: mongoose.Schema.ObjectId,
    ref: 'Issue',
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Please add a comment'],
    maxlength: [500, 'Comment cannot be more than 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Comment', CommentSchema);