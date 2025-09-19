import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation, useIsFocused } from '@react-navigation/native';

import { API_BASE_URL } from '../../../../api';

// Skeleton Loading Components
const SkeletonBox = ({ width, height, style }) => {
    const [skeletonOpacity] = useState(new Animated.Value(0.3));

    useEffect(() => {
        const animateSkeleton = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(skeletonOpacity, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(skeletonOpacity, {
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
        <Animated.View
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

const TransactionCardSkeleton = () => (
    <View style={styles.transactionCard}>
        <View style={styles.cardLeft}>
            <SkeletonBox width="70%" height={16} style={{ marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonBox width={24} height={24} style={{ borderRadius: 12, marginRight: 8 }} />
                <SkeletonBox width="50%" height={13} />
            </View>
        </View>
        <View style={styles.cardRight}>
            <SkeletonBox width={80} height={16} style={{ marginBottom: 4 }} />
            <SkeletonBox width={60} height={12} />
        </View>
    </View>
);

const ViewTrans = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true);
            try {
                const token = await AsyncStorage.getItem('token');
                const userData = await AsyncStorage.getItem('userData');
                let uid = null;
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        uid = user._id || user.id;
                    } catch { }
                }
                setUserId(uid);
                const response = await axios.get(
                    `${API_BASE_URL}/api/v1/personal/get-all-transactions`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                // Filter group transactions to only those paid by user
                const filtered = response.data.transactions.filter(t => !t.isGroupTransaction || (t.paidBy && String(t.paidBy) === String(uid)));
                setTransactions(filtered.slice(0, 3));
            } catch (error) {
                setTransactions([]);
            }
            setLoading(false);
        };
        if (isFocused) {
            fetchTransactions();
        }
    }, [isFocused]);

    const renderItem = ({ item }) => {
        let groupOrContactDisplay = '';
        let directionLabel = '';
        let isIncome = item.transactionType === 'income';
        let amountSign = isIncome ? '+' : '-';
        let amountStyle = isIncome ? styles.income : styles.expense;
        let displayTitle = item.title;
        let displayAvatar = null;
        let displayName = '';
        const isContactGroupSettleUp = item.isContactTransaction && item.group;
        if (item.isContactTransaction) {
            if (userId) {
                if (String(item.user) === String(userId)) {
                    // You are the payer
                    directionLabel = '';
                    amountSign = '-';
                    amountStyle = styles.expense;
                    // Show receiver's name and avatar
                    if (item.contact && (item.contact.firstName || item.contact.lastName)) {
                        displayTitle = `You paid ${(item.contact.firstName || '') + ' ' + (item.contact.lastName || '')}`.trim();
                        displayName = `${item.contact.firstName || ''} ${item.contact.lastName || ''}`.trim();
                    } else if (item.contact && item.contact.phone) {
                        displayTitle = `You paid ${item.contact.phone}`;
                        displayName = item.contact.phone;
                    } else {
                        displayTitle = 'You paid';
                        displayName = '';
                    }
                    displayAvatar = item.contact?.imageUrl || null;
                } else if (item.contact && String(item.contact.user) === String(userId)) {
                    // You are the receiver
                    directionLabel = '';
                    amountSign = '+';
                    amountStyle = styles.income;
                    if (item.user && (item.user.firstName || item.user.lastName)) {
                        displayTitle = `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() + ' paid you';
                        displayName = `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim();
                    } else if (item.user && item.user.phoneNumber) {
                        displayTitle = `${item.user.phoneNumber} paid you`;
                        displayName = item.user.phoneNumber;
                    } else {
                        displayTitle = 'Someone paid you';
                        displayName = '';
                    }
                    displayAvatar = item.user?.avatar || null;
                }
            }
            // Settle-up: show group name and contact name
            if (isContactGroupSettleUp) {
                const groupName = item.group?.name || '';
                const contactName = (item.contact.firstName || item.contact.lastName)
                    ? `${item.contact.firstName || ''} ${item.contact.lastName || ''}`.trim()
                    : '';
                groupOrContactDisplay = groupName && contactName ? `${groupName} • ${contactName}` : groupName || contactName;
            } else {
                groupOrContactDisplay = displayName;
            }
        } else if (item.isGroupTransaction) {
            groupOrContactDisplay = item.group?.name || 'Group';
        } else {
            groupOrContactDisplay = item.description ? `  ${item.description}` : '';
        }
        return (
            <View style={styles.transactionCard}>
                <View style={styles.cardLeft}>
                    <Text style={styles.name}>{displayTitle}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        {item.category && (
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryBadgeText}>{item.category}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <Text style={[styles.amount, amountStyle]}>
                        {amountSign}₹{Math.abs(item.amount).toFixed(2)}
                    </Text>
                    <Text style={styles.date}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerAccent} />
                    <Text style={styles.headerText}>Recent Transactions</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('AllViewTrans')}>
                    <Text style={styles.viewAll}>View all</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.headerDivider} />
            {loading ? (
                <View style={{ marginTop: 10 }}>
                    <TransactionCardSkeleton />
                    <TransactionCardSkeleton />
                    <TransactionCardSkeleton />
                </View>
            ) : (
                <View style={{ marginTop: 10 }}>
                    <FlatList
                        data={transactions}
                        renderItem={renderItem}
                        keyExtractor={item => item._id}
                        style={{ marginTop: 10 }}
                        scrollEnabled={false}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 22,
        margin: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e3e8ee',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAccent: {
        width: 4,
        height: 20,
        backgroundColor: '#8b5cf6',
        borderRadius: 2,
        marginRight: 10,
    },
    headerText: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#222',
    },
    headerDivider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 10,
    },
    viewAll: {
        color: '#8b5cf6',
        fontWeight: '600',
        fontSize: 14,
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e3e8ee',
    },
    cardLeft: {
        flex: 1,
    },
    cardRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    name: {
        fontWeight: '600',
        fontSize: 14,
        color: '#222',
        marginBottom: 4,
    },
    amount: {
        fontWeight: 'bold',
        fontSize: 15,
        marginBottom: 2,
    },
    income: {
        color: '#1ecb7b',
    },
    expense: {
        color: '#b48aff',
    },
    categoryBadge: {
        backgroundColor: '#f3e8ff',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: 'flex-start',
    },
    categoryBadgeText: {
        color: '#8b5cf6',
        fontSize: 11,
        fontWeight: '600',
    },
    date: {
        color: '#666',
        fontSize: 12,
    },
});

export default ViewTrans;
