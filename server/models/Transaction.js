const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  amount: Number,
  category: {
    type: String,
    enum: ["Housing", "Groceries", "Dining", "Transport", "Travel", "Entertainment", "Coffee", "Health", "Work", "Utilities", "Gifts", "Other"],
    default: "Other"
  },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  splitBetween: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },

  settlements: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    status: {
      type: String,
      enum: ["pending", "paid", "success", "reject"],
      default: "pending"
    },
    paidAt: Date,
    settledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    confirmedAt: Date,
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: String,
    // Track the original amount before any partial settlements
    originalAmount: Number,
    // Track settlement history for audit
    settlementHistory: [{
      status: {
        type: String,
        enum: ["pending", "paid", "success", "reject"]
      },
      changedAt: Date,
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reason: String
    }]
  }],

  splitType: {
    type: String,
    enum: ["even", "custom"],
    default: "even"
  },
  customAmounts: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
  }],
  singleStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "success"],
    default: "pending",
  },
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "success"],
    default: "pending",
  },
  notes: String,
  attachments: [{
    type: String, // URL or file path
    description: String
  }],
  tags: [String],
  recurring: {
    isRecurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
    },
    nextDueDate: Date,
    endDate: Date
  },
  reminders: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dueDate: Date,
    status: {
      type: String,
      enum: ["pending", "sent", "acknowledged"],
      default: "pending"
    }
  }],

  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isGroupTransaction: {
    type: Boolean,
    default: false
  },
  isPersonalTransaction: {
    type: Boolean,
    default: false
  },
  isContactTransaction: {
    type: Boolean,
    default: false
  },
  contact: {
    type: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: {
        type: String,
        required: function () { return this.isContactTransaction; }
      },
      firstName: {
        type: String,
        required: function () { return this.isContactTransaction; }
      },
      lastName: {
        type: String,
        required: function () { return this.isContactTransaction; }
      },
      avatar: {
        type: String,
        required: function () { return this.isContactTransaction; }
      },
      phone: {
        type: String,
        required: function () { return this.isContactTransaction; },
        match: [
          /^\+91\d{10}$/,
          "Please enter a valid Indian phone number with +91 prefix"
        ]
      },
      amount: Number,
      notes: String
    },
    required: false
  },
  transactionType: {
    type: String,
    enum: ["income", "expense", "transfer"],
    required: true
  },
  direction: {
    type: String,
    enum: ["sent", "received"],
    required: function () { return this.transactionType === "transfer"; }
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "success"],
    default: "pending"
  },
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BankBalance",
    required: false
  },
  request: {
    type: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      requestId: { type: mongoose.Schema.Types.ObjectId, ref: "Request" }
    },
    required: false
  },
  archived: { type: Boolean, default: false },
  syncStatus: {
    type: String,
    enum: ["synced", "pending", "error"],
    default: "synced"
  },
  transactionId: {
    type: String,
    unique: true,
    required: true,
    default: function () {
      // Generate a unique transaction ID with format: TXN + timestamp + random 4 digits
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `TXN${timestamp}${random}`;
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
transactionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Add indexes for better query performance
transactionSchema.index({ paidBy: 1, createdAt: -1 });
transactionSchema.index({ group: 1, createdAt: -1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ createdAt: 1 });
transactionSchema.index({ isContactTransaction: 1, user: 1 });
transactionSchema.index({ tags: 1 });
transactionSchema.index({ group: 1, paidBy: 1 });
transactionSchema.index({ group: 1, "customAmounts.user": 1 });
transactionSchema.index({ transactionId: 1 }, { unique: true });

module.exports = mongoose.model("Transaction", transactionSchema);