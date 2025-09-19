const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  amount: Number,
  category: {
    type: String,
    enum: ["Housing", "Groceries", "Dining", "Transport", "Travel", "Entertainment", "Coffee", "Health", "Work", "Utilities", "Gifts", "Other"],
    default: "Other"
  },
  notes: String,
  splitType: {
    type: String,
    enum: ["even", "custom"],
    default: "even"
  },
  transactionType: {
    type: String,
    enum: ["income", "expense", "transfer"],
    default: "expense"
  },
  direction: {
    type: String,
    enum: ["sent", "received"],
    required: function () { return this.transactionType === "transfer"; }
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true
  },
  splitBetween: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
templateSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Add indexes for better query performance
templateSchema.index({ group: 1, createdAt: -1 });
templateSchema.index({ createdBy: 1 });
templateSchema.index({ category: 1 });
templateSchema.index({ transactionType: 1 });

module.exports = mongoose.model("Template", templateSchema);


