// Push notifications helper using Expo
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

async function sendPushToUser(userId, title, body, data = {}) {
    try {
        const user = await User.findById(userId).select('expoPushToken');
        if (!user || !user.expoPushToken || !Expo.isExpoPushToken(user.expoPushToken)) {
            return;
        }
        const messages = [{
            to: user.expoPushToken,
            sound: 'default',
            title,
            body,
            data,
        }];
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
        }
    } catch (e) {
        console.error('[Push] sendPushToUser error:', e?.message || e);
    }
}
const express = require("express");
const mongoose = require("mongoose");
const Group = require("../models/Group");
const User = require("../models/userModel");
const Transaction = require("../models/Transaction");
const Template = require("../models/Template");
const BankBalance = require("../models/BankBalance");

//create group
const createGroup = async (req, res) => {
    try {
        const { name, phoneNumbers, createdBy } = req.body;

        // 1. Validate input
        if (!name || !phoneNumbers || !createdBy) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: name, phoneNumbers, or createdBy",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(createdBy)) {
            return res.status(400).json({
                success: false,
                message: "Invalid creator ID format",
            });
        }

        // 2. Normalize and validate phone numbers (support both +91XXXXXXXXXX and XXXXXXXXXX)
        const normalizedNumbers = phoneNumbers
            .map((phone) => {
                const digits = phone.toString().replace(/\D/g, "");
                return digits.slice(-10);
            })
            .filter((phone) => phone.length === 10);

        if (normalizedNumbers.length !== phoneNumbers.length) {
            return res.status(400).json({
                success: false,
                message: "All phone numbers must contain at least 10 digits",
                invalidNumbers: phoneNumbers.filter(
                    (_, index) => normalizedNumbers[index] === undefined
                ),
            });
        }

        // 3. Verify creator exists
        const creator = await User.findById(createdBy);
        if (!creator) {
            return res.status(404).json({
                success: false,
                message: "Creator user not found",
            });
        }

        // 4. Find registered users (support both +91XXXXXXXXXX and XXXXXXXXXX)
        const phoneVariants = normalizedNumbers.reduce((arr, num) => {
            arr.push(num, `+91${num}`);
            return arr;
        }, []);

        const users = await User.find({
            phoneNumber: { $in: phoneVariants }
        }).select('_id firstName lastName phoneNumber avatar');

        // 5. Check for unregistered numbers
        const registeredPhones = users.map((user) => user.phoneNumber.replace(/\D/g, "").slice(-10));
        const unregisteredNumbers = normalizedNumbers.filter(
            (num) => !registeredPhones.includes(num)
        );

        if (unregisteredNumbers.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Some contacts are not registered",
                unregisteredNumbers: unregisteredNumbers,
            });
        }

        // 6. Prepare member IDs
        const memberObjects = users.map(user => ({
            _id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            phoneNumber: user.phoneNumber,
            avatar: user.avatar || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random&format=png`
        }));
        // Include creator if not already in members
        if (!memberObjects.some(m => m._id.equals(createdBy))) {
            const creatorDetails = {
                _id: creator._id,
                name: `${creator.firstName} ${creator.lastName}`,
                phoneNumber: creator.phoneNumber,
                avatar: creator.avatar || `https://ui-avatars.com/api/?name=${creator.firstName}+${creator.lastName}&background=random&format=png`
            };
            memberObjects.push(creatorDetails);
        }

        // 7. Create the group
        const groupData = {
            name,
            members: memberObjects,
            createdBy: {
                _id: creator._id,
                name: `${creator.firstName} ${creator.lastName}`,
                phoneNumber: creator.phoneNumber,
                avatar: creator.avatar || `https://ui-avatars.com/api/?name=${creator.firstName}+${creator.lastName}&background=random&format=png`
            },
            archivedBy: []
        };

        const newGroup = await Group.create(groupData);

        // 8. Update user documents
        await User.updateMany(
            { _id: { $in: memberObjects } },
            { $addToSet: { groups: newGroup._id } }
        );

        // 9. Return success response
        res.status(201).json({
            success: true,
            group: {
                ...newGroup.toObject(),
                archivedBy: newGroup.archivedBy || []
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};

//get user groups
const getUserGroups = async (req, res) => {
    const { userId } = req.params;

    try {

        // Validate userId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format"
            });
        }

        const objectId = new mongoose.Types.ObjectId(userId);
        // Find groups where user is either creator or member, but exclude archived groups
        const groups = await Group.find({
            $or: [
                { createdBy: objectId },
                { members: objectId }
            ],
            // Exclude groups that are archived by this user
            archivedBy: {
                $not: {
                    $elemMatch: {
                        userId: objectId
                    }
                }
            }
        })
            .populate({
                path: "members",
                select: "firstName lastName avatar phoneNumber"
            })
            .populate({
                path: "createdBy",
                select: "firstName lastName avatar phoneNumber"
            })
            .lean();


        if (!groups || groups.length === 0) {
            return res.status(200).json({
                success: true,
                groups: [],
                message: "No groups found for this user."
            });
        }

        const formattedGroups = groups.map((group) => {
            // Debug log for each group's members

            return {
                _id: group._id,
                name: group.name,
                createdAt: group.createdAt,
                createdBy: {
                    _id: group.createdBy._id,
                    name: `${group.createdBy.firstName} ${group.createdBy.lastName}`,
                    phone: group.createdBy.phoneNumber,
                    avatar: group.createdBy.avatar || `https://ui-avatars.com/api/?name=${group.createdBy.firstName}+${group.createdBy.lastName}&background=random&format=png`
                },
                members: group.members.map((member) => ({
                    _id: member._id,
                    name: `${member.firstName} ${member.lastName}`,
                    phone: member.phoneNumber,
                    avatar: member.avatar || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}&background=random&format=png`
                })),
                memberCount: group.members.length,
            };
        });

        res.status(200).json({
            success: true,
            groups: formattedGroups
        });
    } catch (error) {
        console.error("Error in getUserGroups:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user groups",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

//create group transaction
const createGroupTransaction = async (req, res) => {
    try {
        const {
            title,
            description,
            amount,
            category,
            paidBy,
            splitBetween,
            group,
            splitType,
            customAmounts,
            notes,
            tags,
            templateId,
            singleStatus = "pending",
            settlements = [],
            bankAccountId,
            isGroupTransaction = true
        } = req.body;

        // Validate required fields with detailed logging
        const missingFields = [];
        if (!title) missingFields.push('title');
        if (!amount) missingFields.push('amount');
        if (!paidBy) missingFields.push('paidBy');
        if (!group) missingFields.push('group');
        if (!splitBetween) missingFields.push('splitBetween');
        if (!bankAccountId) missingFields.push('bankAccountId');


        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                missingFields: missingFields
            });
        }

        // Additional validation for paidBy
        if (!mongoose.Types.ObjectId.isValid(paidBy)) {
            return res.status(400).json({
                success: false,
                message: "Invalid paidBy ID format"
            });
        }

        // Verify paidBy user exists and is a member of the group
        const paidByUser = await User.findById(paidBy);
        if (!paidByUser) {
            return res.status(404).json({
                success: false,
                message: "Paid by user not found"
            });
        }

        // Verify group exists and paidBy user is a member
        const groupExists = await Group.findOne({
            _id: group,
            members: paidBy
        });

        if (!groupExists) {
            return res.status(404).json({
                success: false,
                message: "Group not found or paidBy user is not a member"
            });
        }

        // Validate amounts
        if (splitType === "custom" && (!customAmounts || customAmounts.length === 0)) {
            return res.status(400).json({
                success: false,
                message: "Custom amounts are required for custom split"
            });
        }


        // Verify bank account exists and belongs to the user
        const bankAccount = await BankBalance.findOne({
            _id: bankAccountId,
            user: req.user._id
        });
        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                message: "Bank account not found or doesn't belong to user"
            });
        }
        // Check if there's sufficient balance
        if (bankAccount.currentBalance < parseFloat(amount)) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance in the selected bank account"
            });
        }
        // Calculate amounts per user based on split type
        const amountPerUser = splitType === "even"
            ? parseFloat(amount) / splitBetween.length
            : null;
        // Format settlements - either from request or create new ones
        const formattedSettlements = settlements.length > 0
            ? settlements.map(settlement => ({
                user: settlement.user,
                amount: parseFloat(settlement.amount),
                status: settlement.status || "pending",
                paidAt: settlement.paidAt || null,
                settledBy: settlement.settledBy || null,
                personalTransactionId: settlement.personalTransactionId || null
            }))
            : splitBetween.map(userId => {
                // For custom split, find the amount for this user
                const customAmount = splitType === "custom"
                    ? customAmounts.find(amt => amt.user.toString() === userId.toString())?.amount
                    : null;

                return {
                    user: userId,
                    amount: customAmount ? parseFloat(customAmount) : amountPerUser,
                    status: "pending",
                    paidAt: null,
                    settledBy: null,
                    personalTransactionId: null
                };
            });
        // Verify the total of settlements matches the transaction amount
        const totalSettlements = formattedSettlements.reduce((sum, settlement) => sum + settlement.amount, 0);
        if (Math.abs(totalSettlements - parseFloat(amount)) > 0.01) {
            return res.status(400).json({
                success: false,
                message: "Sum of settlement amounts doesn't match transaction amount"
            });
        }
        // Format custom amounts if split type is custom
        const formattedCustomAmounts = splitType === "custom"
            ? customAmounts.map(item => ({
                user: item.user,
                amount: parseFloat(item.amount),
                status: "pending",
                paidAt: null
            }))
            : [];
        // Create transaction
        const transaction = new Transaction({
            title,
            description,
            amount: parseFloat(amount),
            category: category || "Other",
            paidBy,
            splitBetween,
            group,
            splitType,
            customAmounts: formattedCustomAmounts,
            notes,
            tags,
            paymentStatus: "pending",
            singleStatus,
            settlements: formattedSettlements,
            transactionType: "expense",
            bankAccount: bankAccountId,
            isGroupTransaction
        });
        // If template was used, link it
        if (templateId) {
            const template = await Template.findById(templateId);
            if (template) {
                transaction.template = templateId;
            }
        }

        // Save transaction
        await transaction.save();

        // Update group's transactions array
        await Group.findByIdAndUpdate(
            group,
            { $push: { transactions: transaction._id } }
        );

        // Update bank account balance
        const newBalance = bankAccount.currentBalance - parseFloat(amount);
        await BankBalance.findByIdAndUpdate(
            bankAccountId,
            {
                currentBalance: newBalance,
                updatedAt: new Date()
            }
        );

        // Populate the response with user details
        const populatedTransaction = await Transaction.findById(transaction._id)
            .populate("paidBy", "firstName lastName phoneNumber")
            .populate("splitBetween", "firstName lastName phoneNumber")
            .populate("group", "name")
            .populate("settlements.user", "firstName lastName phoneNumber")
            .populate("bankAccount", "bankName accountType currentBalance limitAmount personalLimitAmount isPrimary");

        res.status(201).json({
            success: true,
            message: "Transaction created successfully",
            transaction: populatedTransaction
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to create transaction",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

//get group transactions
const getGroupTransactions = async (req, res) => {
    try {
        const { groupId, userId, page = 1, limit = 10, filterType = "all" } = req.query;

        // Validate required fields
        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Group ID is required"
            });
        }

        // Check if user is part of the group
        const group = await Group.findById(groupId).populate('members', 'firstName lastName avatar phoneNumber');
        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        if (userId && !group.members.some(member => member._id.toString() === userId)) {
            return res.status(403).json({
                success: false,
                message: "User is not a member of this group"
            });
        }

        // Build query
        const query = {
            group: groupId,
            isGroupTransaction: true,
            isContactTransaction: { $ne: true },
            paidBy: { $exists: true, $ne: null },
            splitBetween: { $exists: true, $ne: null, $type: 'array', $ne: [] }
        };
        if (userId && filterType === "paidBy") {
            query.paidBy = userId;
        } else if (userId && filterType === "involved") {
            query.$or = [{ paidBy: userId }, { splitBetween: userId }];
        }

        // Get transactions with pagination and proper population
        const transactions = await Transaction.find(query)
            .populate("paidBy", "firstName lastName avatar phoneNumber")
            .populate("splitBetween", "firstName lastName avatar phoneNumber")
            .populate({
                path: "customAmounts.user",
                select: "firstName lastName avatar phoneNumber",
                model: "User"
            })
            .populate("group", "name")
            .populate("bankAccount", "bankName accountType currentBalance _id")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // Filter out invalid transactions
        const validTransactions = transactions.filter(txn => {
            if (!txn || !txn.paidBy || !txn.paidBy._id) {
                return false;
            }
            return true;
        });

        // Initialize member balances
        const memberBalances = {};
        group.members.forEach(member => {
            memberBalances[member._id.toString()] = {
                totalPaid: 0,
                totalShare: 0,
                balance: 0,
                owesTo: {},
                owedBy: {}
            };
        });

        // Process each valid transaction
        validTransactions.forEach(transaction => {
            const payerId = transaction.paidBy._id.toString();
            memberBalances[payerId].totalPaid += transaction.amount;

            if (transaction.splitType === 'even' && Array.isArray(transaction.splitBetween)) {
                const perPersonShare = transaction.amount / transaction.splitBetween.length;
                transaction.splitBetween.forEach(participant => {
                    if (participant && participant._id) {
                        const participantId = participant._id.toString();
                        memberBalances[participantId].totalShare += perPersonShare;
                    }
                });
            } else if (transaction.splitType === 'custom' && Array.isArray(transaction.customAmounts)) {
                transaction.customAmounts.forEach(custom => {
                    if (custom && custom.user && custom.user._id) {
                        const participantId = custom.user._id.toString();
                        memberBalances[participantId].totalShare += custom.amount;
                    }
                });
            }
        });

        // Calculate final balances
        Object.keys(memberBalances).forEach(memberId => {
            const member = memberBalances[memberId];
            let netBalance = 0;
            Object.keys(member.owedBy).forEach(owedById => {
                netBalance += member.owedBy[owedById];
            });
            Object.keys(member.owesTo).forEach(owesToId => {
                netBalance -= member.owesTo[owesToId];
            });
            member.balance = netBalance;
        });

        const enhancedTransactions = validTransactions.map(txn => {
            const totalCustomAmount = txn.splitType === 'custom'
                ? txn.customAmounts?.reduce((sum, item) => sum + item.amount, 0) || 0
                : null;

            const splitDetails = {
                type: txn.splitType,
                totalAmount: txn.amount,
                equalShare: txn.splitType === 'equal' && txn.splitBetween?.length
                    ? txn.amount / txn.splitBetween.length
                    : null,
                customAmounts: txn.splitType === 'custom' && txn.customAmounts
                    ? txn.customAmounts.map(item => ({
                        user: item.user ? {
                            _id: item.user._id,
                            firstName: item.user.firstName,
                            lastName: item.user.lastName,
                            avatar: item.user.avatar
                        } : null,
                        amount: item.amount,
                        status: item.status,
                        percentage: (item.amount / txn.amount * 100).toFixed(2) + '%'
                    }))
                    : null,
                amountVerified: txn.splitType === 'custom'
                    ? Math.abs(totalCustomAmount - txn.amount) < 0.01
                    : null
            };

            return {
                ...txn,
                splitDetails,
                paidBy: txn.paidBy ? {
                    _id: txn.paidBy._id,
                    firstName: txn.paidBy.firstName,
                    lastName: txn.paidBy.lastName,
                    avatar: txn.paidBy.avatar
                } : null,
                splitBetween: txn.splitBetween?.map(user => ({
                    _id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    avatar: user.avatar
                })) || []
            };
        });

        // Get total count for pagination info
        const total = transactions.length;

        // Calculate total group spending
        const totalGroupSpending = transactions.reduce((sum, txn) => sum + txn.amount, 0);

        res.status(200).json({
            success: true,
            transactions: enhancedTransactions,
            balances: memberBalances,
            summary: {
                totalGroupSpending,
                totalTransactions: total
            },
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalTransactions: total
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch transactions",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

//update group transaction
const updateGroupTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user._id;
        const {
            title,
            description,
            amount,
            category,
            paidBy,
            splitBetween,
            group,
            splitType,
            customAmounts,
            notes,
            tags,
            bankAccountId
        } = req.body;

        // Validate required fields
        const missingFields = [];
        if (!title) missingFields.push('title');
        if (!amount) missingFields.push('amount');
        if (!paidBy) missingFields.push('paidBy');
        if (!group) missingFields.push('group');
        if (!splitBetween) missingFields.push('splitBetween');
        if (!bankAccountId) missingFields.push('bankAccountId');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                missingFields: missingFields
            });
        }

        // Find the transaction
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }

        // Check if the user is the creator of the transaction
        if (transaction.paidBy.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only update transactions you created"
            });
        }

        // Check if any settlements are paid or success
        const hasPaidSettlements = transaction.settlements && transaction.settlements.some(
            settlement => settlement.status === 'paid' || settlement.status === 'success'
        );

        if (hasPaidSettlements) {
            return res.status(403).json({
                success: false,
                message: "Cannot update transaction with paid settlements"
            });
        }

        // Get the old bank account and add back the old amount
        const oldBankAccount = await BankBalance.findById(transaction.bankAccount);
        if (oldBankAccount) {
            const newBalance = oldBankAccount.currentBalance + transaction.amount;
            await BankBalance.findByIdAndUpdate(
                transaction.bankAccount,
                { currentBalance: newBalance },
                { new: true }
            );
        }

        // Get the new bank account and subtract the new amount
        const newBankAccount = await BankBalance.findById(bankAccountId);
        if (newBankAccount) {
            const newBalance = newBankAccount.currentBalance - amount;
            await BankBalance.findByIdAndUpdate(
                bankAccountId,
                { currentBalance: newBalance },
                { new: true }
            );
        }

        // Update the transaction
        const updatedTransaction = await Transaction.findByIdAndUpdate(
            transactionId,
            {
                title,
                description,
                amount,
                category,
                paidBy,
                splitBetween,
                group,
                splitType,
                customAmounts,
                notes,
                tags,
                bankAccount: bankAccountId,
                updatedAt: new Date()
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Transaction updated successfully",
            data: updatedTransaction
        });

    } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

//delete group transaction
const deleteGroupTransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user._id;

        // Find the transaction
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }

        // Check if the user is the creator of the transaction
        if (transaction.paidBy.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You can only delete transactions you created"
            });
        }

        // Check if any settlements are paid or success
        const hasPaidSettlements = transaction.settlements && transaction.settlements.some(
            settlement => settlement.status === 'paid' || settlement.status === 'success'
        );

        if (hasPaidSettlements) {
            return res.status(403).json({
                success: false,
                message: "Cannot delete transaction with paid settlements"
            });
        }

        // Get the bank account and add back the amount
        const bankAccount = await BankBalance.findById(transaction.bankAccount);
        if (bankAccount) {
            const newBalance = bankAccount.currentBalance + transaction.amount;
            await BankBalance.findByIdAndUpdate(
                transaction.bankAccount,
                {
                    currentBalance: newBalance,
                    updatedAt: new Date()
                }
            );
        }

        // Delete the transaction
        await Transaction.findByIdAndDelete(transactionId);

        res.status(200).json({
            success: true,
            message: "Transaction deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete transaction",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};
//get group balances
const getGroupBalances = async (req, res) => {

    try {
        const groupId = req.params.groupId || req.query.groupId;
        const userId = req.user._id;


        if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID format"
            });
        }

        const group = await Group.findById(groupId)
            .populate("members", "firstName lastName avatar phoneNumber")
            .lean();

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }


        if (!group.members.some(member => member._id.toString() === userId.toString())) {
            return res.status(403).json({
                success: false,
                message: "User is not a member of this group"
            });
        }

        // Get only group transactions with proper validation
        const groupTransactions = await Transaction.find({
            group: groupId,
            isGroupTransaction: true,
            settlements: {
                $elemMatch: {
                    status: { $in: ['pending', 'paid', 'failed'] }
                }
            },
            paidBy: { $exists: true, $ne: null },
            splitBetween: { $exists: true, $ne: null, $type: 'array', $ne: [] }
        })
            .populate({
                path: "paidBy",
                select: "firstName lastName _id",
                model: "User"
            })
            .populate({
                path: "splitBetween",
                select: "firstName lastName _id",
                model: "User"
            })
            .populate({
                path: "customAmounts.user",
                select: "firstName lastName _id",
                model: "User"
            })
            .populate("bankAccount", "bankName accountType currentBalance _id")
            .lean();


        // Initialize member balances
        const memberBalances = {};
        group.members.forEach(member => {
            memberBalances[member._id.toString()] = {
                totalPaid: 0,
                totalShare: 0,
                balance: 0,
                owesTo: {},
                owedBy: {}
            };
        });

        // Process group transactions
        groupTransactions.forEach((txn) => {
            if (!txn || !txn.paidBy || !txn.paidBy._id) {
                return;
            }
            const payerId = txn.paidBy._id.toString();
            memberBalances[payerId].totalPaid += txn.amount;

            if (txn.splitType === 'even' && Array.isArray(txn.splitBetween) && txn.splitBetween.length > 0) {
                const shareAmount = txn.amount / txn.splitBetween.length;

                txn.splitBetween.forEach(member => {
                    if (!member || !member._id) {
                        return;
                    }

                    const participantId = member._id.toString();

                    if (!memberBalances[participantId]) {
                        return;
                    }

                    if (participantId !== payerId) {
                        // Find the settlement for this participant
                        const settlement = txn.settlements.find(s =>
                            s.user && s.user.toString() === participantId
                        );

                        // Only include amount if settlement is pending (exclude paid, success, and reject)
                        if (!settlement || settlement.status === "pending") {
                            memberBalances[participantId].totalShare += shareAmount;
                            memberBalances[participantId].owesTo[payerId] = (memberBalances[participantId].owesTo[payerId] || 0) + shareAmount;
                            memberBalances[payerId].owedBy[participantId] = (memberBalances[payerId].owedBy[participantId] || 0) + shareAmount;
                        } else {
                        }
                    }
                });
            } else if (txn.splitType === 'custom' && Array.isArray(txn.customAmounts)) {

                txn.customAmounts.forEach(custom => {
                    if (!custom || !custom.user || !custom.user._id) {
                        return;
                    }

                    const participantId = custom.user._id.toString();
                    if (!memberBalances[participantId]) {
                        return;
                    }

                    if (participantId !== payerId) {
                        // Find the settlement for this participant
                        const settlement = txn.settlements.find(s =>
                            s.user && s.user.toString() === participantId
                        );

                        // Only include amount if settlement is pending (exclude paid, success, and reject)
                        if (!settlement || settlement.status === "pending") {
                            memberBalances[participantId].totalShare += custom.amount;
                            memberBalances[participantId].owesTo[payerId] = (memberBalances[participantId].owesTo[payerId] || 0) + custom.amount;
                            memberBalances[payerId].owedBy[participantId] = (memberBalances[payerId].owedBy[participantId] || 0) + custom.amount;
                        } else {
                        }
                    }
                });
            }
        });

        // Calculate final balances
        Object.keys(memberBalances).forEach(memberId => {
            const member = memberBalances[memberId];
            let netBalance = 0;
            Object.keys(member.owedBy).forEach(owedById => {
                netBalance += member.owedBy[owedById];
            });
            Object.keys(member.owesTo).forEach(owesToId => {
                netBalance -= member.owesTo[owesToId];
            });
            member.balance = netBalance;
        });

        // Format response
        const formattedResponse = {
            members: group.members.map(member => {
                const memberId = member._id.toString();
                const memberBalance = memberBalances[memberId] || {
                    totalPaid: 0,
                    totalShare: 0,
                    balance: 0,
                    owesTo: {},
                    owedBy: {}
                };
                return {
                    member: {
                        _id: member._id,
                        name: `${member.firstName} ${member.lastName}`,
                        avatar: member.avatar
                    },
                    balance: parseFloat(memberBalance.balance.toFixed(2)),
                    totalPaid: parseFloat(memberBalance.totalPaid.toFixed(2)),
                    totalShare: parseFloat(memberBalance.totalShare.toFixed(2)),
                    owesTo: memberBalance.owesTo || {},
                    owedBy: memberBalance.owedBy || {}
                };
            })
        };

        res.status(200).json({
            success: true,
            balances: formattedResponse
        });

    } catch (error) {
        console.error("Error in getGroupBalances:", {
            message: error.message,
            stack: error.stack,
            groupId: req.params.groupId || req.query.groupId,
            userId: req.user?._id
        });
        res.status(500).json({
            success: false,
            message: "Failed to fetch group balances",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};
//get group details
const getGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Group ID is required"
            });
        }

        const group = await Group.findById(groupId)
            .populate({
                path: 'members',
                select: 'firstName lastName avatar phoneNumber'
            })
            .populate({
                path: 'createdBy',
                select: 'firstName lastName avatar phoneNumber'
            });

        console.log("=== BACKEND GROUP DETAILS DEBUG ===");
        console.log("Group ID:", groupId);
        console.log("Group found:", !!group);
        console.log("Group members before processing:", group?.members);
        console.log("Group createdBy before processing:", group?.createdBy);

        // Create response object with computed name fields
        const responseGroup = {
            ...group.toObject(),
            members: group.members.map(member => {
                const memberObj = member.toObject ? member.toObject() : member;
                return {
                    ...memberObj,
                    name: `${memberObj.firstName} ${memberObj.lastName}`.trim()
                };
            }),
            createdBy: {
                ...group.createdBy.toObject(),
                name: `${group.createdBy.firstName} ${group.createdBy.lastName}`.trim()
            }
        };

        console.log("=== BACKEND AFTER PROCESSING ===");
        console.log("Response group members:", responseGroup.members);
        console.log("Response group createdBy:", responseGroup.createdBy);

        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Ensure isSettleUpMode is an array
        if (!Array.isArray(group.isSettleUpMode)) {
            group.isSettleUpMode = [];
        }

        // Count users with settle up mode enabled
        const enabledSettleUpCount = group.isSettleUpMode.filter(mode => mode.isSettled).length;

        // Format the response to include isSettleUpMode and count
        const formattedGroup = {
            ...responseGroup,
            isSettleUpMode: group.isSettleUpMode.map(mode => ({
                memberId: mode.memberId,
                isSettled: mode.isSettled,
                lastSettlementDate: mode.lastSettlementDate
            })),
            settleUpModeStats: {
                enabledCount: enabledSettleUpCount,
                totalMembers: group.members.length
            }
        };

        res.status(200).json({
            success: true,
            group: formattedGroup
        });
    } catch (error) {
        console.error("Error fetching group details:", {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: "Failed to fetch group details",
            error: error.message
        });
    }
};
//update settle up mode
const updateSettleUpMode = async (req, res) => {
    try {
        const { groupId, memberId, isSettled } = req.body;

        if (!groupId || !memberId) {
            return res.status(400).json({
                success: false,
                message: "Group ID and Member ID are required"
            });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Ensure isSettleUpMode is an array
        if (!Array.isArray(group.isSettleUpMode)) {
            group.isSettleUpMode = [];
        }



        // Find the member's settle up mode entry
        const settleUpModeIndex = group.isSettleUpMode.findIndex(
            mode => mode.memberId && mode.memberId.toString() === memberId.toString()
        );

        if (settleUpModeIndex === -1) {
            // Create new entry if it doesn't exist
            group.isSettleUpMode.push({
                memberId: new mongoose.Types.ObjectId(memberId),
                isSettled,
                amount: 0,
                status: "pending",
                lastSettlementDate: new Date()
            });
        } else {
            // Update existing entry
            group.isSettleUpMode[settleUpModeIndex].isSettled = isSettled;
            group.isSettleUpMode[settleUpModeIndex].lastSettlementDate = new Date();
        }

        // Save the group with the updated settle up mode
        await group.save();

        // Log the current state of all settle up modes after update

        // Format the response to include properly formatted isSettleUpMode
        const formattedGroup = {
            ...group.toObject(),
            isSettleUpMode: group.isSettleUpMode.map(mode => ({
                memberId: mode.memberId,
                isSettled: mode.isSettled,
                lastSettlementDate: mode.lastSettlementDate
            }))
        };

        // Verify the update was successful for the specific user
        const updatedMode = formattedGroup.isSettleUpMode.find(
            mode => mode.memberId && mode.memberId.toString() === memberId.toString()
        );

        if (!updatedMode || updatedMode.isSettled !== isSettled) {
            console.error("Failed to verify settle up mode update");
            return res.status(500).json({
                success: false,
                message: "Failed to update settle up mode"
            });
        }

        res.status(200).json({
            success: true,
            message: "Settle up mode updated successfully",
            group: formattedGroup
        });
    } catch (error) {
        console.error("Error updating settle up mode:", {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: "Failed to update settle up mode",
            error: error.message
        });
    }
};
//update settlement status - NEW SETTLEMENT FLOW
const updateSettlementStatus = async (req, res) => {
    try {
        const { groupId, userId, amount } = req.body;
        const currentUserId = req.user._id;


        // Find all transactions where there are pending settlements between the two users
        // This includes both directions: current user owes other user AND other user owes current user
        const transactionsQuery = Transaction.find({
            group: groupId,
            isGroupTransaction: true,
            $or: [
                // Case 1: Other user paid, current user owes money
                {
                    paidBy: userId,
                    "settlements": {
                        $elemMatch: {
                            user: currentUserId,
                            status: "pending"
                        }
                    }
                },
                // Case 2: Current user paid, other user owes money
                {
                    paidBy: currentUserId,
                    "settlements": {
                        $elemMatch: {
                            user: userId,
                            status: "pending"
                        }
                    }
                }
            ]
        })
            .populate("settlements.user", "firstName lastName")
            .populate("paidBy", "firstName lastName")
            .populate("bankAccount", "bankName accountType currentBalance _id");

        const transactions = await transactionsQuery;

        if (!transactions || transactions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No pending settlements found"
            });
        }

        const updatedSettlements = [];
        let totalSettledAmount = 0;

        // Update settlements for each transaction
        for (const transaction of transactions) {

            // Find settlements to update based on transaction direction
            let settlementsToUpdate = [];

            if (transaction.paidBy._id.toString() === userId.toString()) {
                // Case 1: Other user paid, current user owes money
                settlementsToUpdate = transaction.settlements.filter(settlement => {
                    const isCurrentUserSettlement = settlement.user._id.toString() === currentUserId.toString();
                    const isPending = settlement.status === "pending";
                    return isCurrentUserSettlement && isPending;
                });
            } else if (transaction.paidBy._id.toString() === currentUserId.toString()) {
                // Case 2: Current user paid, other user owes money
                settlementsToUpdate = transaction.settlements.filter(settlement => {
                    const isOtherUserSettlement = settlement.user._id.toString() === userId.toString();
                    const isPending = settlement.status === "pending";
                    return isOtherUserSettlement && isPending;
                });
            }

            // Update each matching settlement
            for (const settlement of settlementsToUpdate) {
                // Store original amount if not already set
                if (!settlement.originalAmount) {
                    settlement.originalAmount = settlement.amount;
                }

                // Update settlement status to "paid" (waiting for confirmation)
                settlement.status = "paid";
                settlement.paidAt = new Date();
                settlement.settledBy = currentUserId;

                // Add to settlement history
                if (!settlement.settlementHistory) {
                    settlement.settlementHistory = [];
                }
                settlement.settlementHistory.push({
                    status: "paid",
                    changedAt: new Date(),
                    changedBy: currentUserId,
                    reason: "Settle Up initiated"
                });


                totalSettledAmount += settlement.amount;

                updatedSettlements.push({
                    transactionId: transaction._id,
                    amount: settlement.amount,
                    title: transaction.title,
                    settlementId: settlement._id,
                    status: "paid"
                });
            }

            await transaction.save();

            // Server push: notify original payer that a settlement is awaiting confirmation
            try {
                const originalPayerId = transaction.paidBy._id || transaction.paidBy;
                // Count how many newly marked 'paid' for this txn
                const newlyPaidCount = settlementsToUpdate.length;
                if (newlyPaidCount > 0) {
                    await sendPushToUser(
                        originalPayerId,
                        'Settlement received',
                        `${newlyPaidCount} payment${newlyPaidCount > 1 ? 's are' : ' is'} awaiting your confirmation.`,
                        { type: 'settlement_confirm_required', transactionId: String(transaction._id), groupId: String(transaction.group) }
                    );
                }
            } catch (e) {
                console.error('[Push] updateSettlementStatus push error:', e?.message || e);
            }
        }


        res.status(200).json({
            success: true,
            message: "Settlements marked as paid (waiting for confirmation)",
            updatedSettlements,
            totalSettledAmount
        });

    } catch (error) {
        console.error("Error updating settlement status:", {
            error: error.message,
            stack: error.stack,
            requestBody: req.body
        });
        res.status(500).json({
            success: false,
            message: "Failed to update settlement status",
            error: error.message
        });
    }
};
//get settlement status
const getSettlementStatus = async (req, res) => {
    try {
        const { groupId, userId } = req.params;

        if (!groupId || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Group ID or User ID"
            });
        }

        // Always fetch the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Find all transactions in the group where:
        // 1. The user is the payer
        // 2. The user is a member who owes money
        const transactions = await Transaction.find({
            group: groupId,
            isGroupTransaction: true,
            $or: [
                { paidBy: userId },
                { "settlements.user": userId }
            ]
        })
            .populate("settlements.user", "firstName lastName avatar phoneNumber")
            .populate("paidBy", "firstName lastName avatar phoneNumber")
            .populate("bankAccount", "bankName accountType currentBalance _id");

        if (!transactions || transactions.length === 0) {
            return res.status(200).json({
                success: true,
                settlementStatus: {
                    totalPending: 0,
                    totalPaid: 0,
                    totalFailed: 0,
                    pendingSettlements: [],
                    paidSettlements: [],
                    failedSettlements: [],
                    successSettlements: []
                }
            });
        }

        // Calculate settlement status for non-payers
        const settlementStatus = {
            totalPending: 0,
            totalPaid: 0,
            totalFailed: 0,
            totalSuccess: 0,
            pendingSettlements: [],
            paidSettlements: [],
            failedSettlements: [],
            successSettlements: []
        };

        // Process settlements for the user
        transactions.forEach((transaction) => {
            if (!transaction || !transaction.settlements) return;


            // Find settlements where the user is involved
            const userSettlements = transaction.settlements.filter(
                settlement =>
                    settlement &&
                    settlement.user &&
                    settlement.user._id &&
                    settlement.user._id.toString() === userId
            );


            userSettlements.forEach(settlement => {
                if (!settlement) return;

                const settlementInfo = {
                    _id: settlement._id,
                    transactionId: transaction._id,
                    title: transaction.title,
                    amount: settlement.amount,
                    date: settlement.paidAt || transaction.createdAt,
                    paidBy: transaction.paidBy,
                    user: settlement.user,
                    status: settlement.status,
                    group: transaction.group,
                    createdAt: settlement.paidAt || transaction.createdAt
                };

                switch (settlement.status) {
                    case "pending":
                        settlementStatus.totalPending += settlement.amount;
                        settlementStatus.pendingSettlements.push(settlementInfo);
                        break;
                    case "paid":
                        settlementStatus.totalPaid += settlement.amount;
                        settlementStatus.paidSettlements.push(settlementInfo);
                        break;
                    case "reject":
                        settlementStatus.totalFailed += settlement.amount;
                        settlementStatus.failedSettlements.push(settlementInfo);
                        break;
                    case "success":
                        settlementStatus.totalSuccess += settlement.amount;
                        settlementStatus.successSettlements.push(settlementInfo);
                        break;
                }
            });

            // If user is the payer, check for settlements paid to them
            if (transaction.paidBy._id.toString() === userId) {
                transaction.settlements.forEach(settlement => {
                    if (settlement.status === "paid" && settlement.user._id.toString() !== userId) {
                        const settlementInfo = {
                            _id: settlement._id,
                            transactionId: transaction._id,
                            title: transaction.title,
                            amount: settlement.amount,
                            date: settlement.paidAt,
                            paidBy: transaction.paidBy,
                            user: settlement.user,
                            status: settlement.status,
                            group: transaction.group,
                            createdAt: settlement.paidAt
                        };
                        settlementStatus.paidSettlements.push(settlementInfo);
                    }
                });
            }
        });

        // Sort settlements by date (newest first)
        settlementStatus.paidSettlements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        settlementStatus.pendingSettlements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        settlementStatus.failedSettlements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        settlementStatus.successSettlements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));


        return res.status(200).json({
            success: true,
            settlementStatus
        });

    } catch (error) {
        console.error("Error getting settlement status:", {
            error: error.message,
            stack: error.stack,
            params: req.params
        });
        res.status(500).json({
            success: false,
            message: "Failed to get settlement status",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

// Updated confirmSettlement function - NEW SETTLEMENT FLOW
const confirmSettlement = async (req, res) => {
    try {
        const { groupId, userId, confirmed } = req.body;
        const currentUserId = req.user._id;


        // Find all transactions where there are paid settlements between the two users
        // This includes both directions: current user is payer AND other user is payer
        const transactions = await Transaction.find({
            group: groupId,
            isGroupTransaction: true,
            $or: [
                // Case 1: Current user is payer, other user has paid settlements
                {
                    paidBy: currentUserId,
                    "settlements": {
                        $elemMatch: {
                            user: userId,
                            status: "paid"
                        }
                    }
                },
                // Case 2: Other user is payer, current user has paid settlements
                {
                    paidBy: userId,
                    "settlements": {
                        $elemMatch: {
                            user: currentUserId,
                            status: "paid"
                        }
                    }
                }
            ]
        })
            .populate("settlements.user", "firstName lastName")
            .populate("paidBy", "firstName lastName")
            .populate("bankAccount", "bankName accountType currentBalance _id");


        if (!transactions || transactions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No transactions found with paid settlements to confirm",
            });
        }

        const updatedTransactions = [];

        // Update settlements between the two users
        for (const transaction of transactions) {

            // Find settlements to update based on transaction direction
            let settlementsToUpdate = [];

            if (transaction.paidBy._id.toString() === currentUserId.toString()) {
                // Case 1: Current user is payer, other user has paid settlements
                settlementsToUpdate = transaction.settlements.filter(settlement => {
                    const isOtherUserSettlement = settlement.user._id.toString() === userId.toString();
                    const isPaid = settlement.status === "paid";
                    return isOtherUserSettlement && isPaid;
                });
            } else if (transaction.paidBy._id.toString() === userId.toString()) {
                // Case 2: Other user is payer, current user has paid settlements
                settlementsToUpdate = transaction.settlements.filter(settlement => {
                    const isCurrentUserSettlement = settlement.user._id.toString() === currentUserId.toString();
                    const isPaid = settlement.status === "paid";
                    return isCurrentUserSettlement && isPaid;
                });
            }

            // Update each matching settlement
            for (const settlement of settlementsToUpdate) {
                if (confirmed) {
                    // Confirmation: paid → success
                    settlement.status = "success";
                    settlement.confirmedAt = new Date();
                    settlement.confirmedBy = currentUserId;
                } else {
                    // Rejection: paid → pending (so payer can try again)
                    settlement.status = "pending";
                    settlement.rejectedAt = new Date();
                    settlement.rejectedBy = currentUserId;
                    settlement.rejectionReason = "Payment rejected by receiver";
                }

                // Add to settlement history
                if (!settlement.settlementHistory) {
                    settlement.settlementHistory = [];
                }
                settlement.settlementHistory.push({
                    status: confirmed ? "success" : "pending",
                    changedAt: new Date(),
                    changedBy: currentUserId,
                    reason: confirmed ? "Payment confirmed by receiver" : "Payment rejected by receiver - back to pending"
                });


                await transaction.save();

                // Server push notifications
                try {
                    const payerUserId = settlement.user?._id || settlement.user; // the one who paid
                    if (confirmed) {
                        await sendPushToUser(
                            payerUserId,
                            'Payment confirmed',
                            `Your payment of ₹${Number(settlement.amount).toFixed(2)} was confirmed.`,
                            { type: 'settlement_confirmed', transactionId: String(transaction._id), groupId: String(transaction.group) }
                        );
                    } else {
                        await sendPushToUser(
                            payerUserId,
                            'Payment rejected',
                            `Your payment of ₹${Number(settlement.amount).toFixed(2)} was rejected.`,
                            { type: 'settlement_rejected', transactionId: String(transaction._id), groupId: String(transaction.group) }
                        );
                    }
                } catch (e) {
                    console.error('[Push] confirmSettlement push error:', e?.message || e);
                }
                updatedTransactions.push({
                    transactionId: transaction._id,
                    amount: settlement.amount,
                    title: transaction.title,
                    status: settlement.status
                });
            }
        }


        res.status(200).json({
            success: true,
            message: confirmed
                ? "Settlements confirmed successfully"
                : "Settlements rejected successfully",
            updatedTransactions
        });
    } catch (error) {
        console.error("Error in confirmSettlement:", error);
        res.status(500).json({
            success: false,
            message: "Error confirming settlements",
            error: error.message,
        });
    }
};

//get group spending summary
const getGroupSpendingSummary = async (req, res) => {

    try {
        const { groupId, userId } = req.query;

        if (!groupId || !userId) {
            return res.status(400).json({
                success: false,
                message: "Group ID and User ID are required"
            });
        }

        // Find all transactions for the group
        const transactions = await Transaction.find({
            group: groupId,
            isGroupTransaction: true
        })
            .populate("paidBy", "firstName lastName")
            .populate("bankAccount", "bankName accountType currentBalance _id");


        // Calculate total group spending
        const totalGroupSpending = transactions.reduce((sum, txn) => sum + (txn.amount || 0), 0);

        // Calculate current user's spending
        const userTransactions = transactions.filter(txn =>
            txn.paidBy && txn.paidBy._id && txn.paidBy._id.toString() === userId.toString()
        );

        const userSpending = userTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0);


        res.status(200).json({
            success: true,
            summary: {
                totalGroupSpending,
                userSpending
            }
        });

    } catch (error) {
        console.error("Error in getGroupSpendingSummary:", {
            error: error.message,
            stack: error.stack,
            query: req.query,
            user: req.user?._id
        });
        res.status(500).json({
            success: false,
            message: "Failed to fetch group spending summary",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

const getTotalBalances = async (req, res) => {

    try {
        const userId = req.user._id;

        // Get all groups for the user
        const groups = await Group.find({
            members: userId
        }).lean();


        let totalYouOwe = 0;
        let totalOwedToYou = 0;

        // Process each group
        for (const group of groups) {

            // Get pending transactions for this group
            const groupTransactions = await Transaction.find({
                group: group._id,
                isGroupTransaction: true,
                settlements: {
                    $elemMatch: {
                        status: { $in: ['pending', 'paid', 'failed'] }
                    }
                },
                paidBy: { $exists: true, $ne: null },
                splitBetween: { $exists: true, $ne: null, $type: 'array', $ne: [] }
            })
                .populate({
                    path: "paidBy",
                    select: "firstName lastName _id",
                    model: "User"
                })
                .populate({
                    path: "splitBetween",
                    select: "firstName lastName _id",
                    model: "User"
                })
                .populate({
                    path: "customAmounts.user",
                    select: "firstName lastName _id",
                    model: "User"
                })
                .populate("bankAccount", "bankName accountType currentBalance _id")
                .lean();


            // Process transactions for this group
            groupTransactions.forEach((txn, index) => {
                if (!txn || !txn.paidBy || !txn.paidBy._id) {
                    return;
                }

                const payerId = txn.paidBy._id.toString();
                const isCurrentUserPayer = payerId === userId.toString();


                if (txn.splitType === 'even' && Array.isArray(txn.splitBetween)) {
                    const perPersonShare = txn.amount / txn.splitBetween.length;

                    txn.splitBetween.forEach(participant => {
                        if (!participant || !participant._id) return;
                        const participantId = participant._id.toString();

                        // Skip if it's the same person
                        if (participantId === payerId) return;

                        // Find the settlement for this participant
                        const settlement = txn.settlements.find(s =>
                            s.user && s.user.toString() === participantId
                        );

                        // Only include amount if settlement is pending (exclude paid, success, and reject)
                        if (!settlement || settlement.status === "pending") {
                            if (isCurrentUserPayer) {
                                // You paid, someone owes you
                                totalOwedToYou += perPersonShare;
                            } else if (participantId === userId.toString()) {
                                // Someone paid, you owe them
                                totalYouOwe += perPersonShare;
                            }
                        }
                    });
                } else if (txn.splitType === 'custom' && Array.isArray(txn.customAmounts)) {
                    txn.customAmounts.forEach(custom => {
                        if (!custom || !custom.user || !custom.user._id) return;
                        const participantId = custom.user._id.toString();

                        // Skip if it's the same person
                        if (participantId === payerId) return;

                        // Find the settlement for this participant
                        const settlement = txn.settlements.find(s =>
                            s.user && s.user.toString() === participantId
                        );

                        // Only include amount if settlement is pending (exclude paid, success, and reject)
                        if (!settlement || settlement.status === "pending") {
                            if (isCurrentUserPayer) {
                                // You paid, someone owes you
                                totalOwedToYou += custom.amount;
                            } else if (participantId === userId.toString()) {
                                // Someone paid, you owe them
                                totalYouOwe += custom.amount;
                            }
                        }
                    });
                }
            });
        }

        // Round to 2 decimal places
        totalYouOwe = parseFloat(totalYouOwe.toFixed(2));
        totalOwedToYou = parseFloat(totalOwedToYou.toFixed(2));


        const response = {
            success: true,
            totals: {
                youOwe: totalYouOwe,
                owedToYou: totalOwedToYou
            }
        };


        res.status(200).json(response);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch total balances",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

// Handle rejected settlements - move them back to pending
const handleRejectedSettlements = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const currentUserId = req.user._id;


        // Find all transactions where the other user is the payer and the current user has rejected settlements
        const transactions = await Transaction.find({
            group: groupId,
            isGroupTransaction: true,
            paidBy: userId,
            "settlements": {
                $elemMatch: {
                    user: currentUserId,
                    status: "reject"
                }
            }
        })
            .populate("settlements.user", "firstName lastName")
            .populate("paidBy", "firstName lastName");


        if (!transactions || transactions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No rejected settlements found",
            });
        }

        const updatedTransactions = [];

        // Update rejected settlements back to pending
        for (const transaction of transactions) {
            // Find settlements where the current user has rejected settlements
            const settlementsToUpdate = transaction.settlements.filter(settlement => {
                const isCurrentUserSettlement = settlement.user._id.toString() === currentUserId.toString();
                const isRejected = settlement.status === "reject";

                return isCurrentUserSettlement && isRejected;
            });

            // Update each matching settlement
            for (const settlement of settlementsToUpdate) {
                // Move from reject back to pending
                settlement.status = "pending";

                // Clear paid-related fields
                settlement.paidAt = null;
                settlement.settledBy = null;
                settlement.rejectedAt = null;
                settlement.rejectedBy = null;
                settlement.rejectionReason = null;

                // Add to settlement history
                if (!settlement.settlementHistory) {
                    settlement.settlementHistory = [];
                }
                settlement.settlementHistory.push({
                    status: "pending",
                    changedAt: new Date(),
                    changedBy: currentUserId,
                    reason: "Settlement moved back to pending after rejection"
                });

                await transaction.save();
                updatedTransactions.push({
                    transactionId: transaction._id,
                    amount: settlement.amount,
                    title: transaction.title,
                    status: settlement.status
                });
            }
        }


        res.status(200).json({
            success: true,
            message: "Rejected settlements moved back to pending",
            updatedTransactions
        });
    } catch (error) {
        console.error("Error handling rejected settlements:", error);
        res.status(500).json({
            success: false,
            message: "Error handling rejected settlements",
            error: error.message,
        });
    }
};

// Archive group for a specific user
const archiveGroup = async (req, res) => {
    try {
        const { groupId } = req.body;
        const userId = req.user.id; // From auth middleware

        // Validate input
        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Group ID is required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID format"
            });
        }

        // Find the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check if user is a member of the group
        const isMember = group.members.some(member => member.toString() === userId) ||
            group.createdBy.toString() === userId;

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this group"
            });
        }

        // Check if group is already archived by this user
        const alreadyArchived = group.archivedBy.some(archive =>
            archive.userId.toString() === userId
        );

        if (alreadyArchived) {
            return res.status(400).json({
                success: false,
                message: "Group is already archived by you"
            });
        }

        // Add user to archivedBy array
        group.archivedBy.push({
            userId: userId,
            archivedAt: new Date()
        });

        await group.save();

        res.status(200).json({
            success: true,
            message: "Group archived successfully"
        });

    } catch (error) {
        console.error("Error archiving group:", error);
        res.status(500).json({
            success: false,
            message: "Failed to archive group",
            error: error.message
        });
    }
};

// Restore group for a specific user
const restoreGroup = async (req, res) => {
    try {
        const { groupId } = req.body;
        const userId = req.user.id; // From auth middleware

        // Validate input
        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Group ID is required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID format"
            });
        }

        // Find the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check if user is a member of the group
        const isMember = group.members.some(member => member.toString() === userId) ||
            group.createdBy.toString() === userId;

        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this group"
            });
        }

        // Check if group is archived by this user
        const archiveIndex = group.archivedBy.findIndex(archive =>
            archive.userId.toString() === userId
        );

        if (archiveIndex === -1) {
            return res.status(400).json({
                success: false,
                message: "Group is not archived by you"
            });
        }

        // Remove user from archivedBy array
        group.archivedBy.splice(archiveIndex, 1);
        await group.save();

        res.status(200).json({
            success: true,
            message: "Group restored successfully"
        });

    } catch (error) {
        console.error("Error restoring group:", error);
        res.status(500).json({
            success: false,
            message: "Failed to restore group",
            error: error.message
        });
    }
};

// Get archived groups for a specific user
const getArchivedGroups = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware

        // Find groups where user is archived
        const groups = await Group.find({
            $or: [
                { createdBy: userId },
                { members: userId }
            ],
            archivedBy: {
                $elemMatch: {
                    userId: userId
                }
            }
        })
            .populate({
                path: "members",
                select: "firstName lastName avatar phoneNumber"
            })
            .populate({
                path: "createdBy",
                select: "firstName lastName avatar phoneNumber"
            })
            .lean();

        if (!groups || groups.length === 0) {
            return res.status(200).json({
                success: true,
                archivedGroups: [],
                message: "No archived groups found for this user."
            });
        }

        // Format the groups with member count and archive date
        const formattedGroups = groups.map(group => {
            const userArchive = group.archivedBy.find(archive =>
                archive.userId.toString() === userId
            );

            return {
                _id: group._id,
                name: group.name,
                memberCount: group.members.length,
                members: group.members,
                createdBy: group.createdBy,
                archivedAt: userArchive.archivedAt,
                createdAt: group.createdAt,
                updatedAt: group.updatedAt
            };
        });

        res.status(200).json({
            success: true,
            archivedGroups: formattedGroups
        });

    } catch (error) {
        console.error("Error fetching archived groups:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch archived groups",
            error: error.message
        });
    }
};

// Helper function to migrate existing groups (can be called manually)
const migrateExistingGroups = async () => {
    try {
        console.log("Starting migration of existing groups...");

        // Find all groups that don't have the archivedBy field
        const groupsWithoutArchive = await Group.find({
            archivedBy: { $exists: false }
        });

        console.log(`Found ${groupsWithoutArchive.length} groups without archivedBy field`);

        if (groupsWithoutArchive.length === 0) {
            console.log("All groups already have archivedBy field");
            return { success: true, migratedCount: 0 };
        }

        // Update all groups to include archivedBy field
        const updateResult = await Group.updateMany(
            { archivedBy: { $exists: false } },
            { $set: { archivedBy: [] } }
        );

        console.log(`Successfully migrated ${updateResult.modifiedCount} groups`);
        return { success: true, migratedCount: updateResult.modifiedCount };

    } catch (error) {
        console.error("Error migrating groups for archive:", error);
        return { success: false, error: error.message };
    }
};

// Delete group (only for creator)
const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id; // From auth middleware

        // Validate input
        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Group ID is required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID format"
            });
        }

        // Find the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check if user is the creator
        if (String(group.createdBy) !== String(userId)) {
            return res.status(403).json({
                success: false,
                message: "Only the group creator can delete the group"
            });
        }

        // Delete all transactions related to this group
        await Transaction.deleteMany({ group: groupId });

        // Remove group from all users' groups array
        await User.updateMany(
            { groups: groupId },
            { $pull: { groups: groupId } }
        );

        // Delete the group
        await Group.findByIdAndDelete(groupId);

        res.status(200).json({
            success: true,
            message: "Group deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete group",
            error: error.message
        });
    }
};

// Leave group (for non-creators)
const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.body;
        const userId = req.user.id; // From auth middleware

        // Validate input
        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Group ID is required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID format"
            });
        }

        // Find the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check if user is the creator
        if (String(group.createdBy) === String(userId)) {
            return res.status(403).json({
                success: false,
                message: "Group creator cannot leave the group. Please delete the group instead."
            });
        }

        // Check if user is a member
        const isMember = group.members.some(member => String(member) === String(userId));
        if (!isMember) {
            return res.status(400).json({
                success: false,
                message: "You are not a member of this group"
            });
        }

        // Remove user from group members
        group.members = group.members.filter(member => String(member) !== String(userId));
        await group.save();

        // Remove group from user's groups array
        await User.findByIdAndUpdate(userId, {
            $pull: { groups: groupId }
        });

        // Handle any pending transactions where user is involved
        // You might want to add logic here to handle pending settlements
        // For now, we'll just remove the user from future transactions

        res.status(200).json({
            success: true,
            message: "You have successfully left the group"
        });

    } catch (error) {
        console.error("Error leaving group:", error);
        res.status(500).json({
            success: false,
            message: "Failed to leave group",
            error: error.message
        });
    }
};

// Add members to existing group
const addMembers = async (req, res) => {
    try {
        const { groupId, newMembers } = req.body;
        const userId = req.user.id; // From auth middleware

        // Validate input
        if (!groupId) {
            return res.status(400).json({
                success: false,
                message: "Group ID is required"
            });
        }

        if (!newMembers || !Array.isArray(newMembers) || newMembers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "New members array is required and cannot be empty"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid group ID format"
            });
        }

        // Find the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Check if user is a member of the group
        const isMember = group.members.some(member => String(member) === String(userId));
        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: "You must be a member of the group to add new members"
            });
        }

        // Process new members
        const membersToAdd = [];
        const usersToUpdate = [];

        for (const newMember of newMembers) {
            if (!newMember.phoneNumber) {
                continue; // Skip members without phone numbers
            }

            // Find user by phone number
            const user = await User.findOne({
                phoneNumber: newMember.phoneNumber
            });

            if (user) {
                // Check if user is already a member
                const isAlreadyMember = group.members.some(member => String(member) === String(user._id));
                if (!isAlreadyMember) {
                    membersToAdd.push(user._id);
                    usersToUpdate.push(user._id);
                }
            }
        }

        if (membersToAdd.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No new members to add. All selected contacts are either already members or not registered in the app."
            });
        }

        // Add new members to the group
        group.members = [...group.members, ...membersToAdd];
        await group.save();

        // Add group to new users' groups array
        await User.updateMany(
            { _id: { $in: usersToUpdate } },
            { $addToSet: { groups: groupId } }
        );

        // Get updated group with populated members
        const updatedGroup = await Group.findById(groupId)
            .populate('members', 'name phoneNumber avatar')
            .populate('createdBy', 'name phoneNumber avatar');

        res.status(200).json({
            success: true,
            message: `${membersToAdd.length} member(s) added successfully`,
            group: updatedGroup,
            addedCount: membersToAdd.length
        });

    } catch (error) {
        console.error("Error adding members:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add members",
            error: error.message
        });
    }
};

module.exports = {
    createGroup,
    getUserGroups,
    createGroupTransaction,
    getGroupTransactions,
    updateGroupTransaction,
    deleteGroupTransaction,
    getGroupBalances,
    updateSettleUpMode,
    getGroupDetails,
    updateSettlementStatus,
    getSettlementStatus,
    confirmSettlement,
    handleRejectedSettlements,
    getGroupSpendingSummary,
    getTotalBalances,
    archiveGroup,
    restoreGroup,
    getArchivedGroups,
    migrateExistingGroups,
    deleteGroup,
    leaveGroup,
    addMembers
}
