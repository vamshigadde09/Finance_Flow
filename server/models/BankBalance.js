const mongoose = require("mongoose");

const BankBalanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User reference is required"],
        index: true
    },
    bankName: {
        type: String,
        required: [true, "Bank name is required"],
        trim: true,
        minlength: [2, "Bank name must be at least 2 characters"],
        maxlength: [100, "Bank name cannot exceed 100 characters"]
    },
    accountType: {
        type: String,
        required: [true, "Account type is required"],
        enum: ["savings", "checking"]
    },
    currentBalance: {
        type: Number,
        required: [true, "Current balance is required"],
        min: [0, "Current balance cannot be negative"],
        set: value => parseFloat(value.toFixed(2))
    },

    limitAmount: {
        type: Number,
        required: [true, "Minimum balance limit is required"],
        min: [0, "Limit amount cannot be negative"],
        set: value => parseFloat(value.toFixed(2))
    },
    personalLimitAmount: {
        type: Number,
        required: [true, "Personal limit amount is required"],
        min: [0, "Personal limit amount cannot be negative"],
        set: value => parseFloat(value.toFixed(2))
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    showInDashboard: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false,
    toJSON: {
        virtuals: true,
        getters: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    },
    toObject: { virtuals: true, getters: true }
});

// Virtual for available credit
BankBalanceSchema.virtual("availableCredit").get(function () {
    return parseFloat((this.limitAmount - this.currentBalance).toFixed(2));
});

// Indexes
BankBalanceSchema.index({ user: 1, isPrimary: 1 });
BankBalanceSchema.index({ user: 1, showInDashboard: 1 });

module.exports = mongoose.model("BankBalance", BankBalanceSchema);