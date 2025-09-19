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
  next();
});

// Add indexes for better query performance
groupSchema.index({ createdBy: 1 });
groupSchema.index({ members: 1 });

module.exports = mongoose.model("Group", groupSchema);
