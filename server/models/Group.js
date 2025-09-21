// models/Group.js
const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  templates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Template"
  }],
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "success"],
    default: "pending",
  },
  isSettleUpMode: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isSettled: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "success"],
      default: "pending",
    },
    lastSettlementDate: {
      type: Date
    },
    settlementHistory: [{
      transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
      },
      amount: Number,
      date: Date,
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "success"],
        default: "pending"
      }
    }]
  }],
  doneTransaction: {
    type: Boolean,
    default: false,
  },
  // Archive functionality
  archivedBy: {
    type: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      archivedAt: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Update the updatedAt timestamp before saving
groupSchema.pre('save', function (next) {
  this.updatedAt = Date.now();

  // Ensure archivedBy field exists
  if (!this.archivedBy) {
    this.archivedBy = [];
  }

  next();
});

// Add indexes for better query performance
groupSchema.index({ createdBy: 1 });
groupSchema.index({ members: 1 });
groupSchema.index({ "archivedBy.userId": 1 }); // Index for archive queries

module.exports = mongoose.model("Group", groupSchema);
