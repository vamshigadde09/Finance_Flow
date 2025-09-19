const Group = require("../models/Group");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");

// Get simplified balances for the current user
const getMemberBalances = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id.toString();

        const group = await Group.findById(groupId)
            .populate('members', 'firstName lastName phoneNumber avatar')
            .lean();

        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        if (!group.members.some(m => m._id.toString() === userId)) {
            return res.status(403).json({ success: false, message: "You are not a member of this group" });
        }

        const transactions = await Transaction.find({
            group: groupId,
            paymentStatus: { $in: ['pending', 'settled'] },
            isGroupTransaction: true
        })
            .populate("paidBy", "_id firstName lastName phoneNumber avatar")
            .populate("splitBetween", "_id firstName lastName phoneNumber avatar")
            .populate({
                path: "customAmounts.user",
                select: "_id firstName lastName phoneNumber avatar",
                model: "User"
            })
            .populate("bankAccount", "bankName accountType currentBalance _id");



        const result = { youOwe: [], owesYou: [] };

        // Process each transaction
        transactions.forEach((transaction) => {

            const payerId = transaction.paidBy?._id?.toString();
            const isCurrentUserPayer = payerId === userId;

            // Check if current user is involved in this transaction
            const userInvolved = transaction.splitBetween?.some(
                p => p._id?.toString() === userId
            ) || (transaction.splitType === 'custom' && transaction.customAmounts?.some(
                item => item.user?._id?.toString() === userId
            ));

            if (!userInvolved) {
                return;
            }


            if (transaction.splitType === 'even') {
                const splitCount = transaction.splitBetween.length;
                const perPersonShare = transaction.amount / splitCount;

                if (isCurrentUserPayer) {
                    transaction.splitBetween.forEach(p => {
                        const pId = p._id.toString();
                        if (pId !== userId) {
                            const existingEntry = result.owesYou.find(e => e.member._id.toString() === pId);
                            if (existingEntry) {
                                existingEntry.amount += perPersonShare;
                            } else {
                                const member = group.members.find(m => m._id.toString() === pId);
                                if (member) {
                                    result.owesYou.push({
                                        member: {
                                            _id: member._id,
                                            firstName: member.firstName,
                                            lastName: member.lastName,
                                            phoneNumber: member.phoneNumber,
                                            avatar: member.avatar,
                                        },
                                        amount: perPersonShare,
                                        splitType: 'even'
                                    });
                                }
                            }
                        }
                    });

                } else {
                    const existingEntry = result.youOwe.find(e => e.member._id.toString() === payerId);
                    if (existingEntry) {
                        existingEntry.amount += perPersonShare;
                    } else {
                        const member = group.members.find(m => m._id.toString() === payerId);
                        if (member) {
                            result.youOwe.push({
                                member: {
                                    _id: member._id,
                                    firstName: member.firstName,
                                    lastName: member.lastName,
                                    phoneNumber: member.phoneNumber,
                                    avatar: member.avatar,
                                },
                                amount: perPersonShare,
                                splitType: 'equal'
                            });
                        }
                    }
                }
            } else if (transaction.splitType === 'custom') {
                transaction.customAmounts.forEach((entry) => {
                    const entryUserId = entry.user._id.toString();
                    const amount = entry.amount;

                    if (entryUserId === userId && !isCurrentUserPayer) {
                        const existingEntry = result.youOwe.find(e => e.member._id.toString() === payerId);
                        if (existingEntry) {
                            existingEntry.amount += amount;
                        } else {
                            const member = group.members.find(m => m._id.toString() === payerId);
                            if (member) {
                                result.youOwe.push({
                                    member: {
                                        _id: member._id,
                                        firstName: member.firstName,
                                        lastName: member.lastName,
                                        phoneNumber: member.phoneNumber,
                                        avatar: member.avatar,
                                    },
                                    amount: amount,
                                    splitType: 'custom'
                                });
                            }
                        }
                    } else if (entryUserId !== userId && isCurrentUserPayer) {
                        const existingEntry = result.owesYou.find(e => e.member._id.toString() === entryUserId);
                        if (existingEntry) {
                            existingEntry.amount += amount;
                        } else {
                            const member = group.members.find(m => m._id.toString() === entryUserId);
                            if (member) {
                                result.owesYou.push({
                                    member: {
                                        _id: member._id,
                                        firstName: member.firstName,
                                        lastName: member.lastName,
                                        phoneNumber: member.phoneNumber,
                                        avatar: member.avatar,
                                    },
                                    amount: amount,
                                    splitType: 'custom'
                                });
                            }
                        }
                    }
                });
            }
        });
        // Filter out near-zero balances
        result.youOwe = result.youOwe.filter(item => Math.abs(item.amount) >= 0.01);
        result.owesYou = result.owesYou.filter(item => Math.abs(item.amount) >= 0.01);

        // Calculate balances for each member
        const memberBalances = {};
        group.members.forEach(member => {
            memberBalances[member._id.toString()] = {
                totalPaid: 0,
                totalShare: 0,
                balance: 0,
                owesTo: {}, // Track who owes whom
                owedBy: {}  // Track who is owed by whom
            };
        });

        // Process each transaction
        transactions.forEach((transaction) => {
            if (!transaction || !transaction.paidBy || !transaction.paidBy._id) {
                return;
            }
            const payerId = transaction.paidBy._id.toString();
            memberBalances[payerId].totalPaid += transaction.amount;

            if (transaction.splitType === 'even' && Array.isArray(transaction.splitBetween)) {
                const perPersonShare = transaction.amount / transaction.splitBetween.length;

                transaction.splitBetween.forEach(participant => {
                    if (!participant || !participant._id) {
                        return;
                    }
                    const participantId = participant._id.toString();
                    if (participantId !== payerId) { // Don't add to payer's own share
                        memberBalances[participantId].totalShare += perPersonShare;

                        // Track who owes whom
                        if (!memberBalances[participantId].owesTo[payerId]) {
                            memberBalances[participantId].owesTo[payerId] = 0;
                        }
                        memberBalances[participantId].owesTo[payerId] += perPersonShare;

                        if (!memberBalances[payerId].owedBy[participantId]) {
                            memberBalances[payerId].owedBy[participantId] = 0;
                        }
                        memberBalances[payerId].owedBy[participantId] += perPersonShare;
                    }
                });
            } else if (transaction.splitType === 'custom' && Array.isArray(transaction.customAmounts)) {
                transaction.customAmounts.forEach(custom => {
                    if (!custom || !custom.user || !custom.user._id) {
                        return;
                    }
                    const participantId = custom.user._id.toString();
                    if (participantId !== payerId) { // Don't add to payer's own share
                        memberBalances[participantId].totalShare += custom.amount;

                        // Track who owes whom
                        if (!memberBalances[participantId].owesTo[payerId]) {
                            memberBalances[participantId].owesTo[payerId] = 0;
                        }
                        memberBalances[participantId].owesTo[payerId] += custom.amount;

                        if (!memberBalances[payerId].owedBy[participantId]) {
                            memberBalances[payerId].owedBy[participantId] = 0;
                        }
                        memberBalances[payerId].owedBy[participantId] += custom.amount;
                    }
                });
            }
        });

        // Calculate final balances
        Object.keys(memberBalances).forEach(memberId => {
            const member = memberBalances[memberId];
            const memberName = group.members.find(m => m._id.toString() === memberId);

            // Calculate net balance for each member
            let netBalance = 0;
            Object.keys(member.owedBy).forEach(owedById => {
                netBalance += member.owedBy[owedById];
            });
            Object.keys(member.owesTo).forEach(owesToId => {
                netBalance -= member.owesTo[owesToId];
            });

            member.balance = netBalance;
        });

        // Get total count for pagination info
        const total = await Transaction.countDocuments(query);

        // Calculate total group spending
        const totalGroupSpending = transactions.reduce((sum, txn) => sum + txn.amount, 0);

        // Format the response
        const formattedResponse = {
            summary: {
                totalGroupSpending: transactions.reduce((sum, txn) => sum + txn.amount, 0)
            },
            members: group.members.map(member => {
                const memberId = member._id.toString();
                const memberBalance = memberBalances[memberId];
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

        setBalances(formattedResponse);
        setUserSpending(userTotalSpending);

        return res.status(200).json({ success: true, balances: formattedResponse });

    } catch (error) {
        console.error('Error in getMemberBalances:', error);
        res.status(500).json({
            success: false,
            message: "Failed to calculate balances",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};


// Get all transactions for a group
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

        if (userId && !group.members.includes(userId)) {
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


        // Calculate balances for each member
        const memberBalances = {};
        group.members.forEach(member => {
            memberBalances[member._id.toString()] = {
                totalPaid: 0,
                totalShare: 0,
                balance: 0,
                owesTo: {}, // Track who owes whom
                owedBy: {}  // Track who is owed by whom
            };
        });

        // Process each transaction
        transactions.forEach((transaction) => {
            if (!transaction || !transaction.paidBy || !transaction.paidBy._id) {
                return;
            }
            const payerId = transaction.paidBy._id.toString();
            memberBalances[payerId].totalPaid += transaction.amount;

            if (transaction.splitType === 'even' && Array.isArray(transaction.splitBetween)) {
                const perPersonShare = transaction.amount / transaction.splitBetween.length;

                transaction.splitBetween.forEach(participant => {
                    if (!participant || !participant._id) {
                        return;
                    }
                    const participantId = participant._id.toString();
                    if (participantId !== payerId) { // Don't add to payer's own share
                        memberBalances[participantId].totalShare += perPersonShare;

                        // Track who owes whom
                        if (!memberBalances[participantId].owesTo[payerId]) {
                            memberBalances[participantId].owesTo[payerId] = 0;
                        }
                        memberBalances[participantId].owesTo[payerId] += perPersonShare;

                        if (!memberBalances[payerId].owedBy[participantId]) {
                            memberBalances[payerId].owedBy[participantId] = 0;
                        }
                        memberBalances[payerId].owedBy[participantId] += perPersonShare;
                    }
                });
            } else if (transaction.splitType === 'custom' && Array.isArray(transaction.customAmounts)) {
                transaction.customAmounts.forEach(custom => {
                    if (!custom || !custom.user || !custom.user._id) {
                        return;
                    }
                    const participantId = custom.user._id.toString();
                    if (participantId !== payerId) { // Don't add to payer's own share
                        memberBalances[participantId].totalShare += custom.amount;

                        // Track who owes whom
                        if (!memberBalances[participantId].owesTo[payerId]) {
                            memberBalances[participantId].owesTo[payerId] = 0;
                        }
                        memberBalances[participantId].owesTo[payerId] += custom.amount;

                        if (!memberBalances[payerId].owedBy[participantId]) {
                            memberBalances[payerId].owedBy[participantId] = 0;
                        }
                        memberBalances[payerId].owedBy[participantId] += custom.amount;
                    }
                });
            }
        });

        // Calculate final balances
        Object.keys(memberBalances).forEach(memberId => {
            const member = memberBalances[memberId];
            const memberName = group.members.find(m => m._id.toString() === memberId);

            // Calculate net balance for each member
            let netBalance = 0;
            Object.keys(member.owedBy).forEach(owedById => {
                netBalance += member.owedBy[owedById];
            });
            Object.keys(member.owesTo).forEach(owesToId => {
                netBalance -= member.owesTo[owesToId];
            });

            member.balance = netBalance;
        });

        // Get total count for pagination info
        const total = await Transaction.countDocuments(query);

        // Calculate total group spending
        const totalGroupSpending = transactions.reduce((sum, txn) => sum + txn.amount, 0);

        res.status(200).json({
            success: true,
            transactions: transactions,
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

module.exports = {
    getMemberBalances,
    getGroupTransactions
};
