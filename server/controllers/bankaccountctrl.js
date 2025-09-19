const BankBalance = require("../models/BankBalance");
const User = require("../models/userModel");
const mongoose = require("mongoose");

// Create a new bank account
const createBankAccount = async (req, res) => {
    const { bankName, accountType, currentBalance, limitAmount, personalLimitAmount, isPrimary, showInDashboard } = req.body;

    // Check if this is the first account for the user
    const existingAccounts = await BankBalance.find({ user: req.user._id });
    const isFirstAccount = existingAccounts.length === 0;

    // If this is the first account or explicitly set as primary, make it primary
    const shouldBePrimary = isFirstAccount || isPrimary;

    // If this account should be primary, update other accounts to not be primary
    if (shouldBePrimary) {
        await BankBalance.updateMany(
            { user: req.user._id, isPrimary: true },
            { isPrimary: false }
        );
    }

    // Create new bank account
    const bankAccount = await BankBalance.create({
        user: req.user._id,
        bankName,
        accountType,
        currentBalance,
        limitAmount,
        personalLimitAmount,
        isPrimary: shouldBePrimary,
        showInDashboard
    });

    // Fetch all accounts after creation to ensure consistency
    const updatedAccounts = await BankBalance.find({ user: req.user._id });

    res.status(201).json({
        success: true,
        data: bankAccount
    });
};

// Get all bank accounts for a user
const getBankAccounts = async (req, res) => {
    //console.log('Fetching bank accounts for user:', req.params.userId);
    const bankAccounts = await BankBalance.find({ user: req.params.userId }).lean();
    //console.log('Found bank accounts:', bankAccounts);

    res.status(200).json({
        success: true,
        count: bankAccounts.length,
        data: bankAccounts
    });
};
// Get balance tracker
const getBalanceTracker = async (req, res) => {
    const balanceTracker = await BankBalance.findOne({
        _id: req.params.id,
        user: req.user.id
    }).lean();

    if (!balanceTracker) {
        return res.status(404).json({
            success: false,
            message: "Balance tracker not found"
        });
    }

    res.status(200).json({ success: true, data: balanceTracker });
};
// Get primary bank account
const getPrimaryBankAccount = async (req, res) => {
    const primaryAccount = await BankBalance.findOne({
        user: req.user._id,
        isPrimary: true
    });

    res.status(200).json({
        success: true,
        data: primaryAccount || null
    });
};

// Set primary bank account
const setPrimaryBankAccount = async (req, res) => {
    const { bankAccountId } = req.params;

    // First unset all primary accounts
    await BankBalance.updateMany(
        { user: req.user._id, isPrimary: true },
        { isPrimary: false }
    );

    // Then set the new primary account
    const bankAccount = await BankBalance.findOneAndUpdate(
        { _id: bankAccountId, user: req.user._id },
        { isPrimary: true },
        { new: true }
    );

    if (!bankAccount) {
        return res.status(404).json({
            success: false,
            message: "Bank account not found"
        });
    }

    res.status(200).json({
        success: true,
        data: bankAccount
    });
};

// Unset primary bank account
const unsetPrimaryBankAccount = async (req, res) => {
    await BankBalance.updateMany(
        { user: req.user._id, isPrimary: true },
        { isPrimary: false }
    );

    res.status(200).json({
        success: true,
        message: "Primary account unset"
    });
};

// Update a bank account
const updateBankAccount = async (req, res) => {
    const { bankAccountId } = req.params;
    const { bankName, accountType, currentBalance, limitAmount, personalLimitAmount, isPrimary, showInDashboard } = req.body;

    let updateData = { bankName, accountType, currentBalance, limitAmount, personalLimitAmount, showInDashboard };

    // If isPrimary is being set to true, update other accounts to not be primary
    if (isPrimary) {
        await BankBalance.updateMany(
            { user: req.user._id, isPrimary: true },
            { isPrimary: false }
        );
        updateData.isPrimary = true;
    }

    const bankAccount = await BankBalance.findByIdAndUpdate(
        bankAccountId,
        updateData,
        { new: true }
    );

    if (!bankAccount) {
        return res.status(404).json({
            success: false,
            message: "Bank account not found"
        });
    }

    res.status(200).json({
        success: true,
        data: bankAccount
    });
};

// Delete a bank account
const deleteBankAccount = async (req, res) => {
    const { bankAccountId } = req.params;

    const bankAccount = await BankBalance.findByIdAndDelete(bankAccountId);

    if (!bankAccount) {
        return res.status(404).json({
            success: false,
            message: "Bank account not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Bank account deleted successfully"
    });
};

module.exports = {
    createBankAccount,
    getBankAccounts,
    getBalanceTracker,
    getPrimaryBankAccount,
    setPrimaryBankAccount,
    unsetPrimaryBankAccount,
    updateBankAccount,
    deleteBankAccount
};
