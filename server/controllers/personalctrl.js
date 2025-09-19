const Transaction = require('../models/Transaction');
const mongoose = require("mongoose");
const User = require('../models/userModel');
const BankBalance = require('../models/BankBalance');

// Helper function to calculate ISO week number
function getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Helper function to calculate next due date for recurring transactions
function calculateNextDueDate(frequency) {
    const now = new Date();
    switch (frequency) {
        case 'daily':
            return new Date(now.setDate(now.getDate() + 1));
        case 'weekly':
            return new Date(now.setDate(now.getDate() + 7));
        case 'monthly':
            return new Date(now.setMonth(now.getMonth() + 1));
        case 'yearly':
            return new Date(now.setFullYear(now.getFullYear() + 1));
        default:
            return new Date(now.setMonth(now.getMonth() + 1));
    }
}

const createPersonalTransaction = async (req, res) => {
    try {
        const {
            title,
            description,
            amount,
            category,
            notes,
            tags,
            recurring,
            templateId,
            transactionType,
            bankAccountId,
            isPersonalTransaction
        } = req.body;

        const userId = req.user._id;
        const transactionId = req.params.id; // For updates

        // Validate required fields
        if (!title || !amount || !bankAccountId) {
            return res.status(400).json({
                success: false,
                message: "Title, amount, and bank account are required fields"
            });
        }

        // Verify bank account exists and belongs to the user
        const bankAccount = await BankBalance.findOne({
            _id: bankAccountId,
            user: userId
        });

        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                message: "Bank account not found or doesn't belong to user"
            });
        }

        // Check if there's sufficient balance for expense/transfer
        if ((transactionType === "expense") &&
            bankAccount.currentBalance < parseFloat(amount)) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance in the selected bank account"
            });
        }

        // Create/update transaction object
        const transactionData = {
            title,
            description,
            amount: parseFloat(amount),
            category: category || "Other",
            user: userId,
            paymentStatus: "success", // Default to success as we ask for confirmation in the UI
            notes,
            tags: tags || [],
            transactionType: transactionType || "expense",
            bankAccount: bankAccountId,
            isPersonalTransaction: isPersonalTransaction || true,
            isContactTransaction: false
        };

        // Handle recurring transactions
        if (recurring && recurring.isRecurring) {
            transactionData.recurring = {
                isRecurring: true,
                frequency: recurring.frequency || "monthly",
                nextDueDate: recurring.nextDueDate || calculateNextDueDate(recurring.frequency)
            };
        } else {
            transactionData.recurring = { isRecurring: false };
        }

        // If created from a template, reference it
        if (templateId) {
            transactionData.templateId = templateId;
        }

        let transaction;
        try {
            if (transactionId) {
                // Update existing transaction
                transaction = await Transaction.findByIdAndUpdate(
                    transactionId,
                    transactionData,
                    { new: true }
                );
            } else {
                // Create new transaction
                transaction = await Transaction.create(transactionData);

                // Update bank account balance
                if (transactionType === "expense") {
                    // For expense, subtract from sender's account
                    const newBalance = bankAccount.currentBalance - parseFloat(amount);
                    await BankBalance.findByIdAndUpdate(
                        bankAccountId,
                        {
                            currentBalance: newBalance,
                            updatedAt: new Date()
                        }
                    );

                    // Update sender's balance
                    await User.findByIdAndUpdate(userId, {
                        $inc: { balance: -parseFloat(amount) }
                    });
                } else if (transactionType === "income") {
                    const newBalance = bankAccount.currentBalance + parseFloat(amount);
                    await BankBalance.findByIdAndUpdate(
                        bankAccountId,
                        {
                            currentBalance: newBalance,
                            updatedAt: new Date()
                        }
                    );
                    // Optionally, update user's balance as well
                    await User.findByIdAndUpdate(userId, {
                        $inc: { balance: parseFloat(amount) }
                    });
                }
            }

            // Ensure isPersonalTransaction is set to true after successful transaction
            if (!transaction.isPersonalTransaction) {
                transaction.isPersonalTransaction = true;
                await transaction.save();
            }

            res.status(transactionId ? 200 : 201).json({
                success: true,
                message: transactionId
                    ? "Transaction updated successfully"
                    : "Transaction created successfully",
                transaction
            });
        } catch (error) {
            console.error("Error in transaction creation/update:", error);
            throw error;
        }
    } catch (error) {
        console.error("Error processing transaction:", error);

        // Handle validation errors specifically
        if (error.title === 'ValidationError') {
            const errors = {};
            for (let field in error.errors) {
                errors[field] = error.errors[field].message;
            }
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || "Failed to process transaction"
        });
    }
};

const getAllTransactions = async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch all transactions where the user is:
        // 1. The owner (user)
        // 2. The payer (paidBy)
        // 3. In splitBetween
        // 4. The group owner
        // 5. The contact receiver (contact.user)

        const query = {
            $or: [
                { user: userId },
                { paidBy: userId },
                { splitBetween: userId },
                // Only include group transactions where paidBy is user
                { $and: [{ isGroupTransaction: true }, { paidBy: userId }] },
                { 'contact.user': userId }
            ]
        };

        const transactions = await Transaction.find(query)
            .populate('group', 'name members')
            .populate('contact', 'firstName lastName phone avatar')
            .populate('user', 'firstName lastName phone avatar')
            .populate('bankAccount', 'bankName accountType currentBalance _id')
            .sort({ createdAt: -1 });


        const enrichedTransactions = transactions.map((tx, index) => {
            const createdAt = new Date(tx.createdAt);
            const enriched = {
                ...tx.toObject(),
                dateDetails: {
                    date: createdAt.toISOString().split('T')[0],
                    week: getISOWeekNumber(createdAt),
                    month: createdAt.getMonth() + 1,
                    year: createdAt.getFullYear(),
                }
            };


            return enriched;
        });

        const response = { transactions: enrichedTransactions };
        res.status(200).json(response);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const transaction = await Transaction.findByIdAndDelete(transactionId);
        res.status(200).json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
module.exports = {
    createPersonalTransaction,
    getAllTransactions,
    deleteTransaction
}

