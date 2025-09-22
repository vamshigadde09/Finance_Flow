import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, RefreshControl, ActivityIndicator, Modal, Alert, Animated as RNAnimated, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAnimatedProps, useSharedValue, withTiming, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Contacts from 'expo-contacts';

import { API_BASE_URL } from '../../../api';

const AnimatedBalance = ({ value, style }) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        // Reset display value when value changes
        setDisplayValue(value);

        // Animate to the new value
        const duration = 500; // 500ms animation
        const startTime = Date.now();
        const startValue = displayValue;
        const endValue = value;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeProgress = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            const currentValue = startValue + (endValue - startValue) * easeProgress;
            setDisplayValue(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return (
        <Text style={style}>
            {displayValue.toLocaleString('en-US', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}
        </Text>
    );
};

const BalanceSummary = ({ memberBalances, currentUserId, loading }) => {
    const calculateBalances = () => {


        if (!memberBalances?.members) {
            return {
                totalYouOwe: 0,
                totalOwesYou: 0,
                netBalance: 0
            };
        }

        // Find current user's balance
        const currentUserBalance = memberBalances.members.find(
            m => m.member._id === currentUserId
        );


        if (!currentUserBalance) {
            return {
                totalYouOwe: 0,
                totalOwesYou: 0,
                netBalance: 0
            };
        }

        // Calculate net amounts for each user
        const netAmounts = {};

        // First, add what others owe you
        Object.entries(currentUserBalance.owedBy || {}).forEach(([userId, amount]) => {
            netAmounts[userId] = (netAmounts[userId] || 0) + amount;
        });

        // Then subtract what you owe others
        Object.entries(currentUserBalance.owesTo || {}).forEach(([userId, amount]) => {
            netAmounts[userId] = (netAmounts[userId] || 0) - amount;
        });



        // Calculate total you owe (negative net amounts)
        const totalYouOwe = Object.values(netAmounts)
            .filter(amount => amount < 0)
            .reduce((sum, amount) => sum + Math.abs(amount), 0);

        // Calculate total others owe you (positive net amounts)
        const totalOwesYou = Object.values(netAmounts)
            .filter(amount => amount > 0)
            .reduce((sum, amount) => sum + amount, 0);

        // Net balance is what others owe you minus what you owe others
        const netBalance = totalOwesYou - totalYouOwe;

        const result = {
            totalYouOwe,
            totalOwesYou,
            netBalance
        };
        return result;
    };

    const {
        totalYouOwe = 0,
        totalOwesYou = 0,
        netBalance = 0
    } = calculateBalances();

    const formatCurrency = (value) => {
        return value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const getNetBalanceDisplay = () => {
        if (netBalance > 0) {
            return {
                text: `+${formatCurrency(netBalance)}`,
                style: styles.owedAmount
            };
        }
        if (netBalance < 0) {
            return {
                text: `-${formatCurrency(Math.abs(netBalance))}`,
                style: styles.oweAmount
            };
        }
        return {
            text: formatCurrency(0),
            style: {}
        };
    };

    const netBalanceDisplay = getNetBalanceDisplay();

    return (
        <View>
            <Text style={styles.sectionLabel}>Your Balance</Text>
            <View style={styles.balanceBox} accessibilityLabel="Balance summary">
                <View style={styles.balanceRow}>
                    <Text
                        style={styles.balanceLabel}
                        accessibilityLabel="Amount you owe"
                    >
                        You owe:
                    </Text>
                    <AnimatedBalance
                        value={totalYouOwe}
                        style={[styles.balanceAmount, styles.oweAmount]}
                    />
                </View>
                <View style={styles.balanceRow}>
                    <Text
                        style={styles.balanceLabel}
                        accessibilityLabel="Amount owed to you"
                    >
                        Owes you:
                    </Text>
                    <AnimatedBalance
                        value={totalOwesYou}
                        style={[styles.balanceAmount, styles.owedAmount]}
                    />
                </View>
                <View style={styles.balanceRow}>
                    <Text
                        style={styles.balanceLabel}
                        accessibilityLabel="Net balance"
                    >
                        Net balance:
                    </Text>
                    <AnimatedBalance
                        value={netBalance}
                        style={[styles.balanceAmount, netBalanceDisplay.style]}
                    />
                </View>
            </View>
        </View>
    );
};

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

// Skeleton Loading Components
const SkeletonBox = ({ width, height, style }) => {
    const [skeletonOpacity] = useState(new RNAnimated.Value(0.3));

    useEffect(() => {
        const animateSkeleton = () => {
            RNAnimated.loop(
                RNAnimated.sequence([
                    RNAnimated.timing(skeletonOpacity, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    RNAnimated.timing(skeletonOpacity, {
                        toValue: 0.3,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animateSkeleton();

        return () => {
            skeletonOpacity.stopAnimation();
        };
    }, [skeletonOpacity]);

    return (
        <RNAnimated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: '#E1E9EE',
                    borderRadius: 4,
                    opacity: skeletonOpacity,
                },
                style,
            ]}
        />
    );
};

const SummarySkeleton = () => (
    <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
            <View style={styles.summaryContent}>
                <SkeletonBox width={28} height={28} style={{ borderRadius: 14, marginRight: 12 }} />
                <View style={styles.summaryTextContainer}>
                    <SkeletonBox width="80%" height={14} style={{ marginBottom: 8 }} />
                    <SkeletonBox width="60%" height={18} />
                </View>
            </View>
        </View>
        <View style={styles.summaryBox}>
            <View style={styles.summaryContent}>
                <SkeletonBox width={28} height={28} style={{ borderRadius: 14, marginRight: 12 }} />
                <View style={styles.summaryTextContainer}>
                    <SkeletonBox width="80%" height={14} style={{ marginBottom: 8 }} />
                    <SkeletonBox width="60%" height={18} />
                </View>
            </View>
        </View>
    </View>
);

const BalanceSummarySkeleton = () => (
    <View>
        <SkeletonBox width="30%" height={16} style={{ marginBottom: 12 }} />
        <View style={styles.balanceBox}>
            <View style={styles.balanceRow}>
                <SkeletonBox width="25%" height={14} style={{ marginBottom: 8 }} />
                <SkeletonBox width="40%" height={16} />
            </View>
            <View style={styles.balanceRow}>
                <SkeletonBox width="25%" height={14} style={{ marginBottom: 8 }} />
                <SkeletonBox width="40%" height={16} />
            </View>
            <View style={styles.balanceRow}>
                <SkeletonBox width="25%" height={14} style={{ marginBottom: 8 }} />
                <SkeletonBox width="40%" height={16} />
            </View>
        </View>
    </View>
);

const MemberRowSkeleton = () => (
    <View style={styles.memberRow}>
        <SkeletonBox width={40} height={40} style={{ borderRadius: 20, marginRight: 12 }} />
        <View style={{ flex: 1 }}>
            <SkeletonBox width="60%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonBox width="40%" height={12} />
        </View>
        <SkeletonBox width={80} height={20} style={{ borderRadius: 10 }} />
    </View>
);

const TransactionSkeleton = () => (
    <View style={styles.transactionCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SkeletonBox width={40} height={40} style={{ borderRadius: 20, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
                <SkeletonBox width="70%" height={16} style={{ marginBottom: 8 }} />
                <SkeletonBox width="50%" height={12} />
            </View>
            <SkeletonBox width={80} height={16} />
        </View>
    </View>
);

// Helper to ensure PNG avatar for ui-avatars.com
function getAvatarUrl(avatar) {
    if (!avatar) return null;
    if (avatar.includes('ui-avatars.com') && !avatar.includes('format=png')) {
        return avatar + '&format=png';
    }
    return avatar;
}

// Helper to get category icon based on category name
function getCategoryIcon(category) {
    const categoryLower = category?.toLowerCase() || '';

    switch (categoryLower) {
        case 'food':
        case 'restaurant':
        case 'dining':
            return <Ionicons name="restaurant" size={16} color="#f59e0b" />;
        case 'travel':
        case 'transport':
        case 'transportation':
            return <Ionicons name="airplane" size={16} color="#3b82f6" />;
        case 'entertainment':
        case 'movies':
        case 'games':
            return <Ionicons name="game-controller" size={16} color="#8b5cf6" />;
        case 'shopping':
        case 'retail':
            return <Ionicons name="bag" size={16} color="#ec4899" />;
        case 'health':
        case 'medical':
        case 'healthcare':
            return <Ionicons name="medical" size={16} color="#ef4444" />;
        case 'utilities':
        case 'bills':
            return <Ionicons name="receipt" size={16} color="#6b7280" />;
        case 'education':
        case 'school':
            return <Ionicons name="school" size={16} color="#10b981" />;
        case 'fuel':
        case 'gas':
            return <Ionicons name="car" size={16} color="#f97316" />;
        case 'groceries':
            return <Ionicons name="basket" size={16} color="#84cc16" />;
        default:
            return <Ionicons name="card" size={16} color="#8b5cf6" />;
    }
}

const SplitGroups = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const groupData = route.params?.groupData;
    const [members, setMembers] = useState(() => {
        const m = groupData?.members || [];
        return m;
    });

    const [menuVisible, setMenuVisible] = useState(false);
    const [notificationVisible, setNotificationVisible] = useState(false);
    const [showAllTransactions, setShowAllTransactions] = useState(false);
    const [deleteGroupModal, setDeleteGroupModal] = useState(false);
    const [leaveGroupModal, setLeaveGroupModal] = useState(false);
    const [expandedTransactionId, setExpandedTransactionId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [spendingSummary, setSpendingSummary] = useState({
        totalGroupSpending: 0,
        userSpending: 0
    });
    const [memberBalances, setMemberBalances] = useState({});

    const [settlementStatuses, setSettlementStatuses] = useState({});
    const [socket, setSocket] = useState(null);
    const [settlementConfirmation, setSettlementConfirmation] = useState({
        visible: false,
        member: null,
        amount: 0,
        isPaid: false
    });
    const [paymentConfirmation, setPaymentConfirmation] = useState({
        visible: false,
        member: null,
        amount: 0,
        type: null // 'settlement' or 'payment'
    });
    const [paidSettlements, setPaidSettlements] = useState({});
    const [pendingConfirmations, setPendingConfirmations] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [memberModalVisible, setMemberModalVisible] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [contactImages, setContactImages] = useState({});

    // Initialize socket connection
    useEffect(() => {
        const newSocket = io(API_BASE_URL);
        setSocket(newSocket);

        // Join the group room
        if (groupData?._id) {
            newSocket.emit('joinGroup', groupData._id);
        }

        // Listen for transaction updates
        newSocket.on('transactionUpdate', (data) => {
            if (data.groupId === groupData?._id) {
                // Refresh transactions and balances
                fetchTransactions(1);
                fetchGroupBalances();
                fetchSpendingSummary();
            }
        });

        // Listen for transaction deletion
        newSocket.on('transactionDeleted', (data) => {
            if (data.groupId === groupData?._id) {
                // Remove the transaction from the list
                setTransactions(prev =>
                    prev.filter(txn => txn._id !== data.transactionId)
                );
                // Refresh balances
                fetchGroupBalances();
                fetchSpendingSummary();
            }
        });

        // Listen for settlement updates
        newSocket.on('settlementUpdate', (data) => {
            if (data.groupId === groupData?._id) {
                // Update settlement status
                setSettlementStatuses(prev => ({
                    ...prev,
                    [data.memberId]: data.status
                }));
                // Refresh balances
                fetchGroupBalances();
                fetchSpendingSummary();
            }
        });

        // Listen for balance updates
        newSocket.on('balanceUpdate', (data) => {
            if (data.groupId === groupData?._id) {
                // Refresh all balance-related data
                fetchGroupBalances();
                fetchSpendingSummary();
            }
        });

        return () => {
            if (groupData?._id) {
                newSocket.emit('leaveGroup', groupData._id);
            }
            newSocket.disconnect();
        };
    }, [groupData?._id, currentUserId]);

    const fetchSettlementStatus = useCallback(async (userId) => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token || !groupData?._id) {
                return;
            }



            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/settlement-status/${groupData?._id}/${userId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );



            if (response.data.success) {
                const settlementStatus = response.data.settlementStatus;

                // Check for settlements where current user is the one who paid (needs to confirm)
                const hasPaidSettlements = settlementStatus.paidSettlements?.some(s => {
                    const isCurrentUserPaid = String(s.paidBy?._id) === String(currentUserId);
                    const isMemberReceived = String(s.user?._id) === String(userId);
                    return isCurrentUserPaid && isMemberReceived;
                }) || false;

                // Check for settlements where current user owes money (needs to pay)
                const hasPendingSettlements = settlementStatus.pendingSettlements?.some(s => {
                    const isCurrentUserOwes = String(s.user?._id) === String(currentUserId);
                    const isMemberPaid = String(s.paidBy?._id) === String(userId);
                    return isCurrentUserOwes && isMemberPaid;
                }) || false;

                // Check for completed settlements
                const hasSuccessSettlements = settlementStatus.successSettlements?.some(s => {
                    const isCurrentUserPaid = String(s.paidBy?._id) === String(currentUserId);
                    const isCurrentUserReceived = String(s.user?._id) === String(currentUserId);
                    const isMemberPaid = String(s.paidBy?._id) === String(userId);
                    const isMemberReceived = String(s.user?._id) === String(userId);
                    const isSuccess = ((isMemberReceived && isCurrentUserPaid) || (isCurrentUserReceived && isMemberPaid));
                    return isSuccess;
                }) || false;

                const finalStatus = hasSuccessSettlements ? 'success' : hasPaidSettlements ? 'paid' : hasPendingSettlements ? 'pending' : 'none';



                // Update the settlement statuses state
                setSettlementStatuses(prev => ({
                    ...prev,
                    [userId]: {
                        status: finalStatus,
                        hasPendingSettlements,
                        pendingCount: settlementStatus.pendingSettlements?.length || 0,
                        paidSettlements: settlementStatus.paidSettlements,
                        pendingSettlements: settlementStatus.pendingSettlements,
                        successSettlements: settlementStatus.successSettlements
                    }
                }));
            }
        } catch (error) {
            console.error('❌ [SETTLEMENT STATUS] Error fetching settlement status:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
        }
    }, [groupData?._id, currentUserId]);

    // Get current user ID
    useEffect(() => {
        const getCurrentUserId = async () => {
            try {
                const userData = await AsyncStorage.getItem('userData');
                if (userData) {
                    const parsedUserData = JSON.parse(userData);
                    if (parsedUserData._id) {
                        setCurrentUserId(parsedUserData._id);
                    }
                }
            } catch (error) {
                console.error('Error getting current user ID:', error);
            }
        };
        getCurrentUserId();
    }, []);

    // Load contact images for members
    useEffect(() => {
        const loadContactImages = async () => {
            try {
                // Request contacts permission
                const { status } = await Contacts.requestPermissionsAsync();

                // Get contacts
                const { data } = await Contacts.getContactsAsync({
                    fields: [
                        Contacts.Fields.PhoneNumbers,
                        Contacts.Fields.Name,
                        Contacts.Fields.Image,
                        Contacts.Fields.ImageAvailable
                    ],
                });

                // Filter valid contacts
                const validContacts = data.filter(
                    (c) => c.phoneNumbers && c.phoneNumbers.length > 0 && c.name
                );

                // Process contacts to ensure image data is properly structured
                const processedContacts = validContacts.map(contact => ({
                    ...contact,
                    imageAvailable: contact.imageAvailable || false,
                    image: contact.imageAvailable ? {
                        uri: contact.image.uri
                    } : null
                }));

                // Create a map of phone numbers to contact images
                const phoneToImageMap = {};
                processedContacts.forEach(contact => {
                    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
                        contact.phoneNumbers.forEach(phoneNumber => {
                            // Normalize phone number (remove spaces, dashes, etc.)
                            const normalizedPhone = phoneNumber.number.replace(/[\s\-\(\)]/g, '');
                            if (contact.imageAvailable && contact.image) {
                                phoneToImageMap[normalizedPhone] = contact.image.uri;
                            } else {
                            }
                        });
                    }
                });
                setContactImages(phoneToImageMap);
            } catch (err) {
                console.error("Error loading contact images:", err);
            }
        };

        if (members.length > 0) {
            loadContactImages();
        }
    }, [members]);

    // Helper function to get contact image for a member
    const getContactImage = useCallback((member) => {
        // Check if member is null or undefined
        if (!member) {
            return null;
        }

        // Check multiple possible phone number fields
        const phoneNumber = member.phoneNumber || member.phone || member.phoneNumbers?.[0]?.number;

        // Check if phone number exists
        if (!phoneNumber) {
            return null;
        }

        // Normalize the member's phone number
        const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

        // Try multiple phone number variations
        const phoneVariations = [
            normalizedPhone,
            normalizedPhone.slice(-10), // Last 10 digits
            `+91${normalizedPhone}`, // With country code
            `91${normalizedPhone}`, // With country code without +
            `0${normalizedPhone}`, // With leading 0
        ];


        // Check if we have a contact image for any of these phone number variations
        let contactImage = null;
        for (const phone of phoneVariations) {
            if (contactImages[phone]) {
                contactImage = contactImages[phone];
                break;
            }
        }

        if (!contactImage) {
        }

        return contactImage;
    }, [contactImages]);

    const fetchTransactions = useCallback(async (pageNum = 1) => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                return;
            }


            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/group-transactions`,
                {
                    params: {
                        groupId: groupData?._id,
                        page: pageNum,
                        limit: 10,
                        filterType: "all"
                    },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                const newTransactions = response.data.transactions || [];



                if (pageNum === 1) {
                    setTransactions(newTransactions);
                } else {
                    setTransactions(prev => [...prev, ...newTransactions]);
                }
                setHasMore(newTransactions.length === 10);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('❌ [TRANSACTIONS] Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    }, [groupData?._id]);

    const fetchSpendingSummary = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token || !currentUserId) {
                return;
            }


            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/group-spending-summary`,
                {
                    params: {
                        groupId: groupData?._id,
                        userId: currentUserId
                    },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );



            if (response.data.success) {
                setSpendingSummary(response.data.summary);
            }
        } catch (error) {
            console.error('❌ [SPENDING SUMMARY] Error fetching spending summary:', error);
        }
    }, [groupData?._id, currentUserId]);

    const fetchGroupBalances = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token || !groupData?._id) {
                return;
            }


            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/get-group-balances`,
                {
                    params: {
                        groupId: groupData?._id
                    },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );



            if (response.data.success) {
                setMemberBalances(response.data.balances);
            }
        } catch (error) {
            console.error('❌ [GROUP BALANCES] Error fetching group balances:', error);
        }
    }, [groupData?._id]);

    useEffect(() => {
        if (currentUserId) {
            const loadInitialData = async () => {
                try {
                    await Promise.all([
                        fetchTransactions(1),
                        fetchSpendingSummary(),
                        fetchGroupBalances()
                    ]);
                } catch (error) {
                    console.error('❌ [INITIAL LOAD] Error in initial data load:', error);
                }
            };
            loadInitialData();
        } else {
            return;
        }
    }, [currentUserId, fetchTransactions, fetchSpendingSummary, fetchGroupBalances]);

    // Separate useEffect for fetching settlement statuses
    useEffect(() => {
        if (currentUserId && memberBalances?.members) {
            const fetchCurrentUserSettlementStatus = async () => {
                try {
                    await fetchSettlementStatus(currentUserId);
                } catch (error) {
                    console.error('❌ [SETTLEMENT STATUSES] Error fetching settlement statuses:', error);
                }
            };
            fetchCurrentUserSettlementStatus();
        } else {
            return;
        }
    }, [currentUserId, memberBalances?.members, fetchSettlementStatus]);

    // Aggregate notifications for PAID settlements awaiting confirmation (receiver confirms), net by counterpart
    const aggregatePaidSettlements = useCallback(() => {




        const currentUserStatus = settlementStatuses[currentUserId];
        if (!currentUserStatus || !currentUserStatus.paidSettlements) {
            return [];
        }

        // Split into incoming (to current user) and outgoing (from current user)
        const incomingByCounterpart = {};
        const outgoingByCounterpart = {};

        currentUserStatus.paidSettlements.forEach(s => {
            const isPaid = s.status === 'paid';
            const isCorrectGroup = String(s.group) === String(groupData?._id);
            if (!isPaid || !isCorrectGroup) return;

            // Payer-confirms model:
            // Outgoing (to confirm): settlements where current user is the payer (debtor)
            //   s.user === currentUserId; counterpart is original transaction payer (receiver): s.paidBy
            if (String(s.user?._id) === String(currentUserId)) {
                const counterpartId = String(s.paidBy?._id);
                if (!outgoingByCounterpart[counterpartId]) outgoingByCounterpart[counterpartId] = [];
                outgoingByCounterpart[counterpartId].push(s);
                return;
            }

            // Incoming (offset): settlements where current user is the receiver
            //   s.paidBy === currentUserId; counterpart is the payer (debtor): s.user
            if (String(s.paidBy?._id) === String(currentUserId)) {
                const counterpartId = String(s.user?._id);
                if (!incomingByCounterpart[counterpartId]) incomingByCounterpart[counterpartId] = [];
                incomingByCounterpart[counterpartId].push(s);
            }
        });

        const notifications = [];

        // Receiver-confirms model with NET amounts: notify current user only when net incoming > 0
        const counterpartIds = new Set([
            ...Object.keys(incomingByCounterpart),
            ...Object.keys(outgoingByCounterpart)
        ]);

        counterpartIds.forEach(counterpartId => {
            const incoming = incomingByCounterpart[counterpartId] || [];
            const outgoing = outgoingByCounterpart[counterpartId] || [];

            const incomingTotal = incoming.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            const outgoingTotal = outgoing.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            const netIncoming = incomingTotal - outgoingTotal; // what current user should confirm as receiver

            if (netIncoming > 0) {
                const member = members.find(m => String(m._id) === String(counterpartId));
                if (member) {
                    // pick the most recent incoming for details line, but show net in total
                    const latestIncoming = incoming.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || incoming[0];
                    const notification = {
                        user: member,
                        total: netIncoming,
                        settlements: latestIncoming ? [latestIncoming] : []
                    };
                    notifications.push(notification);

                }
            }
        });

        return notifications;
    }, [settlementStatuses, currentUserId, groupData, members, memberBalances]);

    // Check if current user is the group creator
    const isGroupCreator = useMemo(() => {
        return currentUserId && groupData?.createdBy?._id &&
            String(currentUserId) === String(groupData.createdBy._id);
    }, [currentUserId, groupData?.createdBy?._id]);

    // Delete group function (only for creator)
    const handleDeleteGroup = () => {
        if (!isGroupCreator) return;
        setDeleteGroupModal(true);
    };

    const confirmDeleteGroup = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                Alert.alert("Error", "Please login again");
                return;
            }

            const response = await axios.delete(
                `${API_BASE_URL}/api/v1/splits/group/${groupData._id}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                setDeleteGroupModal(false);
                navigation.goBack();
            } else {
                Alert.alert("Error", response.data.message || "Failed to delete group");
            }
        } catch (error) {
            console.error("Error deleting group:", error);
            Alert.alert("Error", "Failed to delete group. Please try again.");
        }
    };

    // Leave group function (for non-creators)
    const handleLeaveGroup = () => {
        if (isGroupCreator) return;
        setLeaveGroupModal(true);
    };

    const confirmLeaveGroup = async () => {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                Alert.alert("Error", "Please login again");
                return;
            }

            const response = await axios.post(
                `${API_BASE_URL}/api/v1/splits/leave-group`,
                { groupId: groupData._id },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                setLeaveGroupModal(false);
                navigation.goBack();

            } else {
                Alert.alert("Error", response.data.message || "Failed to leave group");
            }
        } catch (error) {
            console.error("Error leaving group:", error);
            Alert.alert("Error", "Failed to leave group. Please try again.");
        }
    };

    // Add member function
    const handleAddMember = async () => {
        setMenuVisible(false); // Close the menu first

        try {
            // Fetch fresh group details with populated members
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                Alert.alert("Error", "Please login again");
                return;
            }

            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/group/${groupData._id}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                const groupDetails = response.data.group;
                const populatedMembers = groupDetails.members || [];

                console.log("=== FETCHED GROUP DETAILS ===");
                console.log("Group details:", groupDetails);
                console.log("Populated members:", populatedMembers);

                navigation.navigate('CreateSplitGroup', {
                    groupData: groupData,
                    members: populatedMembers
                });
            } else {
                Alert.alert("Error", "Failed to fetch group details");
            }
        } catch (error) {
            console.error("Error fetching group details:", error);
            Alert.alert("Error", "Failed to fetch group details");
        }
    };

    // Update pendingConfirmations when modal opens or statuses change
    useEffect(() => {
        if (notificationVisible) {
            setNotifLoading(true);
            const confirmations = aggregatePaidSettlements();
            setPendingConfirmations(confirmations);
            setNotifLoading(false);
        }
    }, [notificationVisible, aggregatePaidSettlements]);

    // Confirm/Reject handler for all settlements from a user - NEW SETTLEMENT FLOW
    const handleConfirmRejectAll = async (userId, settlements, confirmed) => {


        setNotifLoading(true);
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                return;
            }

            // Filter settlements that need to be updated (receiver confirms incoming payments)
            const settlementsToUpdate = settlements.filter(s => {
                const isPaid = s.status === 'paid';
                const isCorrectGroup = String(s.group) === String(groupData._id);
                // Current user is receiver; counterpart (userId) is the payer (debtor)
                const isIncomingToCurrentUser = String(s.user._id) === String(userId) && String(s.paidBy._id) === String(currentUserId);
                return isPaid && isCorrectGroup && isIncomingToCurrentUser;
            });



            if (settlementsToUpdate.length === 0) {
                return;
            }

            // Make a single API call to update all settlements
            const requestData = {
                groupId: groupData._id,
                userId: userId,
                confirmed: confirmed
            };


            const response = await axios.put(
                `${API_BASE_URL}/api/v1/splits/confirm-settlement`,
                requestData,
                { headers: { Authorization: `Bearer ${token}` } }
            );



            if (response.data.success) {
                // Update local state based on new flow
                const newStatus = confirmed ? 'success' : 'pending';


                setSettlementStatuses(prev => {
                    const updated = {
                        ...prev,
                        [currentUserId]: {
                            ...prev[currentUserId],
                            status: newStatus,
                            hasPendingSettlements: !confirmed,
                            pendingCount: confirmed ? 0 : settlementsToUpdate.length,
                            // remove confirmed incoming from paidSettlements of current user
                            paidSettlements: confirmed
                                ? (prev[currentUserId]?.paidSettlements || []).filter(ps =>
                                    !(String(ps.user._id) === String(userId) && String(ps.paidBy._id) === String(currentUserId) && String(ps.group) === String(groupData._id))
                                )
                                : prev[currentUserId]?.paidSettlements || [],
                            successSettlements: confirmed
                                ? [...(prev[currentUserId]?.successSettlements || []), ...settlementsToUpdate]
                                : prev[currentUserId]?.successSettlements || [],
                            rejectedSettlements: !confirmed
                                ? [...(prev[currentUserId]?.rejectedSettlements || []), ...settlementsToUpdate]
                                : prev[currentUserId]?.rejectedSettlements || []
                        }
                    };
                    return updated;
                });

                // Refresh all relevant data
                await Promise.all([
                    fetchSettlementStatus(currentUserId),
                    fetchGroupBalances(),
                    fetchSpendingSummary()
                ]);

                // Update pending confirmations
                const newConfirmations = aggregatePaidSettlements();
                setPendingConfirmations(newConfirmations);
            }
        } catch (err) {
            console.error('❌ [CONFIRM/REJECT] Error confirming/rejecting settlements:', err);
        } finally {
            setNotifLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            fetchTransactions(page + 1);
        }
    };
    const handleRefresh = async () => {
        setRefreshing(true);
        setPage(1);
        try {
            await Promise.all([
                fetchTransactions(1),
                fetchSpendingSummary(),
                fetchGroupBalances()
            ]);
        } catch (error) {
            console.error('Error in manual refresh:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleSettleUp = async (member, amount) => {

        // Calculate the amount to settle (only new pending amounts, not already paid ones)
        const memberBalance = memberBalances?.members?.find(m => m.member._id === member._id);

        const owesToCurrentUser = memberBalance?.owedBy?.[currentUserId] || 0;
        const currentUserOwes = memberBalance?.owesTo?.[currentUserId] || 0;
        const displayBalance = currentUserOwes - owesToCurrentUser;

        // Get pending settlements where CURRENT USER owes money to THIS MEMBER
        const pendingSettlements = settlementStatuses[currentUserId]?.pendingSettlements || [];
        const currentUserPendingSettlements = pendingSettlements.filter(s => {
            // Check if the current user is the one who owes money (user field)
            // and the member is the one who is owed money (paidBy field)
            const isCurrentUserOwes = String(s.user?._id) === String(currentUserId);
            const isMemberOwed = String(s.paidBy?._id) === String(member._id);

            return isCurrentUserOwes && isMemberOwed;
        });

        const totalPendingAmount = currentUserPendingSettlements.reduce((sum, s) => sum + s.amount, 0);
        // Use the net balance between current user and this member for settlement
        const amountToSettle = Math.abs(displayBalance);



        // Show confirmation modal before proceeding
        setPaymentConfirmation({
            visible: true,
            member: member,
            amount: amountToSettle,
            type: 'settlement'
        });
    };

    const proceedWithSettlement = async (member, amount) => {

        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                return;
            }

            // Format member data for navigation while preserving _id
            const formattedMember = {
                _id: member._id,
                name: member.name || `${member.firstName} ${member.lastName}`.trim(),
                phoneNumber: member.phoneNumber || member.phone || '',
                avatar: member.avatar
            };


            // Show confirmation modal
            setSettlementConfirmation({
                visible: true,
                member: formattedMember,
                amount: amount,
                isPaid: false
            });



            // Navigate directly to ContactTran
            navigation.navigate('ContactTran', {
                contact: {
                    name: formattedMember.name,
                    phoneNumbers: [{ number: formattedMember.phoneNumber }],
                    image: formattedMember.avatar ? { uri: formattedMember.avatar } : null,
                    imageAvailable: !!formattedMember.avatar
                },
                sentamount: amount.toString(),
                groupId: groupData?._id,
                groupName: groupData?.name,
                isSettleUp: true,
                title: `Settle up for ${groupData?.name || 'split'} group`
            });

        } catch (error) {
            console.error('❌ [PROCEED SETTLEMENT] Error in handleSettleUp:', error);
        }
    };

    const handleSettlementConfirmation = async (confirmed) => {


        if (!confirmed) {
            setSettlementConfirmation({ visible: false, member: null, amount: 0, isPaid: false });
            return;
        }

        const { member, amount } = settlementConfirmation;

        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                return;
            }



            // Update settlement status
            const response = await axios.put(
                `${API_BASE_URL}/api/v1/splits/update-settlement-status`,
                {
                    groupId: groupData._id,
                    userId: member._id,
                    amount: amount
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );



            if (response.data.success) {
                // Update the settlement statuses state
                setSettlementStatuses(prev => ({
                    ...prev,
                    [member._id]: {
                        status: 'paid',
                        hasPendingSettlements: false,
                        pendingCount: 0
                    }
                }));

                // Refresh all relevant data
                await Promise.all([
                    fetchGroupBalances(),
                    fetchTransactions(1),
                    fetchSettlementStatus(member._id)
                ]);
            } else {
                console.error('❌ [SETTLEMENT CONFIRMATION] API returned unsuccessful response:', response.data);
            }
        } catch (err) {
            console.error('❌ [SETTLEMENT CONFIRMATION] Error updating settlement status:', err);
        } finally {
            setSettlementConfirmation({ visible: false, member: null, amount: 0, isPaid: false });
        }
    };

    // Handle rejected settlements - move them back to pending
    const handleRejectedSettlements = async (memberId) => {

        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                return;
            }

            // Move rejected settlements back to pending
            const response = await axios.put(
                `${API_BASE_URL}/api/v1/splits/handle-rejected-settlements`,
                {
                    groupId: groupData._id,
                    userId: memberId
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );



            if (response.data.success) {

                // Refresh all relevant data
                await Promise.all([
                    fetchSettlementStatus(currentUserId),
                    fetchGroupBalances(),
                    fetchSpendingSummary()
                ]);
            } else {
                console.error('❌ [HANDLE REJECTED] API returned unsuccessful response:', response.data);
            }
        } catch (err) {
            console.error('❌ [HANDLE REJECTED] Error handling rejected settlements:', err);
        }
    };

    const handlePhoneCall = (phoneNumber) => {
        if (!phoneNumber || phoneNumber === 'No phone') {
            Alert.alert('No Phone Number', 'This member has no phone number available.');
            return;
        }

        // Clean the phone number (remove spaces, dashes, etc.)
        let cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');

        // Remove existing country codes if present
        if (cleanPhoneNumber.startsWith('+91')) {
            cleanPhoneNumber = cleanPhoneNumber.substring(3);
        } else if (cleanPhoneNumber.startsWith('91') && cleanPhoneNumber.length > 10) {
            cleanPhoneNumber = cleanPhoneNumber.substring(2);
        }

        // Check if it's a valid phone number
        if (cleanPhoneNumber.length < 10) {
            Alert.alert('Invalid Phone Number', 'The phone number appears to be invalid.');
            return;
        }

        // Add +91 country code for India
        const phoneWithCountryCode = `+91${cleanPhoneNumber}`;

        // Open phone dialer
        const phoneUrl = `tel:${phoneWithCountryCode}`;
        Linking.openURL(phoneUrl).catch(err => {
            console.error('Error opening phone dialer:', err);
            Alert.alert('Error', 'Unable to open phone dialer. Please check if your device supports phone calls.');
        });
    };

    const handleMemberPress = (member, memberBalance, showYouReceivedButton = false) => {
        // If "You Received" button is active, show notification instead of member modal
        if (showYouReceivedButton) {
            setNotificationVisible(true);
            return;
        }



        // Format member data properly
        const formattedMember = {
            _id: member._id,
            name: member.name || `${member.firstName} ${member.lastName}`.trim(),
            phoneNumber: member.phoneNumber || member.phone || '',
            avatar: member.avatar,
            balance: memberBalance
        };


        setSelectedMember(formattedMember);
        setMemberModalVisible(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Enhanced Header with Gradient */}
            <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={24} color="#8b5cf6" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={styles.headerIconContainer}>
                            <Ionicons name="people" size={20} color="#8b5cf6" />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>{groupData?.name || 'Group Name'}</Text>
                            <Text style={styles.headerSubtitle}>
                                {members.length} members
                            </Text>
                        </View>
                    </View>
                    <View style={styles.headerButtons}>
                        <TouchableOpacity
                            style={styles.notificationButton}
                            onPress={() => {
                                setNotificationVisible(true);
                            }}
                        >
                            <Ionicons name="notifications-outline" size={24} color="#8b5cf6" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
                            <Ionicons name="ellipsis-vertical" size={24} color="#8b5cf6" />
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#8b5cf6']}
                        tintColor="#8b5cf6"
                    />
                }
            >
                <Text style={styles.sectionLabel}>Group Summary</Text>
                {loading ? (
                    <SummarySkeleton />
                ) : (
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryBox}>
                            <View style={styles.summaryContent}>
                                <View style={styles.summaryIcon}>
                                    <Ionicons name="people-outline" size={24} color="#8b5cf6" />
                                </View>
                                <View style={styles.summaryTextContainer}>
                                    <Text style={styles.summaryLabel}>Total Group Spending</Text>
                                    <AnimatedBalance
                                        value={spendingSummary.totalGroupSpending}
                                        style={styles.summaryValue}
                                    />
                                </View>
                            </View>
                        </View>
                        <View style={styles.summaryBox}>
                            <View style={styles.summaryContent}>
                                <View style={styles.summaryIcon}>
                                    <Ionicons name="wallet-outline" size={24} color="#8b5cf6" />
                                </View>
                                <View style={styles.summaryTextContainer}>
                                    <Text style={styles.summaryLabel}>Your Spending</Text>
                                    <AnimatedBalance
                                        value={spendingSummary.userSpending}
                                        style={styles.summaryValue}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {loading ? (
                    <BalanceSummarySkeleton />
                ) : (
                    <BalanceSummary
                        memberBalances={memberBalances}
                        currentUserId={currentUserId}
                        loading={false}
                    />
                )}

                <Text style={styles.sectionLabel}>Group Members</Text>
                <View style={styles.membersBox}>
                    {loading ? (
                        <>
                            <MemberRowSkeleton />
                            <MemberRowSkeleton />
                            <MemberRowSkeleton />
                        </>
                    ) : members.length === 0 ? (
                        <Text style={{ color: '#888', textAlign: 'center', padding: 16 }}>No members found</Text>
                    ) : (
                        members
                            .filter(member => member._id === currentUserId)
                            .map((member, idx) => (
                                <TouchableOpacity
                                    key={member._id || idx}
                                    style={styles.memberRow}
                                    onPress={() => handleMemberPress(member, memberBalances?.members?.find(m => m.member._id === member._id), false)}
                                >
                                    <View style={styles.avatar}>
                                        {(() => {
                                            const contactImage = getContactImage(member);
                                            const phoneNumber = member.phoneNumber || member.phone || member.phoneNumbers?.[0]?.number;

                                            if (contactImage) {
                                                return (
                                                    <Image
                                                        source={{ uri: contactImage }}
                                                        style={styles.avatarImage}
                                                        onError={(e) => {
                                                        }}
                                                    />
                                                );
                                            } else if (member.avatar) {
                                                return (
                                                    <Image
                                                        source={{ uri: member.avatar }}
                                                        style={styles.avatarImage}
                                                        onError={(e) => {
                                                        }}
                                                    />
                                                );
                                            } else {
                                                return (
                                                    <View style={styles.avatarInitials}>
                                                        <Text style={styles.avatarText}>
                                                            {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                        </Text>
                                                    </View>
                                                );
                                            }
                                        })()}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.memberName}>
                                            {member.name} (You)
                                        </Text>
                                        <Text style={styles.memberPhone}>{member.phoneNumber || member.phone || member.phoneNumbers?.[0]?.number || 'No phone'}</Text>
                                    </View>
                                    <View style={styles.balanceContainer}>
                                        <Text style={styles.settledBalance}>
                                            Settled
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                            .concat(
                                members
                                    .filter(member => member._id !== currentUserId)
                                    .map((member, idx) => {
                                        const memberBalance = memberBalances?.members?.find(
                                            m => m.member._id === member._id
                                        );
                                        const owesToCurrentUser = memberBalance?.owedBy?.[currentUserId] || 0;
                                        const currentUserOwes = memberBalance?.owesTo?.[currentUserId] || 0;
                                        // Positive means current user owes money to member
                                        // Negative means member owes money to current user
                                        const displayBalance = currentUserOwes - owesToCurrentUser;

                                        // Check if current user has paid settlements waiting for confirmation (current user paid to member)
                                        const hasPaidSettlements = settlementStatuses[currentUserId]?.paidSettlements?.some(s => {
                                            // In the settlement data:
                                            // - user: the person who owes money (current user)
                                            // - paidBy: the person who originally paid for the transaction (member)
                                            const isCurrentUserOwes = String(s.user?._id) === String(currentUserId);
                                            const isMemberPaid = String(s.paidBy?._id) === String(member._id);
                                            return isCurrentUserOwes && isMemberPaid;
                                        }) || false;

                                        // Check if member has paid settlements that current user needs to confirm (member paid to current user)
                                        const hasReceivedSettlements = settlementStatuses[currentUserId]?.paidSettlements?.some(s => {
                                            // In the settlement data:
                                            // - user: the person who paid the settlement (member)
                                            // - paidBy: the person who originally paid for the transaction (current user)
                                            const isMemberPaid = String(s.user?._id) === String(member._id);
                                            const isCurrentUserPaid = String(s.paidBy?._id) === String(currentUserId);
                                            return isMemberPaid && isCurrentUserPaid;
                                        }) || false;

                                        // Check if there are rejected settlements that need to be handled
                                        const hasRejectedSettlements = settlementStatuses[currentUserId]?.rejectedSettlements?.some(s => {
                                            const isCurrentUserPaid = String(s.paidBy?._id) === String(currentUserId);
                                            const isMemberReceived = String(s.user?._id) === String(member._id);
                                            return isCurrentUserPaid && isMemberReceived;
                                        }) || false;

                                        // Get pending settlements where CURRENT USER owes money to THIS MEMBER
                                        const currentUserPendingSettlements = settlementStatuses[currentUserId]?.pendingSettlements?.filter(s => {
                                            const isCurrentUserOwes = String(s.user?._id) === String(currentUserId);
                                            const isMemberOwed = String(s.paidBy?._id) === String(member._id);
                                            return isCurrentUserOwes && isMemberOwed;
                                        }) || [];

                                        const currentUserPendingAmount = currentUserPendingSettlements.reduce((sum, s) => sum + s.amount, 0);

                                        // Determine button state by NET direction (receiver confirms)
                                        const pairPaidSettlements = (settlementStatuses[currentUserId]?.paidSettlements || []).filter(s => String(s.group) === String(groupData?._id));
                                        let incomingToCurrent = 0; // member -> current user
                                        let outgoingFromCurrent = 0; // current user -> member
                                        pairPaidSettlements.forEach(s => {
                                            if (s.status !== 'paid') return;
                                            const sPaidBy = String(s.paidBy?._id);
                                            const sUser = String(s.user?._id);
                                            const cur = String(currentUserId);
                                            const mem = String(member._id);
                                            if (sUser === mem && sPaidBy === cur) incomingToCurrent += Number(s.amount || 0);
                                            if (sUser === cur && sPaidBy === mem) outgoingFromCurrent += Number(s.amount || 0);
                                        });
                                        const netIncomingToCurrent = incomingToCurrent - outgoingFromCurrent;
                                        const showYouReceivedButton = netIncomingToCurrent > 0;
                                        const showWaitingButton = netIncomingToCurrent < 0;

                                        // Check if there are new payments to settle up (only pending settlements)
                                        const hasNewPaymentsToSettle = currentUserPendingAmount > 0 && !hasPaidSettlements && !hasRejectedSettlements;

                                        const showSettleUpButton = hasNewPaymentsToSettle && displayBalance < 0 && !showWaitingButton && !showYouReceivedButton;

                                        // Show "Handle Rejected" button if there are rejected settlements
                                        const showHandleRejectedButton = hasRejectedSettlements;

                                        return (
                                            <TouchableOpacity
                                                key={`${member._id}-${idx}`}
                                                style={styles.memberRow}
                                                onPress={() => handleMemberPress(member, memberBalance, showYouReceivedButton)}
                                            >
                                                <View style={styles.avatar}>
                                                    {(() => {
                                                        const contactImage = getContactImage(member);
                                                        const phoneNumber = member.phoneNumber || member.phone || member.phoneNumbers?.[0]?.number;

                                                        if (contactImage) {
                                                            return (
                                                                <Image
                                                                    source={{ uri: contactImage }}
                                                                    style={styles.avatarImage}
                                                                    onError={(e) => {
                                                                    }}
                                                                />
                                                            );
                                                        } else if (member.avatar) {
                                                            return (
                                                                <Image
                                                                    source={{ uri: getAvatarUrl(member.avatar) }}
                                                                    style={styles.avatarImage}
                                                                    onError={(e) => {
                                                                    }}
                                                                />
                                                            );
                                                        } else {
                                                            return (
                                                                <View style={styles.avatarInitials}>
                                                                    <Text style={styles.avatarText}>
                                                                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                                    </Text>
                                                                </View>
                                                            );
                                                        }
                                                    })()}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.memberName}>
                                                        {member.name}
                                                    </Text>
                                                    {showSettleUpButton && (
                                                        displayBalance > 0 ? (
                                                            <Text style={[styles.memberBalance, styles.positiveBalance]}>
                                                                +₹{displayBalance.toFixed(2)}
                                                            </Text>
                                                        ) : displayBalance < 0 ? (
                                                            <Text style={[styles.memberBalance, styles.negativeBalance]}>
                                                                -₹{Math.abs(displayBalance).toFixed(2)}
                                                            </Text>
                                                        ) : (
                                                            <Text style={styles.settledBalance}>
                                                                Settled
                                                            </Text>
                                                        )
                                                    )}
                                                    <Text style={styles.memberPhone}>{member.phoneNumber || member.phone || member.phoneNumbers?.[0]?.number || 'No phone'}</Text>
                                                </View>
                                                <View style={styles.rightContainer}>
                                                    {!showSettleUpButton && !showWaitingButton && !showYouReceivedButton && (
                                                        displayBalance > 0 ? (
                                                            <Text style={[styles.memberBalance, styles.positiveBalance]}>
                                                                +₹{displayBalance.toFixed(2)}
                                                            </Text>
                                                        ) : displayBalance < 0 ? (
                                                            <Text style={[styles.memberBalance, styles.negativeBalance]}>
                                                                -₹{Math.abs(displayBalance).toFixed(2)}
                                                            </Text>
                                                        ) : (
                                                            <Text style={styles.settledBalance}>
                                                                Settled
                                                            </Text>
                                                        )
                                                    )}
                                                    {showSettleUpButton ? (
                                                        <TouchableOpacity
                                                            style={styles.settleUpButton}
                                                            onPress={() => handleSettleUp(member, currentUserPendingAmount)}
                                                        >
                                                            <Text style={styles.settleUpButtonText}>
                                                                Settle Up
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ) : showWaitingButton ? (
                                                        <TouchableOpacity
                                                            style={[styles.settleUpButton, styles.waitingButton]}
                                                            disabled={true}
                                                        >
                                                            <Text style={styles.settleUpButtonText}>
                                                                Waiting
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ) : showYouReceivedButton ? (
                                                        <TouchableOpacity
                                                            style={[styles.settleUpButton, styles.youReceivedButton]}
                                                            disabled={true}
                                                        >
                                                            <Text style={styles.settleUpButtonText}>
                                                                You Received
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ) : showHandleRejectedButton ? (
                                                        <TouchableOpacity
                                                            style={[styles.settleUpButton, styles.rejectedButton]}
                                                            onPress={() => handleRejectedSettlements(member._id)}
                                                        >
                                                            <Text style={styles.settleUpButtonText}>
                                                                Handle Rejected
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ) : null}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                            )
                    )}
                </View>

                <View style={styles.transactionBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: '4%', marginTop: '4%', marginBottom: '2%' }}>
                        <Text style={{ fontWeight: '700', fontSize: 14 }}>Transactions</Text>
                        {transactions.length > 2 && (
                            <TouchableOpacity onPress={() => {
                                if (showAllTransactions) {
                                    setShowAllTransactions(false);
                                } else {
                                    setShowAllTransactions(true);
                                    handleLoadMore();
                                }
                            }}>
                                <Text style={{ color: '#007AFF', fontWeight: '600' }}>
                                    {showAllTransactions ? 'Show less' : 'View all'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {loading && page === 1 ? (
                        <>
                            <TransactionSkeleton />
                            <TransactionSkeleton />
                            <TransactionSkeleton />
                        </>
                    ) : (showAllTransactions ? transactions : transactions.slice(0, 2)).length === 0 ? (
                        <Text style={{ color: '#888', textAlign: 'center', padding: 16 }}>No recent transactions</Text>
                    ) : (
                        (showAllTransactions ? transactions : transactions.slice(0, 2)).map((txn) => (
                            <TouchableOpacity
                                key={txn._id}
                                style={styles.transactionCard}
                                onPress={() =>
                                    setExpandedTransactionId(expandedTransactionId === txn._id ? null : txn._id)
                                }
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={styles.transactionIcon}>
                                        <Ionicons name="arrow-up" size={20} color="#8b5cf6" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.transactionTitle}>{txn.title}</Text>
                                        <Text style={styles.transactionSubtitle}>
                                            {formatDate(txn.createdAt)} • {txn.category}
                                        </Text>
                                    </View>
                                    <Text style={styles.transactionAmount}>
                                        -₹{txn.amount.toFixed(2)}
                                    </Text>
                                </View>
                                {expandedTransactionId === txn._id && (
                                    <>
                                        <View style={styles.transactionDivider} />
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.transactionPaidBy}>
                                                Paid by: {txn.paidBy.firstName} {txn.paidBy.lastName}
                                            </Text>
                                        </View>
                                        <Text style={styles.transactionWith}>
                                            With: {txn.splitBetween.map(u =>
                                                u._id === currentUserId
                                                    ? "You"
                                                    : (u.firstName ? `${u.firstName} ${u.lastName}` : u.name)
                                            ).join(', ')}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                    {showAllTransactions && hasMore && !loading && (
                        <TouchableOpacity
                            style={styles.loadMoreButton}
                            onPress={handleLoadMore}
                        >
                            <Text style={styles.loadMoreText}>Load More</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={styles.fabPlus}
                    onPress={() => navigation.navigate('SplitTransactions', {
                        groupData,
                        selectedMembers: members,
                        groupName: groupData?.name || null,
                        groupId: groupData?._id || null
                    })}
                >
                    <Ionicons name="add" size={32} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.fabEye} onPress={() => navigation.navigate('Splitviewtrans', {
                    groupData,
                    selectedMembers: members,
                    groupName: groupData?.name || null,
                    groupId: groupData?._id || null
                })}>
                    <Ionicons name="eye-outline" size={32} color="#8b5cf6" />
                </TouchableOpacity>
            </View>

            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        justifyContent: 'flex-start',
                        alignItems: 'flex-end',
                    }}
                    activeOpacity={1}
                    onPressOut={() => setMenuVisible(false)}
                >
                    <View style={{
                        backgroundColor: '#fff',
                        borderRadius: 12,
                        marginTop: 60,
                        marginRight: 16,
                        paddingVertical: 8,
                        minWidth: 200,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                    }}>
                        <TouchableOpacity
                            style={{ padding: 16 }}
                            onPress={() => {
                                setMenuVisible(false);
                                navigation.navigate('CreateSplitTemplate', {
                                    groupData,
                                    members
                                });
                            }}
                        >
                            <Text style={{ fontSize: 15 }}>Create Template</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ padding: 16 }}
                            onPress={() => {
                                setMenuVisible(false);
                                navigation.navigate('ViewSplitTemplate', {
                                    groupData,
                                    members
                                });
                            }}
                        >
                            <Text style={{ fontSize: 15 }}>View Templates</Text>
                        </TouchableOpacity>

                        {/* Add Member - Available to everyone */}
                        <TouchableOpacity
                            style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}
                            onPress={() => {
                                setMenuVisible(false);
                                handleAddMember();
                            }}
                        >
                            <Text style={{ fontSize: 15 }}>Add Member</Text>
                        </TouchableOpacity>

                        {/* Delete Group - Only for creator */}
                        {isGroupCreator && (
                            <TouchableOpacity
                                style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}
                                onPress={() => {
                                    setMenuVisible(false);
                                    handleDeleteGroup();
                                }}
                            >
                                <Text style={{ fontSize: 15, color: '#ef4444' }}>Delete Group</Text>
                            </TouchableOpacity>
                        )}

                        {/* Leave Group - Only for non-creators */}
                        {!isGroupCreator && (
                            <TouchableOpacity
                                style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}
                                onPress={() => {
                                    setMenuVisible(false);
                                    handleLeaveGroup();
                                }}
                            >
                                <Text style={{ fontSize: 15, color: '#ef4444' }}>Leave Group</Text>
                            </TouchableOpacity>
                        )}

                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={notificationVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setNotificationVisible(false)}
            >
                <View style={styles.notificationModalOverlay}>
                    <View style={styles.notificationModalContainer}>
                        {/* Header */}
                        <View style={styles.notificationHeader}>
                            <View style={styles.notificationHeaderIcon}>
                                <Ionicons name="notifications" size={24} color="#8b5cf6" />
                            </View>
                            <View style={styles.notificationHeaderText}>
                                <Text style={styles.notificationTitle}>Payment Confirmations</Text>
                                <Text style={styles.notificationSubtitle}>
                                    {pendingConfirmations.length} pending confirmation{pendingConfirmations.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.notificationCloseButton}
                                onPress={() => setNotificationVisible(false)}
                            >
                                <Ionicons name="close" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <View style={styles.notificationContent}>
                            {notifLoading ? (
                                <View style={styles.notificationLoadingContainer}>
                                    <ActivityIndicator size="large" color="#8b5cf6" />
                                    <Text style={styles.notificationLoadingText}>Loading confirmations...</Text>
                                </View>
                            ) : pendingConfirmations.length === 0 ? (
                                <View style={styles.notificationEmptyContainer}>
                                    <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                                    <Text style={styles.notificationEmptyTitle}>All Caught Up!</Text>
                                    <Text style={styles.notificationEmptyText}>No pending payment confirmations.</Text>
                                </View>
                            ) : (
                                <ScrollView
                                    style={styles.notificationScrollView}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {pendingConfirmations.map((item, idx) => (
                                        <View key={item.user._id} style={styles.notificationItem}>
                                            <View style={styles.notificationItemHeader}>
                                                <View style={styles.notificationUserAvatar}>
                                                    <Text style={styles.notificationUserInitial}>
                                                        {(item.user.firstName || item.user.name || 'U').charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View style={styles.notificationUserInfo}>
                                                    <Text style={styles.notificationUserName}>
                                                        {item.user.firstName || item.user.name} {item.user.lastName || ''}
                                                    </Text>
                                                    <Text style={styles.notificationUserAmount}>
                                                        Paid you ₹{item.total.toFixed(2)}
                                                    </Text>
                                                </View>
                                                <View style={styles.notificationStatusBadge}>
                                                    <Ionicons name="time" size={12} color="#f59e0b" />
                                                    <Text style={styles.notificationStatusText}>Pending</Text>
                                                </View>
                                            </View>

                                            <View style={styles.notificationItemDetails}>
                                                <Text style={styles.notificationItemMessage}>
                                                    Please confirm if you received this payment.
                                                </Text>
                                                {item.settlements[0] && (
                                                    <View style={styles.notificationSettlementDetails}>
                                                        <Ionicons name="receipt-outline" size={14} color="#6b7280" />
                                                        <Text style={styles.notificationSettlementText}>
                                                            {item.settlements[0].title || 'Settlement'}: ₹{item.settlements[0].amount.toFixed(2)} • {formatDate(item.settlements[0].createdAt || item.settlements[0].date)}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.notificationActionButtons}>
                                                <TouchableOpacity
                                                    style={[styles.notificationConfirmButton, notifLoading && styles.notificationButtonDisabled]}
                                                    onPress={() => handleConfirmRejectAll(item.user._id, item.settlements, true)}
                                                    disabled={notifLoading}
                                                >
                                                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                                                    <Text style={styles.notificationConfirmButtonText}>Confirm</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.notificationRejectButton, notifLoading && styles.notificationButtonDisabled]}
                                                    onPress={() => handleConfirmRejectAll(item.user._id, item.settlements, false)}
                                                    disabled={notifLoading}
                                                >
                                                    <Ionicons name="close" size={16} color="#ffffff" />
                                                    <Text style={styles.notificationRejectButtonText}>Reject</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={settlementConfirmation.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setSettlementConfirmation({ visible: false, member: null, amount: 0, isPaid: false })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmationModal}>
                        <View style={styles.confirmationIconContainer}>
                            <Ionicons
                                name="checkmark-circle-outline"
                                size={40}
                                color="#8b5cf6"
                            />
                        </View>

                        <Text style={styles.confirmationTitle}>Payment Confirmation</Text>

                        <Text style={styles.confirmationMessage}>
                            Was your payment with {settlementConfirmation.member?.name} for ₹{settlementConfirmation.amount.toFixed(2)} successful?
                        </Text>

                        <View style={styles.confirmationAmountContainer}>
                            <Text style={styles.confirmationAmountLabel}>Payment Amount</Text>
                            <Text style={styles.confirmationAmount}>
                                ₹{settlementConfirmation.amount.toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.confirmationButtonContainer}>
                            <TouchableOpacity
                                style={styles.confirmationCancelButton}
                                onPress={() => handleSettlementConfirmation(false)}
                            >
                                <Text style={styles.confirmationCancelText}>Failed</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmationProceedButton}
                                onPress={() => handleSettlementConfirmation(true)}
                            >
                                <LinearGradient
                                    colors={['#8b5cf6', '#7c3aed']}
                                    style={styles.confirmationProceedGradient}
                                >
                                    <Text style={styles.confirmationProceedText}>Success</Text>
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>


            {/* Member Details Modal */}
            <Modal
                visible={memberModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setMemberModalVisible(false)}
            >
                <View style={styles.memberModalContainer}>
                    <View style={styles.memberModalContent}>
                        {/* Header with Close Button */}
                        <View style={styles.memberModalTopBar}>
                            <View style={styles.memberModalHeaderAvatarContainer}>
                                {(() => {
                                    const contactImage = getContactImage(selectedMember);

                                    if (contactImage) {
                                        return (
                                            <Image
                                                source={{ uri: contactImage }}
                                                style={styles.memberModalHeaderAvatar}

                                                onError={(e) => {
                                                }}
                                            />
                                        );
                                    } else if (selectedMember?.avatar) {
                                        return (
                                            <Image
                                                source={{ uri: selectedMember.avatar }}
                                                style={styles.memberModalHeaderAvatar}
                                                onError={(e) => {
                                                }}
                                            />
                                        );
                                    } else {
                                        return (
                                            <View style={[styles.memberModalHeaderAvatar, styles.memberModalHeaderAvatarInitials]}>
                                                <Text style={styles.memberModalHeaderAvatarText}>
                                                    {selectedMember?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                </Text>
                                            </View>
                                        );
                                    }
                                })()}
                            </View>
                            <View style={styles.memberModalHeaderInfo}>
                                <Text style={styles.memberModalHeaderTitle}>
                                    {selectedMember?.name || 'Member Details'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.memberModalHeaderPhone}
                                    onPress={() => handlePhoneCall(selectedMember?.phoneNumber || selectedMember?.phone)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="call" size={12} color="#6b7280" />
                                    <Text style={styles.memberModalHeaderPhoneText}>
                                        {selectedMember?.phoneNumber || selectedMember?.phone || 'No phone'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={styles.memberModalCloseBtn}
                                onPress={() => setMemberModalVisible(false)}
                            >
                                <Ionicons name="close" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>



                        {/* Payment History Section */}
                        <View style={styles.memberModalPaymentSection}>
                            <View style={styles.memberModalSectionHeader}>
                                <Ionicons name="card" size={18} color="#8b5cf6" />
                                <Text style={styles.memberModalSectionTitle}>Payment History</Text>
                            </View>

                            <ScrollView
                                style={styles.memberModalPaymentScrollView}
                                showsVerticalScrollIndicator={false}
                            >
                                {transactions
                                    .filter(transaction => transaction.paidBy?._id === selectedMember?._id)
                                    .slice(0, 5) // Show last 5 payments
                                    .map((transaction, index) => (
                                        <View key={transaction._id} style={styles.memberModalPaymentItem}>
                                            <View style={styles.memberModalPaymentIcon}>
                                                {getCategoryIcon(transaction.category)}
                                            </View>
                                            <View style={styles.memberModalPaymentInfo}>
                                                <Text style={styles.memberModalPaymentTitle}>
                                                    {transaction.title}
                                                </Text>
                                                <Text style={styles.memberModalPaymentDate}>
                                                    {formatDate(transaction.createdAt)}
                                                </Text>
                                                <Text style={styles.memberModalPaymentCategory}>
                                                    {transaction.category}
                                                </Text>
                                            </View>
                                            <View style={styles.memberModalPaymentAmount}>
                                                <Text style={styles.memberModalPaymentAmountText}>
                                                    ₹{transaction.amount.toFixed(2)}
                                                </Text>
                                                <View style={[
                                                    styles.memberModalPaymentStatusBadge,
                                                    transaction.status === 'success' ? styles.paymentSuccessBadge :
                                                        transaction.status === 'pending' ? styles.paymentPendingBadge : styles.paymentFailedBadge
                                                ]}>
                                                    <Text style={styles.memberModalPaymentStatusText}>
                                                        {transaction.status === 'success' ? 'Paid' :
                                                            transaction.status === 'pending' ? 'Pending' : 'Failed'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    ))}

                                {transactions.filter(transaction => transaction.paidBy?._id === selectedMember?._id).length === 0 && (
                                    <View style={styles.memberModalNoPayments}>
                                        <Ionicons name="card-outline" size={48} color="#d1d5db" />
                                        <Text style={styles.memberModalNoPaymentsTitle}>No Payments Yet</Text>
                                        <Text style={styles.memberModalNoPaymentsText}>
                                            {selectedMember?.name} hasn't made any payments in this group yet.
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>

                    </View>
                </View>
            </Modal>

            {/* Delete Group Modal */}
            <Modal
                visible={deleteGroupModal}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteGroupModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmationModalContainer}>
                        <View style={styles.confirmationModalHeader}>
                            <View style={styles.confirmationModalIconContainer}>
                                <Ionicons name="warning" size={32} color="#ef4444" />
                            </View>
                            <Text style={styles.confirmationModalTitle}>Delete Group</Text>
                            <Text style={styles.confirmationModalSubtitle}>
                                Are you sure you want to delete "{groupData?.name}"?
                            </Text>
                        </View>

                        <View style={styles.confirmationModalContent}>
                            <Text style={styles.confirmationModalText}>
                                This action cannot be undone and will permanently remove:
                            </Text>
                            <View style={styles.confirmationModalList}>
                                <Text style={styles.confirmationModalListItem}>• All transactions and expenses</Text>
                                <Text style={styles.confirmationModalListItem}>• All member data and balances</Text>
                                <Text style={styles.confirmationModalListItem}>• All group settings and history</Text>
                            </View>
                        </View>

                        <View style={styles.confirmationModalButtons}>
                            <TouchableOpacity
                                style={styles.confirmationModalCancelButton}
                                onPress={() => setDeleteGroupModal(false)}
                            >
                                <Text style={styles.confirmationModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmationModalDeleteButton}
                                onPress={confirmDeleteGroup}
                            >
                                <Text style={styles.confirmationModalDeleteText}>Delete Group</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Leave Group Modal */}
            <Modal
                visible={leaveGroupModal}
                transparent
                animationType="fade"
                onRequestClose={() => setLeaveGroupModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmationModalContainer}>
                        <View style={styles.confirmationModalHeader}>
                            <View style={styles.confirmationModalIconContainer}>
                                <Ionicons name="exit-outline" size={32} color="#f59e0b" />
                            </View>
                            <Text style={styles.confirmationModalTitle}>Leave Group</Text>
                            <Text style={styles.confirmationModalSubtitle}>
                                Are you sure you want to leave "{groupData?.name}"?
                            </Text>
                        </View>

                        <View style={styles.confirmationModalContent}>
                            <Text style={styles.confirmationModalText}>
                                You will no longer have access to:
                            </Text>
                            <View style={styles.confirmationModalList}>
                                <Text style={styles.confirmationModalListItem}>• Group transactions and expenses</Text>
                                <Text style={styles.confirmationModalListItem}>• Group balances and settlements</Text>
                                <Text style={styles.confirmationModalListItem}>• Group notifications and updates</Text>
                            </View>
                            <Text style={styles.confirmationModalNote}>
                                You can rejoin if another member adds you back.
                            </Text>
                        </View>

                        <View style={styles.confirmationModalButtons}>
                            <TouchableOpacity
                                style={styles.confirmationModalCancelButton}
                                onPress={() => setLeaveGroupModal(false)}
                            >
                                <Text style={styles.confirmationModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmationModalLeaveButton}
                                onPress={confirmLeaveGroup}
                            >
                                <Text style={styles.confirmationModalLeaveText}>Leave Group</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Payment Confirmation Modal */}
            <Modal
                visible={paymentConfirmation.visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPaymentConfirmation({ visible: false, member: null, amount: 0, type: null })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.confirmationModal}>
                        <View style={styles.confirmationIconContainer}>
                            <Ionicons
                                name={paymentConfirmation.type === 'settlement' ? 'cash-outline' : 'card-outline'}
                                size={40}
                                color="#8b5cf6"
                            />
                        </View>

                        <Text style={styles.confirmationTitle}>
                            {paymentConfirmation.type === 'settlement' ? 'Confirm Settlement' : 'Confirm Payment'}
                        </Text>

                        <Text style={styles.confirmationMessage}>
                            {paymentConfirmation.type === 'settlement'
                                ? `Are you sure you want to settle up with ${paymentConfirmation.member?.name}?`
                                : `Are you sure you want to proceed with this payment?`
                            }
                        </Text>

                        <View style={styles.confirmationAmountContainer}>
                            <Text style={styles.confirmationAmountLabel}>
                                {paymentConfirmation.type === 'settlement' ? 'Settlement Amount' : 'Payment Amount'}
                            </Text>
                            <Text style={styles.confirmationAmount}>
                                ₹{paymentConfirmation.amount?.toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.confirmationButtonContainer}>
                            <TouchableOpacity
                                style={styles.confirmationCancelButton}
                                onPress={() => setPaymentConfirmation({ visible: false, member: null, amount: 0, type: null })}
                            >
                                <Text style={styles.confirmationCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmationProceedButton}
                                onPress={() => {
                                    if (paymentConfirmation.type === 'settlement') {
                                        proceedWithSettlement(paymentConfirmation.member, paymentConfirmation.amount);
                                    }
                                    setPaymentConfirmation({ visible: false, member: null, amount: 0, type: null });
                                }}
                            >
                                <LinearGradient
                                    colors={['#8b5cf6', '#7c3aed']}
                                    style={styles.confirmationProceedGradient}
                                >
                                    <Text style={styles.confirmationProceedText}>
                                        {paymentConfirmation.type === 'settlement' ? 'Proceed' : 'Confirm'}
                                    </Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
        paddingTop: '10%',
    },
    headerGradient: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backButton: {
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    headerContent: {
        flex: 1,
        marginLeft: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1f2937',
        letterSpacing: 0.5,
        marginBottom: 6,
        lineHeight: 26,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#8b5cf6',
        fontWeight: '600',
        letterSpacing: 0.3,
        backgroundColor: '#f3e8ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    notificationButton: {
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    menuButton: {
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    scrollView: {
        flex: 1,
    },
    sectionLabel: {
        fontWeight: '800',
        fontSize: 20,
        marginHorizontal: 20,
        marginTop: 24,
        marginBottom: 16,
        color: '#1f2937',
        letterSpacing: 0.5,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    summaryBox: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    summaryContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    summaryIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    summaryValue: {
        fontWeight: '800',
        fontSize: 20,
        color: '#1f2937',
        letterSpacing: 0.5,
    },
    balanceBox: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    balanceLabel: {
        color: '#6b7280',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    balanceAmount: {
        fontWeight: '700',
        fontSize: 18,
        letterSpacing: 0.5,
    },
    oweAmount: {
        color: '#ef4444',
    },
    owedAmount: {
        color: '#22c55e',
    },
    membersBox: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingHorizontal: 4,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarInitials: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    memberPhone: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    memberBalance: {
        fontSize: 16,
        fontWeight: '700',
        marginVertical: 2,
        letterSpacing: 0.3,
    },
    rightContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: 120,
    },
    balanceContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    positiveBalance: {
        color: '#22c55e',
    },
    negativeBalance: {
        color: '#ef4444',
    },
    settledBalance: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    settleUpButton: {
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    waitingButton: {
        backgroundColor: '#6b7280',
        shadowColor: '#6b7280',
        opacity: 0.8,
    },
    youReceivedButton: {
        backgroundColor: '#22c55e',
        shadowColor: '#22c55e',
        opacity: 0.9,
    },
    rejectedButton: {
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
        opacity: 0.9,
    },
    settleUpButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    transactionBox: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 100,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    transactionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    transactionIcon: {
        backgroundColor: '#fef2f2',
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    transactionTitle: {
        fontWeight: '700',
        fontSize: 16,
        color: '#1f2937',
        letterSpacing: 0.3,
    },
    transactionSubtitle: {
        color: '#6b7280',
        fontSize: 14,
        marginTop: 4,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    transactionAmount: {
        color: '#ef4444',
        fontWeight: '800',
        fontSize: 18,
        letterSpacing: 0.5,
    },
    transactionDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 16,
    },
    transactionPaidBy: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    transactionWith: {
        color: '#1f2937',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    loadMoreButton: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    loadMoreText: {
        color: '#8b5cf6',
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 0.3,
    },
    fabContainer: {
        position: 'absolute',
        right: 20,
        bottom: 32,
        flexDirection: 'column-reverse',
        alignItems: 'center',
        zIndex: 10,
    },
    fabEye: {
        backgroundColor: '#ffffff',
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        marginBottom: 16,
    },
    fabPlus: {
        backgroundColor: '#8b5cf6',
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 8,
    },
    loadingContainer: {
        flex: 1,
        padding: '4%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        margin: '4%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    alertContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.2
    },
    alertMessage: {
        fontSize: 15,
        lineHeight: 22,
        color: '#4a4a4a',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 8
    },
    alertButton: {
        backgroundColor: '#00bfff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 120,
        alignItems: 'center',
        marginHorizontal: 8,
        shadowColor: '#00bfff',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 3.84,
        elevation: 5,
    },
    alertButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3
    },
    alertCancelButton: {
        backgroundColor: '#f2f2f7',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 120,
        alignItems: 'center',
        marginHorizontal: 8
    },
    alertCancelButtonText: {
        color: '#00bfff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4.65,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2c2c2c',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.2
    },
    modalText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 8
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 8
    },
    modalButton: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
        elevation: 5,
    },
    confirmButton: {
        backgroundColor: '#00bfff',
        shadowColor: '#00bfff'
    },
    rejectButton: {
        backgroundColor: '#ff3b30',
        shadowColor: '#ff3b30'
    },
    paymentButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 8,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3
    },
    paymentButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600'
    },
    cancelButton: {
        backgroundColor: '#f5f5f7',
        shadowColor: '#000',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3
    },
    cancelButtonText: {
        color: '#00bfff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3
    },
    // Member Modal Styles
    memberModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    memberModalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        width: '90%',
        maxHeight: '95%',
        height: 'auto',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    memberModalTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    memberModalHeaderAvatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    memberModalHeaderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#8b5cf6',
    },
    memberModalHeaderAvatarInitials: {
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberModalHeaderAvatarText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    memberModalHeaderAvatarBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    memberModalHeaderInfo: {
        flex: 1,
    },
    memberModalHeaderTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.3,
        marginBottom: 2,
    },
    memberModalHeaderPhone: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberModalHeaderPhoneText: {
        fontSize: 12,
        color: '#3b82f6',
        marginLeft: 4,
        fontWeight: '500',
    },
    memberModalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f9fafb',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    memberModalProfileSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    memberModalProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberModalAvatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    memberModalAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#8b5cf6',
    },
    memberModalAvatarBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    memberModalProfileInfo: {
        flex: 1,
    },
    memberModalName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    memberModalContactInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberModalPhone: {
        fontSize: 12,
        color: '#6b7280',
        marginLeft: 4,
        fontWeight: '500',
    },
    memberModalPaymentSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        maxHeight: 500,
    },
    memberModalSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    memberModalSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginLeft: 8,
        letterSpacing: 0.3,
    },
    memberModalPaymentScrollView: {
        maxHeight: 550,
    },
    memberModalPaymentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        padding: 10,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    memberModalPaymentIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    memberModalPaymentInfo: {
        flex: 1,
    },
    memberModalPaymentTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    memberModalPaymentDate: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    memberModalPaymentCategory: {
        fontSize: 11,
        color: '#8b5cf6',
        fontWeight: '500',
    },
    memberModalPaymentAmount: {
        alignItems: 'flex-end',
    },
    memberModalPaymentAmountText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    memberModalPaymentStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    memberModalPaymentStatusText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#ffffff',
        letterSpacing: 0.3,
    },
    paymentSuccessBadge: {
        backgroundColor: '#10b981',
    },
    paymentPendingBadge: {
        backgroundColor: '#f59e0b',
    },
    paymentFailedBadge: {
        backgroundColor: '#ef4444',
    },
    memberModalNoPayments: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    memberModalNoPaymentsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 12,
        marginBottom: 4,
    },
    memberModalNoPaymentsText: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 20,
    },
    positiveBalance: {
        color: '#10b981',
    },
    negativeBalance: {
        color: '#ef4444',
    },
    neutralBalance: {
        color: '#6b7280',
    },
    activeBadge: {
        backgroundColor: '#00bfff',
    },
    inactiveBadge: {
        backgroundColor: '#8e8e93',
    },
    // Skeleton loading styles
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    // Notification Modal Styles
    notificationModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    notificationModalContainer: {
        width: '95%',
        maxHeight: '80%',
        minHeight: 300,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    notificationHeaderIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e9d5ff',
    },
    notificationHeaderText: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.3,
    },
    notificationSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
        fontWeight: '500',
    },
    notificationCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f9fafb',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    notificationContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    notificationLoadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    notificationLoadingText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 12,
        fontWeight: '500',
    },
    notificationEmptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    notificationEmptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginTop: 12,
        marginBottom: 4,
    },
    notificationEmptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    notificationScrollView: {
        maxHeight: 350,
        flexGrow: 1,
    },
    notificationItem: {
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    notificationItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    notificationUserAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    notificationUserInitial: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
    },
    notificationUserInfo: {
        flex: 1,
    },
    notificationUserName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    notificationUserAmount: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '600',
    },
    notificationStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    notificationStatusText: {
        fontSize: 12,
        color: '#d97706',
        fontWeight: '600',
        marginLeft: 4,
    },
    notificationItemDetails: {
        marginBottom: 12,
    },
    notificationItemMessage: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
        marginBottom: 8,
    },
    notificationSettlementDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    notificationSettlementText: {
        fontSize: 12,
        color: '#6b7280',
        marginLeft: 6,
        flex: 1,
    },
    notificationActionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    notificationConfirmButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    notificationConfirmButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    notificationRejectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    notificationRejectButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    notificationButtonDisabled: {
        opacity: 0.6,
    },
    // Confirmation Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmationModal: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
        maxWidth: 320,
        width: '100%',
    },
    confirmationIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#f3e8ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#e9d5ff',
    },
    confirmationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmationMessage: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    confirmationAmountContainer: {
        backgroundColor: '#faf5ff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9d5ff',
    },
    confirmationAmountLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 6,
        fontWeight: '500',
    },
    confirmationAmount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    confirmationButtonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
    },
    confirmationCancelButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e9d5ff',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmationCancelText: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '600',
    },
    confirmationProceedButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    confirmationProceedGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        gap: 6,
    },
    confirmationProceedText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    // Confirmation Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmationModalContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    confirmationModalHeader: {
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
    },
    confirmationModalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    confirmationModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmationModalSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    confirmationModalContent: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    confirmationModalText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        marginBottom: 12,
    },
    confirmationModalList: {
        marginBottom: 12,
    },
    confirmationModalListItem: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 4,
    },
    confirmationModalNote: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    confirmationModalButtons: {
        flexDirection: 'row',
        padding: 24,
        paddingTop: 16,
        gap: 12,
    },
    confirmationModalCancelButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmationModalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    confirmationModalDeleteButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmationModalDeleteText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    confirmationModalLeaveButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#f59e0b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmationModalLeaveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
});

export default SplitGroups; 