// models/Issue.js - Issue model
const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: [
      'Roads',
      'Street Lights',
      'Water Supply',
      'Garbage',
      'Sewage',
      'Public Transport',
      'Electricity',
      'Parks',
      'Other'
    ]
  },
  location: {
    // GeoJSON Point
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    },
    address: {
      type: String,
      required: true
    }
  },
  photos: [
    {
      url: {
        type: String,
        required: true
      },
      caption: {
        type: String
      }
    }
  ],
  status: {
    type: String,
    enum: ['reported', 'under review', 'in progress', 'resolved', 'closed'],
    default: 'reported'
  },
  priority: {
    type: Number,
    default: 0
  },
  upvotes: [
    {
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  statusHistory: [
    {
      status: {
        type: String,
        required: true
      },
      notes: {
        type: String
      },
      updatedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

// Calculate priority based on upvotes and time
IssueSchema.pre('save', function(next) {
  // More upvotes and more recent issues get higher priority
  if (this.upvotes) {
    const upvoteCount = this.upvotes.length;
    const ageInHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
    
    // Simple algorithm: priority = upvotes - (age in hours / 10)
    // This means priority decreases by 1 for every 10 hours
    this.priority = upvoteCount - (ageInHours / 10);
  }
  
  // Update the updatedAt field
  this.updatedAt = Date.now();
  
  next();
});

module.exports = mongoose.model('Issue', IssueSchema);
