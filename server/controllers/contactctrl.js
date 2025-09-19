const Transaction = require('../models/Transaction');
const mongoose = require("mongoose");
const User = require('../models/userModel');
const BankBalance = require('../models/BankBalance');

const createContactTransaction = async (req, res) => {
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
            contact,
            transactionType,
            direction,
            isContactTransaction,
            relatedUsers,
            groupId,
            bankAccountId
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
        if ((transactionType === "expense" || (transactionType === "transfer" && direction === "sent")) &&
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
            isContactTransaction: isContactTransaction || false,
            bankAccount: bankAccountId,
            ...(groupId && { group: groupId })
        };

        // Add direction if it's a transfer
        if (transactionType === "transfer") {
            transactionData.direction = direction;
        }

        // Handle contact information if this is a personal transaction
        if (isContactTransaction && contact) {


            // Format phone number to match validation (+91 followed by 10 digits)
            let formattedPhone = contact.phone;
            if (formattedPhone) {
                // Remove all non-digit characters
                const digitsOnly = formattedPhone.replace(/\D/g, '');

                // If it starts with 91 and has 12 digits, keep as is
                if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
                    formattedPhone = `+${digitsOnly}`;
                }
                // If it has 10 digits, add +91 prefix
                else if (digitsOnly.length === 10) {
                    formattedPhone = `+91${digitsOnly}`;
                }
                // For other cases, try to make it valid
                else {
                    formattedPhone = `+91${digitsOnly.slice(-10)}`;
                }
            }

            transactionData.contact = {
                user: contact.user,
                firstName: contact.firstName,
                lastName: contact.lastName,
                phone: formattedPhone,
                avatar: contact.avatar,
                amount: parseFloat(amount)
            };

            // Handle related users if provided
            if (relatedUsers && relatedUsers.length > 0) {
                transactionData.relatedUsers = relatedUsers.map(user => ({
                    title: user.title,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                    amount: user.amount,
                    ...(user.avatar && { avatar: user.avatar })
                }));
            }

            // Handle receiver's account for both expense and transfer transactions
            if ((transactionType === "transfer" && direction === "sent") ||
                (transactionType === "expense" && relatedUsers && relatedUsers.length > 0)) {

                // Try different phone number formats
                const phoneVariants = [
                    formattedPhone,
                    formattedPhone.replace(/\D/g, ''),
                    formattedPhone.replace(/\D/g, '').slice(-10),
                    `+91${formattedPhone.replace(/\D/g, '').slice(-10)}`
                ];

                const receiver = await User.findOne({
                    phoneNumber: { $in: phoneVariants }
                });

                if (receiver) {


                    const receiverBankAccount = await BankBalance.findOne({ user: receiver._id, isPrimary: true });
                    if (receiverBankAccount) {


                        const receiverNewBalance = receiverBankAccount.currentBalance + parseFloat(amount);


                        try {
                            const updatedAccount = await BankBalance.findByIdAndUpdate(
                                receiverBankAccount._id,
                                {
                                    currentBalance: receiverNewBalance,
                                    updatedAt: new Date()
                                },
                                { new: true }
                            );


                            // Update receiver's balance
                            const updatedUser = await User.findByIdAndUpdate(
                                receiver._id,
                                { $inc: { balance: parseFloat(amount) } },
                                { new: true }
                            );

                        } catch (error) {
                            console.error('Error updating receiver account:', error);
                            throw error;
                        }
                    } else {
                        const allAccounts = await BankBalance.find({ user: receiver._id });

                    }
                } else {
                }
            }
        }

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
            } else if (transactionType === "transfer") {
                if (direction === "sent") {

                    // For sent transfers, subtract from sender's account
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

                    // Find receiver's bank account and add the amount

                    // Try different phone number formats
                    const phoneVariants = [
                        contact.phone,
                        contact.phone.replace(/\D/g, ''),
                        contact.phone.replace(/\D/g, '').slice(-10),
                        `+91${contact.phone.replace(/\D/g, '').slice(-10)}`
                    ];

                    const receiver = await User.findOne({
                        phoneNumber: { $in: phoneVariants }
                    });

                    if (receiver) {


                        const receiverBankAccount = await BankBalance.findOne({ user: receiver._id, isPrimary: true });
                        if (receiverBankAccount) {


                            const receiverNewBalance = receiverBankAccount.currentBalance + parseFloat(amount);

                            try {
                                const updatedAccount = await BankBalance.findByIdAndUpdate(
                                    receiverBankAccount._id,
                                    {
                                        currentBalance: receiverNewBalance,
                                        updatedAt: new Date()
                                    },
                                    { new: true }
                                );


                                // Update receiver's balance
                                const updatedUser = await User.findByIdAndUpdate(
                                    receiver._id,
                                    { $inc: { balance: parseFloat(amount) } },
                                    { new: true }
                                );

                            } catch (error) {
                                console.error('Error updating receiver account:', error);
                                throw error;
                            }
                        } else {
                            const allAccounts = await BankBalance.find({ user: receiver._id });

                        }
                    } else {
                    }
                } else if (direction === "received") {

                    // For received transfers, add to receiver's account
                    const newBalance = bankAccount.currentBalance + parseFloat(amount);
                    await BankBalance.findByIdAndUpdate(
                        bankAccountId,
                        {
                            currentBalance: newBalance,
                            updatedAt: new Date()
                        }
                    );

                    // Update receiver's balance
                    await User.findByIdAndUpdate(userId, {
                        $inc: { balance: parseFloat(amount) }
                    });
                    // Try different phone number formats
                    const phoneVariants = [
                        contact.phone,
                        contact.phone.replace(/\D/g, ''),
                        contact.phone.replace(/\D/g, '').slice(-10),
                        `+91${contact.phone.replace(/\D/g, '').slice(-10)}`
                    ];

                    const sender = await User.findOne({
                        phoneNumber: { $in: phoneVariants }
                    });

                    if (sender) {


                        const senderBankAccount = await BankBalance.findOne({ user: sender._id, isPrimary: true });
                        if (senderBankAccount) {


                            const senderNewBalance = senderBankAccount.currentBalance - parseFloat(amount);
                            await BankBalance.findByIdAndUpdate(
                                senderBankAccount._id,
                                {
                                    currentBalance: senderNewBalance,
                                    updatedAt: new Date()
                                }
                            );

                            // Update sender's balance
                            await User.findByIdAndUpdate(sender._id, {
                                $inc: { balance: -parseFloat(amount) }
                            });
                        } else {
                        }
                    } else {
                    }
                }
            }
        }

        // Before creating the transaction, add this validation
        if (groupId && !mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID format"
            });
        }

        res.status(transactionId ? 200 : 201).json({
            success: true,
            message: transactionId
                ? "Transaction updated successfully"
                : "Transaction created successfully",
            transaction
        });

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

const getContactTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const { contactNumber, groupId, direction } = req.query;

        if (!contactNumber) {
            return res.status(400).json({
                success: false,
                message: "Contact number is required"
            });
        }

        function normalizePhoneNumber(phone) {
            const digits = phone.replace(/\D/g, '');
            if (digits.length > 10) {
                if (digits.startsWith('91') && digits.length === 12) {
                    return digits.substring(2);
                }
                return digits.slice(-10);
            }
            return digits;
        }

        const normalizedContactNumber = normalizePhoneNumber(contactNumber);
        const normalizedUserNumber = normalizePhoneNumber(req.user.phoneNumber);

        // FIXED QUERY: Only show transactions between the specific user and contact
        const query = {
            isContactTransaction: true,
            $or: [
                // Transactions sent by current user TO the specific contact
                {
                    user: userId,
                    'contact.phone': { $regex: new RegExp(normalizedContactNumber + '$') }
                },
                // Transactions sent by the specific contact TO current user
                {
                    'contact.phone': { $regex: new RegExp(normalizedUserNumber + '$') },
                    // Find the user ID of the contact by their phone number
                    $expr: {
                        $and: [
                            { $ne: ['$user', userId] }, // Not sent by current user
                            // Additional check to ensure it's from the specific contact
                            // We'll verify this in the processing step
                        ]
                    }
                }
            ]
        };

        // Add groupId filter if provided
        if (groupId) {
            query.groupId = groupId;
        }

        // Add direction filter if provided
        if (direction === "sent") {
            query.user = userId;
            query['contact.phone'] = { $regex: new RegExp(normalizedContactNumber + '$') };
            delete query.$or;
        } else if (direction === "received") {
            query['contact.phone'] = { $regex: new RegExp(normalizedUserNumber + '$') };
            query.user = { $ne: userId };
            delete query.$or;
        }


        let transactions = await Transaction.find(query)
            .populate('user', 'phoneNumber firstName lastName')
            .populate('bankAccount', 'bankName accountType currentBalance _id')
            .sort({ createdAt: -1 });

        // Additional filtering to ensure we only get transactions between the specific contact and user
        transactions = transactions.filter(tx => {
            const senderPhone = normalizePhoneNumber(tx.user?.phoneNumber || '');
            const receiverPhone = normalizePhoneNumber(tx.contact?.phone || '');

            // Transaction from current user to contact
            const isFromUserToContact = (
                tx.user._id.toString() === userId.toString() &&
                receiverPhone === normalizedContactNumber
            );

            // Transaction from contact to current user
            const isFromContactToUser = (
                senderPhone === normalizedContactNumber &&
                receiverPhone === normalizedUserNumber
            );

            return isFromUserToContact || isFromContactToUser;
        });



        res.status(200).json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch transactions"
        });
    }
};

module.exports = { createContactTransaction, getContactTransactions };