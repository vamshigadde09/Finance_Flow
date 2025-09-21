import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, ScrollView, Image, Modal, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import TransactionDetailsScreen from '../../../TransactionSections/TransactionDetailsScreen';
import { API_BASE_URL } from '../../../../api';

const typeBadge = (type) => {
    if (type === 'Personal') return { label: 'Personal', color: '#f3e8ff', icon: 'person-outline' };
    if (type === 'Contact') return { label: 'Contact', color: '#f3e8ff', icon: 'people-outline' };
    if (type === 'Group') return { label: 'Group', color: '#f3e8ff', icon: 'people-outline' };
    return { label: type, color: '#f3e8ff', icon: 'document-outline' };
};

const AllViewTrans = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedView, setSelectedView] = useState('Cards'); // 'Cards' or 'Table'
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('All');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterType, setFilterType] = useState('All Types');
    const [filterCategory, setFilterCategory] = useState('All Categories');
    const [userId, setUserId] = useState(null);
    const [groupSummary, setGroupSummary] = useState({ youOwe: 0, owedToYou: 0 });
    const navigation = useNavigation();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [showFullDetails, setShowFullDetails] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [allTransactions, setAllTransactions] = useState([]);

    // Skeleton animation
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

        if (loading) {
            animateSkeleton();
        } else {
            skeletonOpacity.setValue(0.3);
        }

        return () => {
            skeletonOpacity.stopAnimation();
        };
    }, [loading, skeletonOpacity]);

    // Move fetchTransactions outside useEffect
    const fetchTransactions = async (page = 1, isLoadMore = false) => {
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const token = await AsyncStorage.getItem('token');

            // Decode userId from token or get from userData
            let uid = null;
            const userData = await AsyncStorage.getItem('userData');

            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    uid = user._id || user.id;
                } catch (error) {
                    // Error parsing userData
                }
            }
            if (!uid && token) {
                // Try to decode JWT if needed (add a jwt-decode import if you want to support this)
            }
            setUserId(uid);

            const limit = 25;
            const [transRes, groupSummaryRes] = await Promise.all([
                axios.get(
                    `${API_BASE_URL}/api/v1/personal/get-all-transactions`,
                    {
                        params: { page, limit },
                        headers: { Authorization: `Bearer ${token}` }
                    }
                ),
                axios.get(
                    `${API_BASE_URL}/api/v1/splits/get-total-balances`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
            ]);

            const transactionsData = transRes.data.transactions;
            const totalPages = transRes.data.totalPages || 1;



            if (isLoadMore) {
                // Append new transactions to existing ones
                setAllTransactions(prev => {
                    const newTransactions = [...prev, ...transactionsData];

                    return newTransactions;
                });
                setCurrentPage(page);
                setHasMoreData(page < totalPages);
            } else {

                setAllTransactions(transactionsData);
                setCurrentPage(1);
                setHasMoreData(totalPages > 1);
            }

            if (groupSummaryRes.data.success && groupSummaryRes.data.totals) {
                const groupData = {
                    youOwe: parseFloat(groupSummaryRes.data.totals.youOwe) || 0,
                    owedToYou: parseFloat(groupSummaryRes.data.totals.owedToYou) || 0
                };
                setGroupSummary(groupData);
            } else {
                setGroupSummary({ youOwe: 0, owedToYou: 0 });
            }
        } catch (error) {
            if (!isLoadMore) {
                setAllTransactions([]);
                setGroupSummary({ youOwe: 0, owedToYou: 0 });
            }
        }
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchTransactions(1, false);
    }, []);

    // Reset pagination when filters change
    useEffect(() => {
        if (currentPage > 1) {
            // Reset to first page and reload all data when filters change
            setCurrentPage(1);
            setHasMoreData(true);
            fetchTransactions(1, false);
        }
    }, [selectedFilter, selectedTypeFilter, filterType, filterCategory, search]);

    // Filter out group transactions not paid by the user (safety in case backend returns extra)
    useEffect(() => {
        if (userId && allTransactions.length > 0) {
            const filteredTransactions = allTransactions.filter(t => !t.isGroupTransaction || (t.paidBy && String(t.paidBy) === String(userId)));

            setTransactions(filteredTransactions);
        } else {

            setTransactions(allTransactions);
        }
    }, [userId, allTransactions]);

    // Calculate totals for summary cards (Income, Expenses, Net) with correct logic
    let totalIncome = groupSummary.owedToYou;
    let totalExpenses = groupSummary.youOwe;

    if (userId) {

        transactions.forEach((t, index) => {
            // Debug: Log transaction details for first few transactions
            if (index < 5) {
                let type = 'Unknown';
                if (t.isContactTransaction) type = 'Contact';
                else if (t.isGroupTransaction) type = 'Group';
                else if (t.isPersonalTransaction || t.isNormalTransaction) type = 'Personal';

                let sign = t.transactionType === 'income' ? '+' : '-';
            }

            // CONTACT TRANSACTIONS
            if (t.isContactTransaction && t.contact) {
                // Case 1: Current user is the payer (user === userId)
                const userMatch = t.user && (String(t.user._id || t.user) === String(userId));
                if (userMatch) {
                    totalExpenses += t.amount;
                }
                // Case 2: Current user is the receiver (contact.user === userId)
                else if (t.contact.user && String(t.contact.user._id || t.contact.user) === String(userId)) {
                    totalIncome += t.amount;
                }
            }

            // GROUP TRANSACTIONS
            else if (t.isGroupTransaction) {
                const userMatch = t.user && (String(t.user._id || t.user) === String(userId));
                if (userMatch) {
                    if (t.transactionType === 'expense') {
                        totalExpenses += t.amount;
                    } else if (t.transactionType === 'income') {
                        totalIncome += t.amount;
                    }
                }
            }
            // PERSONAL/NORMAL TRANSACTIONS
            else if ((t.isPersonalTransaction && !t.contact) || t.isNormalTransaction) {
                const userMatch = t.user && (String(t.user._id || t.user) === String(userId));
                if (userMatch) {
                    if (t.transactionType === 'expense' && (t.paymentStatus === 'pending' || t.paymentStatus === 'success' || t.paymentStatus === 'completed')) {
                        totalExpenses += t.amount;
                    } else if (t.transactionType === 'income' && (t.paymentStatus === 'pending' || t.paymentStatus === 'success' || t.paymentStatus === 'completed')) {
                        totalIncome += t.amount;
                    }
                }
            }
        });
    }
    const net = totalIncome - totalExpenses;



    // Filter logic
    const filterCounts = {
        All: transactions.length,
        Groups: transactions.filter(t => t.isGroupTransaction).length,
        Personal: transactions.filter(t => t.isPersonalTransaction).length,
        Contacts: transactions.filter(t => t.isContactTransaction).length,
    };



    // Type filter counts (Income/Expenses) - Fixed to include contact transactions
    const typeFilterCounts = {
        All: transactions.length,
        Income: transactions.filter(t => {
            // For contact transactions, check if user is receiver (income) or payer (expense)
            if (t.isContactTransaction && t.contact) {
                const userMatch = t.user && (String(t.user._id || t.user) === String(userId));
                if (userMatch) {
                    // User is the payer, so this is an expense
                    return false;
                } else if (t.contact.user && String(t.contact.user._id || t.contact.user) === String(userId)) {
                    // User is the receiver, so this is income
                    return true;
                }
            }
            // For other transaction types, use the transactionType field
            return t.transactionType === 'income';
        }).length,
        Expenses: transactions.filter(t => {
            // For contact transactions, check if user is receiver (income) or payer (expense)
            if (t.isContactTransaction && t.contact) {
                const userMatch = t.user && (String(t.user._id || t.user) === String(userId));
                if (userMatch) {
                    // User is the payer, so this is an expense
                    return true;
                } else if (t.contact.user && String(t.contact.user._id || t.contact.user) === String(userId)) {
                    // User is the receiver, so this is income
                    return false;
                }
            }
            // For other transaction types, use the transactionType field
            return t.transactionType === 'expense';
        }).length,
    };



    let filteredTransactions = transactions;

    // Apply category filter (All, Groups, Personal, Contacts)
    if (selectedFilter !== 'All') {
        if (selectedFilter === 'Groups') filteredTransactions = filteredTransactions.filter(t => t.isGroupTransaction);
        else if (selectedFilter === 'Personal') filteredTransactions = filteredTransactions.filter(t => t.isPersonalTransaction);
        else if (selectedFilter === 'Contacts') filteredTransactions = filteredTransactions.filter(t => t.isContactTransaction);
    }

    // Apply type filter (All, Income, Expenses) - Fixed for contact transactions
    if (selectedTypeFilter !== 'All') {
        if (selectedTypeFilter === 'Income') {
            filteredTransactions = filteredTransactions.filter(t => {
                // For contact transactions, check if user is receiver (income) or payer (expense)
                if (t.isContactTransaction && t.contact) {
                    const userMatch = t.user && (String(t.user._id || t.user) === String(userId));
                    if (userMatch) {
                        // User is the payer, so this is an expense
                        return false;
                    } else if (t.contact.user && String(t.contact.user._id || t.contact.user) === String(userId)) {
                        // User is the receiver, so this is income
                        return true;
                    }
                }
                // For other transaction types, use the transactionType field
                return t.transactionType === 'income';
            });
        } else if (selectedTypeFilter === 'Expenses') {
            filteredTransactions = filteredTransactions.filter(t => {
                // For contact transactions, check if user is receiver (income) or payer (expense)
                if (t.isContactTransaction && t.contact) {
                    const userMatch = t.user && (String(t.user._id || t.user) === String(userId));
                    if (userMatch) {
                        // User is the payer, so this is an expense
                        return true;
                    } else if (t.contact.user && String(t.contact.user._id || t.contact.user) === String(userId)) {
                        // User is the receiver, so this is income
                        return false;
                    }
                }
                // For other transaction types, use the transactionType field
                return t.transactionType === 'expense';
            });
        }
    }

    // Apply modal filters (legacy support) - Fixed for contact transactions
    if (filterType !== 'All Types') {
        filteredTransactions = filteredTransactions.filter(t => {
            if (filterType === 'Income') {
                // For contact transactions, check if user is receiver (income) or payer (expense)
                if (t.isContactTransaction && t.contact) {
                    const userMatch = t.user && (String(t.user._id || t.user) === String(userId));
                    if (userMatch) {
                        // User is the payer, so this is an expense
                        return false;
                    } else if (t.contact.user && String(t.contact.user._id || t.contact.user) === String(userId)) {
                        // User is the receiver, so this is income
                        return true;
                    }
                }
                // For other transaction types, use the transactionType field
                return t.transactionType === 'income';
            } else {
                // For contact transactions, check if user is receiver (income) or payer (expense)
                if (t.isContactTransaction && t.contact) {
                    const userMatch = t.user && (String(t.user._id || t.user) === String(userId));
                    if (userMatch) {
                        // User is the payer, so this is an expense
                        return true;
                    } else if (t.contact.user && String(t.contact.user._id || t.contact.user) === String(userId)) {
                        // User is the receiver, so this is income
                        return false;
                    }
                }
                // For other transaction types, use the transactionType field
                return t.transactionType === 'expense';
            }
        });
    }
    if (filterCategory !== 'All Categories') {
        filteredTransactions = filteredTransactions.filter(t => t.category === filterCategory);
    }
    if (search.trim()) {
        filteredTransactions = filteredTransactions.filter(t =>
            t.title.toLowerCase().includes(search.toLowerCase()) ||
            (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
        );
    }

    const getType = (item) => {
        if (item.isGroupTransaction) return 'Group';
        if (item.isContactTransaction && item.contact) return 'Contact';
        if (item.isPersonalTransaction) return 'Personal';
        return 'Personal';
    };

    const handleTransactionPress = (transaction) => {
        setSelectedTransaction(transaction);
        setModalVisible(true);
    };

    const handleDeleteTransaction = (transaction) => {
        setTransactionToDelete(transaction);
        setDeleteModalVisible(true);
    };

    const performDeleteTransaction = async (transaction) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login again');
                return;
            }

            // Determine the correct API endpoint based on transaction type
            let deleteUrl = '';
            if (transaction.isGroupTransaction) {
                deleteUrl = `${API_BASE_URL}/api/v1/splits/group-transactions/${transaction._id}`;
            } else if (transaction.isContactTransaction) {
                // Contact transactions don't have a delete endpoint, use personal delete
                deleteUrl = `${API_BASE_URL}/api/v1/personal/delete-transaction/${transaction._id}`;
            } else {
                deleteUrl = `${API_BASE_URL}/api/v1/personal/delete-transaction/${transaction._id}`;
            }

            console.log('Deleting transaction:', transaction._id, 'Type:', transaction.isGroupTransaction ? 'Group' : transaction.isContactTransaction ? 'Contact' : 'Personal');
            console.log('Delete URL:', deleteUrl);

            const response = await axios.delete(deleteUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Delete response:', response.data);

            if (response.data.success) {
                // Remove the transaction from local state
                setAllTransactions(prev => prev.filter(t => t._id !== transaction._id));
                setTransactions(prev => prev.filter(t => t._id !== transaction._id));

                // Close modal and show success
                setDeleteModalVisible(false);
                setTransactionToDelete(null);

                // Show different success messages based on transaction type
                if (transaction.isGroupTransaction) {
                    Alert.alert('Success', 'Group transaction deleted successfully. All group members have been notified.');
                } else {
                    Alert.alert('Success', 'Transaction deleted successfully');
                }
            } else {
                setDeleteModalVisible(false);
                setTransactionToDelete(null);
                Alert.alert('Error', response.data.message || 'Failed to delete transaction');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);

            setDeleteModalVisible(false);
            setTransactionToDelete(null);

            let errorMessage = 'Failed to delete transaction. Please try again.';

            if (error.response) {
                if (error.response.status === 404) {
                    errorMessage = 'Transaction not found or delete endpoint not available.';
                } else if (error.response.status === 403) {
                    errorMessage = 'You do not have permission to delete this transaction.';
                } else if (error.response.status === 401) {
                    errorMessage = 'Please login again to delete transactions.';
                } else if (error.response.data?.message) {
                    errorMessage = error.response.data.message;
                }
            }

            Alert.alert('Error', errorMessage);
        }
    };

    const renderItem = ({ item }) => {

        const type = getType(item);
        const badge = typeBadge(type);
        let groupOrContactDisplay = '';
        let directionLabel = '';
        let isIncome = item.transactionType === 'income';
        let amountSign = isIncome ? '+' : '-';
        let amountStyle = isIncome ? styles.income : styles.expense;
        let displayTitle = item.title;
        let displayAvatar = null;
        let displayName = '';
        const isContactGroupSettleUp = item.isContactTransaction && item.group;
        if (type === 'Contact') {
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
        } else if (type === 'Group') {
            groupOrContactDisplay = item.group?.name || 'Group';
        } else {
            groupOrContactDisplay = item.description ? `  ${item.description}` : '';
        }

        return (
            <TouchableOpacity
                onPress={() => handleTransactionPress(item)}
                onLongPress={() => handleDeleteTransaction(item)}
                activeOpacity={0.8}
                delayLongPress={500}
            >
                <View style={styles.transactionCard}>
                    <View style={styles.cardLeft}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.name}>{displayTitle}</Text>
                        </View>
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
            </TouchableOpacity>
        );
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchTransactions(1, false);
    };

    const handleLoadMore = () => {
        // Only load more if there are no active filters that would affect the data
        const hasActiveFilters = selectedFilter !== 'All' ||
            selectedTypeFilter !== 'All' ||
            filterType !== 'All Types' ||
            filterCategory !== 'All Categories' ||
            search.trim() !== '';

        if (hasMoreData && !loadingMore && !hasActiveFilters) {
            fetchTransactions(currentPage + 1, true);
        }
    };

    // Skeleton Loading Components
    const SkeletonBox = ({ width, height, style }) => (
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

    const SkeletonTransactionCard = () => (
        <View style={styles.transactionCard}>
            <View style={styles.cardLeft}>
                <SkeletonBox width="70%" height={18} style={{ marginBottom: 8 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <SkeletonBox width={60} height={20} style={{ marginRight: 8 }} />
                    <SkeletonBox width={40} height={40} style={{ borderRadius: 20, marginRight: 8 }} />
                    <SkeletonBox width="40%" height={14} />
                </View>
            </View>
            <View style={styles.cardRight}>
                <SkeletonBox width={80} height={18} style={{ marginBottom: 4 }} />
                <SkeletonBox width={60} height={12} />
            </View>
        </View>
    );

    const SkeletonSummaryCard = () => (
        <View style={[styles.summaryCard, { backgroundColor: '#f8f9fa' }]}>
            <SkeletonBox width="60%" height={14} style={{ marginBottom: 8 }} />
            <SkeletonBox width="80%" height={20} />
        </View>
    );

    const SkeletonTableRow = () => (
        <View style={styles.tableRow}>
            <SkeletonBox width="80%" height={16} style={{ flex: 2, marginRight: 8 }} />
            <SkeletonBox width="60%" height={16} style={{ flex: 1, marginRight: 8 }} />
            <SkeletonBox width="70%" height={16} style={{ flex: 1, marginRight: 8 }} />
            <SkeletonBox width="60%" height={16} style={{ flex: 1.2, marginRight: 8 }} />
            <SkeletonBox width="50%" height={16} style={{ flex: 1, marginRight: 8 }} />
            <SkeletonBox width="40%" height={16} style={{ flex: 1 }} />
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Top bar: Back button, Title, Cards/Table toggle */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>All Transactions</Text>
                    </View>
                    <View style={styles.toggleRow}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, selectedView === 'Cards' && styles.toggleBtnActive]}
                            onPress={() => setSelectedView('Cards')}
                        >
                            <Text style={[styles.toggleBtnText, selectedView === 'Cards' && styles.toggleBtnTextActive]}>Cards</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, selectedView === 'Table' && styles.toggleBtnActive]}
                            onPress={() => setSelectedView('Table')}
                        >
                            <Text style={[styles.toggleBtnText, selectedView === 'Table' && styles.toggleBtnTextActive]}>Table</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {/* Category Filter buttons */}
                <View style={styles.filterRow}>
                    {['All', 'Groups', 'Contacts', 'Personal'].map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterBtn, selectedFilter === f && styles.filterBtnActive]}
                            onPress={() => setSelectedFilter(f)}
                        >
                            <Text style={[styles.filterBtnText, selectedFilter === f && styles.filterBtnTextActive]}>{f} {filterCounts[f] !== undefined ? `(${filterCounts[f]})` : ''}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {/* Search bar */}
                <View style={styles.searchBarRow}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search transactions..."
                        placeholderTextColor="#94a3b8"
                        value={search}
                        onChangeText={setSearch}
                    />
                    <TouchableOpacity style={styles.filterIconBtn} onPress={() => setFilterModalVisible(true)}>
                        <Ionicons name="filter" size={20} color="#ffffff" />
                    </TouchableOpacity>
                </View>
                {/* Summary cards - Clickable filters */}
                <View style={styles.summaryRow}>
                    {loading ? (
                        <>
                            <SkeletonSummaryCard />
                            <SkeletonSummaryCard />
                            <SkeletonSummaryCard />
                        </>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[
                                    styles.summaryCard,
                                    { backgroundColor: selectedTypeFilter === 'Income' ? '#dcfce7' : '#dcfce7' },
                                    selectedTypeFilter === 'Income' && styles.summaryCardActive
                                ]}
                                onPress={() => setSelectedTypeFilter(selectedTypeFilter === 'Income' ? 'All' : 'Income')}
                            >
                                <Text style={styles.summaryLabel}>Income</Text>
                                <Text style={styles.summaryIncome}>₹{totalIncome.toFixed(2)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.summaryCard,
                                    { backgroundColor: selectedTypeFilter === 'Expenses' ? '#fef2f2' : '#fef2f2' },
                                    selectedTypeFilter === 'Expenses' && styles.summaryCardActive
                                ]}
                                onPress={() => setSelectedTypeFilter(selectedTypeFilter === 'Expenses' ? 'All' : 'Expenses')}
                            >
                                <Text style={styles.summaryLabel}>Expenses</Text>
                                <Text style={styles.summaryExpense}>₹{totalExpenses.toFixed(2)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.summaryCard,
                                    { backgroundColor: selectedTypeFilter === 'All' ? '#eff6ff' : '#eff6ff' },
                                    selectedTypeFilter === 'All' && styles.summaryCardActive
                                ]}
                                onPress={() => setSelectedTypeFilter('All')}
                            >
                                <Text style={styles.summaryLabel}>Net</Text>
                                <Text style={styles.summaryNet}>₹{net.toFixed(2)}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
                {/* Transaction list (Cards view) or Table view */}
                {loading ? (
                    <View style={{ marginTop: 20 }}>
                        {[1, 2, 3, 4, 5].map((index) => (
                            <SkeletonTransactionCard key={index} />
                        ))}
                    </View>
                ) : selectedView === 'Cards' ? (
                    <View>

                        <FlatList
                            data={filteredTransactions}
                            renderItem={renderItem}
                            keyExtractor={item => item._id}
                            contentContainerStyle={{ paddingBottom: 30 }}
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.1}
                            ListEmptyComponent={() => (
                                <View style={{ alignItems: 'center', marginTop: 50 }}>
                                    <Text style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>No transactions found</Text>
                                    <Text style={{ fontSize: 14, color: '#888' }}>Try adjusting your filters or add some transactions</Text>
                                </View>
                            )}
                            ListFooterComponent={() => {
                                const hasActiveFilters = selectedFilter !== 'All' ||
                                    selectedTypeFilter !== 'All' ||
                                    filterType !== 'All Types' ||
                                    filterCategory !== 'All Categories' ||
                                    search.trim() !== '';

                                if (loadingMore) {
                                    return (
                                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                            <ActivityIndicator size="small" color="#009CF9" />
                                            <Text style={{ marginTop: 8, color: '#666', fontSize: 14 }}>Loading more transactions...</Text>
                                        </View>
                                    );
                                } else if (hasActiveFilters) {
                                    return (
                                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                            <Text style={{ color: '#666', fontSize: 14 }}>Showing filtered results</Text>
                                        </View>
                                    );
                                } else if (hasMoreData) {
                                    return (
                                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                            <Text style={{ color: '#666', fontSize: 14 }}>Scroll to load more</Text>
                                        </View>
                                    );
                                } else if (filteredTransactions.length > 0) {
                                    return (
                                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                            <Text style={{ color: '#666', fontSize: 14 }}>No more transactions to load</Text>
                                        </View>
                                    );
                                }
                                return null;
                            }}
                        />
                    </View>
                ) : (
                    <View style={styles.tableWrapper}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={true}
                            style={styles.horizontalScroll}
                        >
                            <View style={styles.tableContainer}>
                                {/* Table Header */}
                                <View style={styles.tableHeaderRow}>
                                    <Text style={[styles.tableHeaderCell, { width: 200 }]}>Title</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 100 }]}>Type</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 120 }]}>Amount</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 100, flexDirection: 'row', alignItems: 'center' }]}>Date <Ionicons name="arrow-down" size={13} color="#888" /></Text>
                                    <Text style={[styles.tableHeaderCell, { width: 120 }]}>Category</Text>
                                    <Text style={[styles.tableHeaderCell, { width: 150 }]}>Group</Text>
                                </View>
                                {/* Table Rows - Vertical ScrollView */}
                                <ScrollView
                                    style={styles.verticalScroll}
                                    showsVerticalScrollIndicator={true}
                                    nestedScrollEnabled={true}
                                >
                                    {loading ? (
                                        [1, 2, 3, 4, 5].map((index) => (
                                            <SkeletonTableRow key={index} />
                                        ))
                                    ) : (
                                        filteredTransactions.map((item, idx) => {
                                            const type = getType(item);
                                            const badge = typeBadge(type);
                                            const isIncome = item.transactionType === 'income';
                                            return (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.tableRow,
                                                        idx % 2 === 1 && styles.tableRowAlt // alternate row color
                                                    ]}
                                                    key={item._id}
                                                    onPress={() => handleTransactionPress(item)}
                                                    onLongPress={() => handleDeleteTransaction(item)}
                                                    activeOpacity={0.8}
                                                    delayLongPress={500}
                                                >
                                                    <Text
                                                        style={[styles.tableCell, styles.tableCellTitle, { width: 200 }]}
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                    >
                                                        {item.title}
                                                    </Text>
                                                    <View style={[styles.tableCell, styles.tableCellType, { width: 100 }]}>
                                                        <View style={[styles.badge, { backgroundColor: badge.color }]}>
                                                            <Ionicons name={badge.icon} size={14} color="#8b5cf6" />
                                                            <Text style={styles.badgeText}>{badge.label}</Text>
                                                        </View>
                                                    </View>
                                                    <Text
                                                        style={[
                                                            styles.tableCell,
                                                            styles.tableCellAmount,
                                                            { color: isIncome ? '#22c55e' : '#ef4444', fontWeight: '700', width: 120 }
                                                        ]}
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                    >
                                                        {isIncome ? '+' : '-'}₹{Math.abs(item.amount).toFixed(2)}
                                                    </Text>
                                                    <Text style={[styles.tableCell, styles.tableCellDate, { width: 100 }]} numberOfLines={1} ellipsizeMode="tail">
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </Text>
                                                    <Text style={[styles.tableCell, styles.tableCellCategory, { width: 120 }]} numberOfLines={1} ellipsizeMode="tail">
                                                        {item.category}
                                                    </Text>
                                                    <View style={[styles.tableCell, styles.tableCellGroup, { width: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                                                        {type === 'Contact' && (
                                                            item.contact?.imageUrl
                                                                ? <Image source={{ uri: item.contact.imageUrl }} style={styles.avatar} />
                                                                : <Ionicons name="person-circle-outline" size={18} color="#888" style={{ marginRight: 2 }} />
                                                        )}
                                                        <Text numberOfLines={1} ellipsizeMode="tail">
                                                            {type === 'Contact'
                                                                ? (item.contact?.firstName || item.contact?.lastName
                                                                    ? `${item.contact?.firstName || ''} ${item.contact?.lastName || ''}`.trim()
                                                                    : item.contact?.phone || 'Contact')
                                                                : type === 'Group'
                                                                    ? (item.group?.name || 'Group')
                                                                    : ''}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}
                                </ScrollView>
                            </View>
                        </ScrollView>
                    </View>
                )}
                {/* Filter Modal */}
                <Modal
                    visible={filterModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setFilterModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Filter Transactions</Text>
                            <Text style={styles.modalLabel}>Transaction Type</Text>
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={filterType}
                                    onValueChange={setFilterType}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="All Types" value="All Types" />
                                    <Picker.Item label="Income" value="Income" />
                                    <Picker.Item label="Expense" value="Expense" />
                                </Picker>
                            </View>
                            <Text style={styles.modalLabel}>Category</Text>
                            <View style={styles.pickerWrapper}>
                                <Picker
                                    selectedValue={filterCategory}
                                    onValueChange={setFilterCategory}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="All Categories" value="All Categories" />
                                    {Array.from(new Set(transactions.map(t => t.category).filter(Boolean))).map(cat => (
                                        <Picker.Item label={cat} value={cat} key={cat} />
                                    ))}
                                </Picker>
                            </View>
                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity
                                    style={styles.clearBtn}
                                    onPress={() => {
                                        setFilterType('All Types');
                                        setFilterCategory('All Categories');
                                        setFilterModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.clearBtnText}>Clear All</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.applyBtn}
                                    onPress={() => setFilterModalVisible(false)}
                                >
                                    <Text style={styles.applyBtnText}>Apply Filters</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
                {/* Transaction Details Modal */}
                <Modal
                    visible={modalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {selectedTransaction && (
                                <>
                                    {/* Modal Header with Delete Icon */}
                                    <View style={styles.modalHeader}>
                                        <View style={styles.modalHeaderLeft}>
                                            {/* Show sender name + 'paid you' for contact income transactions where user is receiver */}
                                            {selectedTransaction.isContactTransaction && selectedTransaction.contact && selectedTransaction.contact.user && String(selectedTransaction.contact.user) === String(userId) ? (
                                                (() => {
                                                    let showSomeonePaidYou = false;
                                                    let payerName = selectedTransaction.user && (selectedTransaction.user.firstName || selectedTransaction.user.lastName)
                                                        ? `${selectedTransaction.user.firstName || ''} ${selectedTransaction.user.lastName || ''}`.trim()
                                                        : selectedTransaction.user && selectedTransaction.user.phoneNumber
                                                            ? selectedTransaction.user.phoneNumber
                                                            : '';
                                                    if (!payerName) {
                                                        showSomeonePaidYou = true;
                                                    }
                                                    return (
                                                        <Text style={styles.modalTitle}>
                                                            {payerName ? `${payerName} paid you` : 'Someone paid you'}
                                                        </Text>
                                                    );
                                                })()
                                            ) : (
                                                <Text style={styles.modalTitle}>{selectedTransaction.title}</Text>
                                            )}
                                        </View>
                                        <TouchableOpacity
                                            style={styles.modalDeleteIcon}
                                            onPress={() => {
                                                setModalVisible(false);
                                                handleDeleteTransaction(selectedTransaction);
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={24} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                    {/* Modal amount: use + and green for income, - and red for expense, and for contacts use role */}
                                    {selectedTransaction.isContactTransaction ? (
                                        (() => {
                                            let isReceiver = selectedTransaction.contact && String(selectedTransaction.contact.user) === String(userId);
                                            let isPayer = String(selectedTransaction.user) === String(userId);
                                            if (isReceiver) {
                                                return (
                                                    <Text style={styles.modalAmountIncome}>
                                                        +₹{Math.abs(selectedTransaction.amount).toFixed(2)}
                                                    </Text>
                                                );
                                            } else if (isPayer) {
                                                return (
                                                    <Text style={styles.modalAmountExpense}>
                                                        -₹{Math.abs(selectedTransaction.amount).toFixed(2)}
                                                    </Text>
                                                );
                                            } else {
                                                // fallback
                                                return (
                                                    <Text style={styles.modalAmountExpense}>
                                                        -₹{Math.abs(selectedTransaction.amount).toFixed(2)}
                                                    </Text>
                                                );
                                            }
                                        })()
                                    ) : (
                                        <Text style={selectedTransaction.transactionType === 'income' ? styles.modalAmountIncome : styles.modalAmountExpense}>
                                            {selectedTransaction.transactionType === 'income' ? '+' : '-'}₹{Math.abs(selectedTransaction.amount).toFixed(2)}
                                        </Text>
                                    )}
                                    <Text style={styles.modalLabel}>Category:</Text>
                                    <Text style={styles.modalValue}>{selectedTransaction.category}</Text>
                                    <Text style={styles.modalLabel}>Date:</Text>
                                    <Text style={styles.modalValue}>{new Date(selectedTransaction.createdAt).toLocaleString()}</Text>
                                    {selectedTransaction.isContactTransaction && !selectedTransaction.isGroupTransaction && selectedTransaction.contact && (
                                        <View style={styles.contactDetailsSection}>
                                            <Text style={styles.modalLabel}>Contact Details:</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8 }}>
                                                {selectedTransaction.contact.avatar ? (
                                                    <Image source={{ uri: selectedTransaction.contact.avatar }} style={styles.modalContactAvatar} />
                                                ) : (
                                                    <Ionicons name="person-circle-outline" size={36} color="#888" style={{ marginRight: 8 }} />
                                                )}
                                                <View>
                                                    <Text style={styles.modalContactName}>
                                                        {(selectedTransaction.contact.firstName || '') + ' ' + (selectedTransaction.contact.lastName || '')}
                                                    </Text>
                                                    {selectedTransaction.contact.phone && (
                                                        <Text style={styles.modalContactPhone}>{selectedTransaction.contact.phone}</Text>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                    {selectedTransaction.description ? (
                                        <>
                                            <Text style={styles.modalLabel}>Description:</Text>
                                            <Text style={styles.modalValue}>{selectedTransaction.description}</Text>
                                        </>
                                    ) : null}
                                    <TouchableOpacity
                                        style={styles.viewFullDetailsBtn}
                                        onPress={() => {
                                            setModalVisible(false);
                                            setShowFullDetails(true);
                                        }}
                                    >
                                        <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                                        <Text style={styles.viewFullDetailsBtnText}>View Full Details</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.closeBtn}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={styles.closeBtnText}>Close</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>

                {/* Delete Confirmation Modal */}
                <Modal
                    visible={deleteModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setDeleteModalVisible(false)}
                >
                    <View style={styles.deleteModalOverlay}>
                        <View style={styles.deleteModalContainer}>
                            <View style={styles.deleteModalHeader}>
                                <View style={styles.deleteModalIconContainer}>
                                    <Ionicons
                                        name="warning"
                                        size={32}
                                        color={transactionToDelete?.isGroupTransaction ? "#f59e0b" : "#ef4444"}
                                    />
                                </View>
                                <Text style={styles.deleteModalTitle}>
                                    {transactionToDelete?.isGroupTransaction ? "Delete Group Transaction" : "Delete Transaction"}
                                </Text>
                            </View>

                            <View style={styles.deleteModalContent}>
                                {transactionToDelete?.isGroupTransaction ? (
                                    <>
                                        <Text style={styles.deleteModalText}>
                                            This transaction is part of "{transactionToDelete?.group?.name || 'the group'}" and involves other members.
                                        </Text>
                                        <Text style={styles.deleteModalSubtext}>
                                            Deleting this transaction will:
                                        </Text>
                                        <View style={styles.deleteModalList}>
                                            <Text style={styles.deleteModalListItem}>• Remove it from all group members' records</Text>
                                            <Text style={styles.deleteModalListItem}>• Update everyone's balances and settlements</Text>
                                            <Text style={styles.deleteModalListItem}>• Affect the group's financial calculations</Text>
                                        </View>
                                        <Text style={styles.deleteModalWarning}>
                                            This action cannot be undone.
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.deleteModalText}>
                                        Are you sure you want to delete this transaction? This action cannot be undone.
                                    </Text>
                                )}
                            </View>

                            <View style={styles.deleteModalButtons}>
                                <TouchableOpacity
                                    style={styles.deleteModalCancelButton}
                                    onPress={() => {
                                        setDeleteModalVisible(false);
                                        setTransactionToDelete(null);
                                    }}
                                >
                                    <Text style={styles.deleteModalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.deleteModalDeleteButton}
                                    onPress={() => performDeleteTransaction(transactionToDelete)}
                                >
                                    <Text style={styles.deleteModalDeleteText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Full Transaction Details Screen */}
                <TransactionDetailsScreen
                    visible={showFullDetails}
                    transactionData={{
                        title: selectedTransaction?.title,
                        amount: selectedTransaction?.amount,
                        category: selectedTransaction?.category,
                        transactionId: selectedTransaction?._id,
                        bankAccount: selectedTransaction?.bankAccount?.bankName || 'N/A',
                        status: selectedTransaction?.paymentStatus || 'completed',
                        date: selectedTransaction?.createdAt,
                        groupName: selectedTransaction?.group?.name || null,
                        contactName: selectedTransaction?.contact?.firstName && selectedTransaction?.contact?.lastName
                            ? `${selectedTransaction.contact.firstName} ${selectedTransaction.contact.lastName}`.trim()
                            : selectedTransaction?.contact?.phone || null,
                        paidBy: selectedTransaction?.paidBy ?
                            (String(selectedTransaction.paidBy._id || selectedTransaction.paidBy) === String(userId) ? 'You' : `${selectedTransaction.paidBy.firstName || ''} ${selectedTransaction.paidBy.lastName || ''}`.trim())
                            : null,
                        members: selectedTransaction?.splitBetween ?
                            selectedTransaction.splitBetween.map(user =>
                                String(user._id || user) === String(userId) ? 'You' : `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            )
                            : null,
                    }}
                    onClose={() => setShowFullDetails(false)}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8fafc', padding: 0, paddingTop: '10%' },
    container: { flex: 1, backgroundColor: '#f8fafc', padding: 0, },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        letterSpacing: 0.5,
    },
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 0.2,
        borderColor: '#000000',
    },
    toggleBtn: {
        paddingVertical: 4,
        paddingHorizontal: 14,
    },
    toggleBtnActive: {
        backgroundColor: '#8b5cf6',
    },
    toggleBtnText: {
        color: '#000000',
        fontWeight: '600',
    },
    toggleBtnTextActive: {
        color: '#fff',
    },
    filterRow: {
        flexDirection: 'row',
        marginBottom: 16,
        marginTop: 8,
        paddingHorizontal: 16,
        flexWrap: 'wrap',
        gap: 8,
    },
    filterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    filterBtnActive: {
        backgroundColor: '#8b5cf6',
        borderColor: '#8b5cf6',
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    filterBtnText: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    filterBtnTextActive: {
        color: '#ffffff',
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    searchBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '500',
        color: '#1e293b',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    filterIconBtn: {
        padding: 12,
        backgroundColor: '#8b5cf6',
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingHorizontal: 16,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    summaryCardActive: {
        borderWidth: 2,
        borderColor: '#009CF9',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryLabel: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    summaryIncome: {
        color: '#22c55e',
        fontWeight: '600',
        fontSize: 15,
    },
    summaryExpense: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: 15,
    },
    summaryNet: {
        color: '#3b82f6',
        fontWeight: '600',
        fontSize: 15,
    },
    summaryCount: {
        fontSize: 10,
        color: '#6b7280',
        fontWeight: '500',
        marginTop: 2,
    },
    transactionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        marginHorizontal: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardLeft: { flex: 1, marginRight: 10 },
    name: { fontWeight: '700', fontSize: 15, color: '#1e293b', marginBottom: 6, letterSpacing: 0.3 },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 1,
        marginRight: 6,
        alignSelf: 'flex-start',
    },
    badgeText: { fontSize: 11, color: '#8b5cf6', marginLeft: 4, fontWeight: '500' },
    desc: { color: '#6b7280', fontSize: 12, flexShrink: 1 },
    cardRight: { alignItems: 'flex-end', minWidth: 80 },
    amount: { fontWeight: '700', fontSize: 16, marginBottom: 4, letterSpacing: 0.3 },
    income: { color: '#22c55e' },
    expense: { color: '#ef4444' },
    date: { color: '#64748b', fontSize: 12, fontWeight: '500' },
    tableWrapper: {
        flex: 1,
        marginTop: 10,
    },
    horizontalScroll: {
        flex: 1,
    },
    horizontalScrollContent: {
        flexGrow: 1,
    },
    verticalScroll: {
        flex: 1,
    },
    tableContainer: {
        width: 790, // Fixed width for proper alignment (increased for wider Group column)
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        marginHorizontal: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        borderBottomWidth: 2,
        borderBottomColor: '#e2e8f0',
        paddingBottom: 16,
        marginBottom: 8,
        backgroundColor: '#f8fafc',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    tableHeaderCell: {
        fontWeight: '700',
        color: '#1e293b',
        fontSize: 15,
        paddingHorizontal: 12,
        letterSpacing: 0.3,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingVertical: 16,
        backgroundColor: '#ffffff',
    },
    tableCell: {
        fontSize: 14,
        color: '#1e293b',
        paddingHorizontal: 12,
        textAlignVertical: 'center',
        alignSelf: 'center',
        fontWeight: '500',
    },
    tableCellTitle: {
        maxWidth: 200, // Fixed width for title column
        textAlign: 'left',
    },
    tableCellType: {
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tableCellAmount: {
        width: 120,
        textAlign: 'right',
        fontWeight: '700',
    },
    tableCellDate: {
        width: 100,
        textAlign: 'center',
    },
    tableCellCategory: {
        width: 120,
        textAlign: 'center',
    },
    tableCellGroup: {
        width: 150,
        textAlign: 'center',
    },
    tableRowAlt: {
        backgroundColor: '#f8fafc',
    },
    avatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        marginRight: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'stretch',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalHeaderLeft: {
        flex: 1,
    },
    modalDeleteIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
        textAlign: 'center',
    },
    modalAmountIncome: {
        fontSize: 22,
        fontWeight: '700',
        color: '#22c55e', // green
        marginBottom: 10,
        textAlign: 'center',
    },
    modalAmountExpense: {
        fontSize: 22,
        fontWeight: '700',
        color: '#ef4444', // red
        marginBottom: 10,
        textAlign: 'center',
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 10,
        color: '#222',
    },
    modalValue: {
        fontSize: 15,
        color: '#444',
        marginBottom: 4,
    },
    closeBtn: {
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 18,
        marginTop: 18,
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: '#f7fafd',
    },
    picker: {
        height: 40,
        width: '100%',
    },
    modalBtnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 18,
    },
    clearBtn: {
        backgroundColor: '#f0f2f5',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 18,
    },
    clearBtnText: {
        color: '#222',
        fontWeight: '700',
    },
    applyBtn: {
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 18,
    },
    applyBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    categoryBadge: {
        backgroundColor: '#f3e8ff',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    categoryBadgeText: {
        color: '#8b5cf6',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    contactDetailsSection: {
        marginTop: 12,
        marginBottom: 8,
        padding: 10,
        backgroundColor: '#f7fafd',
        borderRadius: 10,
    },
    modalContactAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
        backgroundColor: '#e0e7ef',
    },
    modalContactName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#222',
    },
    modalContactPhone: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    viewFullDetailsBtn: {
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 18,
        marginTop: 18,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    viewFullDetailsBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 8,
    },
    // Delete Modal Styles
    deleteModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    deleteModalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    deleteModalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    deleteModalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
    },
    deleteModalContent: {
        marginBottom: 24,
    },
    deleteModalText: {
        fontSize: 16,
        color: '#64748b',
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 16,
    },
    deleteModalSubtext: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    deleteModalList: {
        marginBottom: 16,
    },
    deleteModalListItem: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
        marginBottom: 8,
        paddingLeft: 8,
    },
    deleteModalWarning: {
        fontSize: 14,
        color: '#ef4444',
        fontWeight: '600',
        textAlign: 'center',
        backgroundColor: '#fef2f2',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    deleteModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    deleteModalCancelButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    deleteModalCancelText: {
        color: '#64748b',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteModalDeleteButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#ef4444',
    },
    deleteModalDeleteText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default AllViewTrans;