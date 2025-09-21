// viewtransaction.js
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    Modal,
    ScrollView,
    TextInput,
    Dimensions,
    StatusBar,
    Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import TransactionDetailsScreen from '../../TransactionSections/TransactionDetailsScreen';

import { API_BASE_URL } from '../../../api';
const screenWidth = Dimensions.get("window").width;

const ViewTransaction = ({ currentUserId: propCurrentUserId }) => {
    const navigation = useNavigation();
    const route = useRoute();

    const { groupData } = route.params || {};
    const [transactions, setTransactions] = useState([]);
    const [transactionLoading, setTransactionLoading] = useState(false);
    const [transactionError, setTransactionError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalTransactions: 0,
    });
    const [filterUserId, setFilterUserId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(propCurrentUserId);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [searchText, setSearchText] = useState('');
    const [showFullDetails, setShowFullDetails] = useState(false);
    const [fullDetailsTransaction, setFullDetailsTransaction] = useState(null);
    const [showSearchInput, setShowSearchInput] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);

    useEffect(() => {
        const getCurrentUserId = async () => {
            if (!propCurrentUserId) {
                const token = await AsyncStorage.getItem("token");
                if (token) {
                    const userDataString = await AsyncStorage.getItem("userData");
                    if (userDataString) {
                        const userData = JSON.parse(userDataString);
                        setCurrentUserId(userData._id);
                    }
                }
            }
        };
        getCurrentUserId();
    }, [propCurrentUserId]);
    useEffect(() => {
        if (groupData && groupData._id) {
            fetchTransactions(1);
        }
    }, [groupData._id, filterUserId]);

    const fetchTransactions = async (page = 1, limit = 10) => {
        if (!groupData || !groupData._id) {
            console.log("No group data or group ID available");
            return;
        }

        try {
            console.log("Starting fetchTransactions with:", {
                groupId: groupData._id,
                page,
                limit,
                filterUserId,
                isAll: filterUserId === "all"
            });

            setTransactionLoading(true);
            setTransactionError(null);

            const token = await AsyncStorage.getItem("token");
            if (!token) {
                console.log("No token found, redirecting to login");
                navigation.navigate("Login");
                return;
            }

            const isAll = filterUserId === "all";
            console.log("Making API request to:", `${API_BASE_URL}/api/v1/splits/group-transactions`);
            console.log("Request params:", {
                groupId: groupData._id,
                userId: isAll ? null : filterUserId,
                page,
                limit,
                filterType: isAll ? "all" : "paidBy"
            });

            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/group-transactions`,
                {
                    params: {
                        groupId: groupData._id,
                        userId: isAll ? null : filterUserId,
                        page,
                        limit,
                        filterType: isAll ? "all" : "paidBy",
                    },
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );


            if (response.data.success) {
                setTransactions(response.data.transactions);
                setPagination({
                    currentPage: response.data.pagination.currentPage,
                    totalPages: response.data.pagination.totalPages,
                    totalTransactions: response.data.pagination.totalTransactions,
                });
                console.log("Transactions updated successfully");
            }
        } catch (error) {
            console.error("Error in fetchTransactions:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    headers: error.config?.headers,
                    params: error.config?.params
                },
                stack: error.stack
            });
            setTransactionError(
                error.response?.data?.message || "Failed to fetch transactions"
            );
        } finally {
            setTransactionLoading(false);
            setRefreshing(false);
        }
    };


    const handleRefresh = () => {
        setRefreshing(true);
        fetchTransactions();
    };

    const handleNextPage = () => {
        if (pagination.currentPage < pagination.totalPages) {
            fetchTransactions(pagination.currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (pagination.currentPage > 1) {
            fetchTransactions(pagination.currentPage - 1);
        }
    };

    const handleDeleteTransaction = (transaction) => {
        setTransactionToDelete(transaction);
        setDeleteModalVisible(true);
    };

    const handleEditTransaction = (transaction) => {
        try {
            if (navigation && navigation.navigate) {
                navigation.navigate('SplitTransactions', {
                    groupName: groupData?.name,
                    groupId: groupData?._id,
                    selectedMembers: transaction.splitBetween || [],
                    groupData: groupData,
                    transactionToEdit: transaction,
                    isEditMode: true
                });
            } else {
                console.error('Navigation not available:', navigation);
                Alert.alert('Error', 'Navigation not available. Please try again.');
            }
        } catch (error) {
            console.error('Navigation error:', error);
            Alert.alert('Error', 'Failed to navigate. Please try again.');
        }
    };

    const performDeleteTransaction = async (transaction) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login again');
                return;
            }

            console.log('Deleting transaction:', transaction._id);
            const deleteUrl = `${API_BASE_URL}/api/v1/splits/group-transactions/${transaction._id}`;

            const response = await axios.delete(deleteUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Delete response:', response.data);

            if (response.data.success) {
                // Remove the transaction from local state
                setTransactions(prev => prev.filter(t => t._id !== transaction._id));

                // Close modals
                setDeleteModalVisible(false);
                setTransactionToDelete(null);
                setSelectedTransaction(null);

                Alert.alert('Success', 'Group transaction deleted successfully. All group members have been notified.');
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

    // Filtered transactions
    const filteredTransactions = transactions.filter(txn => {
        const matchesSearch =
            txn.title?.toLowerCase().includes(searchText.toLowerCase()) ||
            txn.description?.toLowerCase().includes(searchText.toLowerCase());
        return matchesSearch;
    });

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
                            <Ionicons name="list" size={20} color="#8b5cf6" />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerSubtitle}>
                                {groupData?.name || 'Group'}
                            </Text>
                            <Text style={styles.headerTitle}>Transactions</Text>
                        </View>
                    </View>
                    {/* <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="ellipsis-vertical" size={24} color="#8b5cf6" />
                    </TouchableOpacity> */}
                </View>
            </LinearGradient>
            {/* Row 1: List/Table toggle and Search Button */}
            <View style={styles.toggleSearchRow}>
                <View style={styles.toggleBtnGroup}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('list')}
                    >
                        <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>List</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'table' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('table')}
                    >
                        <Text style={[styles.toggleBtnText, viewMode === 'table' && styles.toggleBtnTextActive]}>Table</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={() => {
                        setShowSearchInput(!showSearchInput);
                        if (!showSearchInput) {
                            // Clear search when opening
                            setSearchText('');
                        }
                    }}
                >
                    <Ionicons name="search" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.searchButtonText}>
                        {showSearchInput ? 'Close' : 'Search'}
                    </Text>
                </TouchableOpacity>
            </View>
            {/* Row 2: Search - Conditionally Rendered */}
            {showSearchInput && (
                <View style={styles.searchFilterRowOuter}>
                    <View style={styles.searchBoxWrapper}>
                        <View style={styles.searchBox}>
                            <Ionicons name="search" size={18} color="#8b5cf6" style={{ marginRight: 6 }} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search transactions..."
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholderTextColor="#9ca3af"
                                autoFocus={true}
                            />
                            {searchText.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchText("")}
                                    style={{ marginLeft: 4 }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="close-circle" size={18} color="#8b5cf6" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            )}
            {viewMode === 'list' ? (
                filteredTransactions.length === 0 ? (
                    <Text style={styles.emptyState}>No transactions found</Text>
                ) : (
                    <FlatList
                        data={filteredTransactions}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => setSelectedTransaction(item)}
                                activeOpacity={0.7}
                                style={styles.transactionCardWrapper}
                            >
                                <View style={styles.transactionCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.arrowIcon}>↑</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardTitle}>{item.title}</Text>
                                            <Text style={styles.cardSubtitle}>
                                                {formatDate(item.createdAt)} • {item.category}
                                            </Text>
                                        </View>
                                        <Text style={styles.cardAmount}>-₹{item.amount.toFixed(2)}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.list}
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                )
            ) : (
                <ScrollView horizontal style={styles.tableScroll}>
                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Title</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Date & Time</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Category</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Paid By</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Amount</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Actions</Text>
                        </View>
                        {filteredTransactions.map((item) => {
                            const paidByName = item.paidBy ?
                                (item.paidBy._id === currentUserId ? 'You' : `${item.paidBy.firstName} ${item.paidBy.lastName}`)
                                : '-';
                            return (
                                <TouchableOpacity
                                    style={styles.tableRow}
                                    key={item._id}
                                    onPress={() => setSelectedTransaction(item)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.tableCell, { flex: 2 }]}>{item.title}</Text>
                                    <Text style={[styles.tableCell, { flex: 1 }]}>{formatDate(item.createdAt)}</Text>
                                    <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.category}</Text>
                                    <Text style={[styles.tableCell, { flex: 1.5 }]}>{paidByName}</Text>
                                    <Text style={[styles.tableCell, { flex: 1, color: '#ef4444' }]}>{item.amount.toFixed(2)}</Text>
                                    <View style={[styles.tableActionBtn, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                                        <View style={styles.detailsBtn}>
                                            <Text style={styles.detailsBtnText}>Details</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}
            <TransactionDetailModal
                visible={!!selectedTransaction}
                transaction={selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                onViewFullDetails={() => {
                    setFullDetailsTransaction(selectedTransaction);
                    setSelectedTransaction(null);
                    setShowFullDetails(true);
                }}
                onDelete={handleDeleteTransaction}
                onEdit={handleEditTransaction}
                currentUserId={currentUserId}
            />

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
                                <Ionicons name="warning" size={32} color="#f59e0b" />
                            </View>
                            <Text style={styles.deleteModalTitle}>Delete Group Transaction</Text>
                        </View>

                        <View style={styles.deleteModalContent}>
                            <Text style={styles.deleteModalText}>
                                This transaction is part of "{groupData?.name || 'the group'}" and involves other members.
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
                    title: fullDetailsTransaction?.title,
                    amount: fullDetailsTransaction?.amount,
                    category: fullDetailsTransaction?.category,
                    transactionId: fullDetailsTransaction?._id,
                    bankAccount: fullDetailsTransaction?.bankAccount?.bankName || 'N/A',
                    status: fullDetailsTransaction?.paymentStatus || 'completed',
                    date: fullDetailsTransaction?.createdAt,
                    groupName: groupData?.name || null,
                    contactName: null, // Split transactions don't have individual contacts
                    paidBy: fullDetailsTransaction?.paidBy ?
                        (fullDetailsTransaction.paidBy._id === currentUserId ? 'You' : `${fullDetailsTransaction.paidBy.firstName} ${fullDetailsTransaction.paidBy.lastName}`)
                        : null,
                    members: fullDetailsTransaction?.splitBetween ?
                        fullDetailsTransaction.splitBetween.map(user =>
                            user._id === currentUserId ? 'You' : `${user.firstName} ${user.lastName}`
                        )
                        : null,
                }}
                onClose={() => {
                    setShowFullDetails(false);
                    setFullDetailsTransaction(null);
                }}
            />
        </SafeAreaView>
    );
};

// Utility function for formatting date
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// Add to styles:
const TransactionDetailModal = ({ visible, transaction, onClose, onViewFullDetails, onDelete, onEdit, currentUserId }) => {
    if (!transaction) return null;

    // Check if current user paid for this transaction and no settlements are paid/success
    const canDelete = transaction.paidBy && String(transaction.paidBy._id) === String(currentUserId);

    // Check if any settlements are paid or success
    const hasPaidSettlements = transaction.settlements && transaction.settlements.some(
        settlement => settlement.status === 'paid' || settlement.status === 'success'
    );

    // Can edit/delete only if user paid and no settlements are paid/success
    const canEditOrDelete = canDelete && !hasPaidSettlements;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.detailModal}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={20} color="#6b7280" />
                    </TouchableOpacity>

                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderIcon}>
                            <Ionicons name="receipt-outline" size={24} color="#8b5cf6" />
                        </View>
                        <Text style={styles.modalHeaderTitle}>Transaction Details</Text>
                    </View>

                    <ScrollView contentContainerStyle={styles.detailContent}>
                        <View style={styles.detailHeaderRow}>
                            <Text style={styles.detailTitle}>{transaction.title}</Text>
                        </View>
                        <View style={styles.detailRowTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.amountLabel}>Amount</Text>
                                <Text style={styles.detailAmount}>₹{transaction.amount.toFixed(2)}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.dateLabel}>Date & Time</Text>
                                <Text style={styles.detailDate}>{formatDate(transaction.createdAt)}</Text>
                            </View>
                        </View>
                        {transaction.description && transaction.description.trim() !== '' && transaction.description !== '-' && (
                            <>
                                <Text style={styles.detailLabel}>Description</Text>
                                <Text style={styles.detailValue}>{transaction.description}</Text>
                            </>
                        )}
                        <Text style={styles.detailLabel}>Category</Text>
                        <View style={styles.categoryContainer}>
                            <View style={styles.categoryIconContainer}>
                                <Ionicons name="pricetag-outline" size={16} color="#8b5cf6" />
                            </View>
                            <Text style={styles.categoryText}>{transaction.category || 'Other'}</Text>
                        </View>
                        {transaction.location && (
                            <>
                                <Text style={styles.detailLabel}>Location</Text>
                                <Text style={styles.detailValue}>{transaction.location}</Text>
                            </>
                        )}
                        <Text style={styles.detailLabel}>Paid By</Text>
                        <View style={styles.paidByContainer}>
                            <View style={styles.userAvatar}>
                                <Text style={styles.userAvatarText}>
                                    {transaction.paidBy ?
                                        `${transaction.paidBy.firstName?.charAt(0) || ''}${transaction.paidBy.lastName?.charAt(0) || ''}`.toUpperCase()
                                        : '?'}
                                </Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>
                                    {transaction.paidBy ? `${transaction.paidBy.firstName} ${transaction.paidBy.lastName}` : 'Unknown'}
                                </Text>
                                <Text style={styles.userRole}>Payer</Text>
                            </View>
                            <View style={styles.paidByIcon}>
                                <Ionicons name="card-outline" size={18} color="#10b981" />
                            </View>
                        </View>
                        <Text style={styles.detailLabel}>Split Between</Text>
                        <View style={styles.participantsContainer}>
                            {transaction.splitBetween && transaction.splitBetween.map((user, idx) => {
                                // Calculate individual amount based on split type
                                let individualAmount = 0;
                                if (transaction.splitType === 'custom' && transaction.customAmounts) {
                                    const customAmount = transaction.customAmounts.find(ca => ca.user && ca.user._id === user._id);
                                    individualAmount = customAmount ? customAmount.amount : 0;
                                } else {
                                    // Even split
                                    individualAmount = transaction.amount / transaction.splitBetween.length;
                                }

                                return (
                                    <View key={user._id || idx} style={styles.participantItem}>
                                        <View style={styles.participantAvatar}>
                                            <Text style={styles.participantAvatarText}>
                                                {`${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={styles.participantName}>{user.firstName} {user.lastName}</Text>
                                        <View style={styles.participantAmountContainer}>
                                            <Text style={styles.participantAmount}>₹{individualAmount.toFixed(2)}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                        <View style={styles.actionButtonsContainer}>
                            <TouchableOpacity
                                style={styles.viewFullDetailsBtn}
                                onPress={onViewFullDetails}
                            >
                                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.viewFullDetailsBtnText}>View Full Details</Text>
                            </TouchableOpacity>
                            {canEditOrDelete && (
                                <TouchableOpacity
                                    style={styles.editTransactionBtn}
                                    onPress={() => {
                                        onClose();
                                        onEdit(transaction);
                                    }}
                                >
                                    <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                            {canEditOrDelete && (
                                <TouchableOpacity
                                    style={styles.deleteTransactionBtn}
                                    onPress={() => {
                                        onClose();
                                        onDelete(transaction);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default ViewTransaction;

const styles = StyleSheet.create({
    // Layout
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
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
        paddingVertical: 20,
        paddingTop: 50,
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
        marginBottom: 2,
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
    filterGroupWrapper: {
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    filterListContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 8,
    },
    filterBtn: {
        paddingHorizontal: 18,
        paddingVertical: 7,
        backgroundColor: '#f2f4f8',
        borderRadius: 20,
        marginRight: 8,
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterBtnActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
    },
    filterBtnText: {
        color: '#222',
        fontSize: 15,
        fontWeight: '500',
    },
    filterBtnTextActive: {
        color: '#fff',
        fontWeight: '700',
    },
    list: {
        paddingHorizontal: 0,
        paddingBottom: 20,
        paddingTop: 8,
    },
    // Card
    transactionCardWrapper: {
        marginBottom: 16,
        marginHorizontal: 20,
    },
    transactionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    paidByContainer: {
        flexDirection: 'column',
    },
    cardLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#b0b3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 1,
    },
    paidByName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#222',
    },
    cardAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ef4444',
        textAlign: 'right',
    },
    cardBody: {
        marginBottom: 8,
    },
    detailRow: {
        marginBottom: 6,
    },
    cardValue: {
        fontSize: 14,
        color: '#222',
        lineHeight: 19,
        fontWeight: '500',
    },
    splitDetailsContainer: {
        marginBottom: 8,
        marginTop: 2,
    },
    splitDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    splitDetailName: {
        fontSize: 14,
        color: '#222',
        fontWeight: '500',
        marginRight: 6,
    },
    splitDetailAmount: {
        fontSize: 14,
        color: '#ef4444',
        fontWeight: '700',
    },
    splitDetailText: {
        fontSize: 13,
        color: '#555',
        marginBottom: 2,
    },
    splitMember: {
        fontSize: 13,
        color: '#555',
        marginLeft: 8,
    },
    currentUserSplit: {
        color: '#2563eb',
        fontWeight: '700',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    cardDate: {
        fontSize: 12,
        color: '#b0b3b8',
        fontWeight: '500',
    },
    deleteButton: {
        paddingVertical: 5,
        paddingHorizontal: 14,
        backgroundColor: '#ef4444',
        borderRadius: 6,
        alignSelf: 'flex-end',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    // Utility
    loader: {
        marginTop: 32,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingHorizontal: 8,
    },
    paginationBtn: {
        padding: 12,
        backgroundColor: '#2563eb',
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    paginationBtnDisabled: {
        backgroundColor: '#bdbdbd',
    },
    paginationBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    paginationText: {
        fontSize: 14,
        color: '#555',
    },
    errorBox: {
        alignItems: 'center',
        marginTop: 32,
        padding: 16,
        backgroundColor: '#ffebee',
        borderRadius: 8,
    },
    errorText: {
        color: '#d32f2f',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyState: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 16,
        color: '#777',
    },
    pendingStatus: {
        color: '#f59e42',
        fontWeight: '600',
        fontSize: 12,
    },
    paidStatus: {
        color: '#22c55e',
        fontWeight: '600',
        fontSize: 12,
    },
    arrowIcon: {
        fontSize: 18,
        color: '#ef4444',
        marginRight: 10,
    },
    cardTitle: {
        fontWeight: '700',
        fontSize: 15,
        color: '#222',
    },
    cardSubtitle: {
        color: '#888',
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    detailModal: {
        width: '95%',
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 2,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    closeBtnText: {
        fontSize: 20,
        color: '#6b7280',
        fontWeight: '600',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalHeaderIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e9d5ff',
    },
    modalHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.3,
    },
    detailContent: {
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
    },
    detailHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    detailRowTop: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    amountLabel: {
        fontSize: 12,
        color: '#b0b3b8',
        fontWeight: '600',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    dateLabel: {
        fontSize: 12,
        color: '#b0b3b8',
        fontWeight: '600',
        marginBottom: 2,
        textTransform: 'uppercase',
        textAlign: 'right',
    },
    detailTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: 12,
        letterSpacing: 0.5,
        lineHeight: 26,
    },
    detailAmount: {
        fontSize: 24,
        fontWeight: '800',
        color: '#ef4444',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    detailDate: {
        fontSize: 14,
        color: '#222',
        fontWeight: '700',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 16,
        color: '#1f2937',
        marginBottom: 8,
        fontWeight: '600',
        lineHeight: 22,
        backgroundColor: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3e8ff',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        marginBottom: 6,
    },
    categoryIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    categoryText: {
        fontSize: 15,
        color: '#8b5cf6',
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    paidByContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        marginBottom: 6,
    },
    userAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    userAvatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.5,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 2,
    },
    userRole: {
        fontSize: 12,
        color: '#10b981',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    paidByIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    participantsContainer: {
        marginBottom: 8,
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 6,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    participantAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    participantAvatarText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
    participantName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#1f2937',
    },
    participantAmountContainer: {
        marginRight: 8,
    },
    participantAmount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8b5cf6',
        backgroundColor: '#f3e8ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        textAlign: 'center',
        minWidth: 60,
    },

    toggleSearchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    toggleBtnGroup: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    toggleBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: 'transparent',
    },
    toggleBtnActive: {
        backgroundColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    toggleBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 0.3,
    },
    toggleBtnTextActive: {
        color: '#ffffff',
    },
    searchFilterRowOuter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    searchBoxWrapper: {
        flex: 1,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 16,
        height: 48,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8b5cf6',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
        minWidth: 100,
        justifyContent: 'center',
    },
    searchButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    tableScroll: {
        marginHorizontal: 0,
        marginTop: 16,
    },
    tableContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 0,
        minWidth: screenWidth,
        marginHorizontal: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 2,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    tableHeaderCell: {
        fontWeight: '700',
        color: '#888',
        fontSize: 13,
        textAlign: 'left',
        paddingLeft: 8,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    tableCell: {
        fontSize: 13,
        color: '#222',
        flexWrap: 'wrap',
        minWidth: 0,
        paddingVertical: 2,
        textAlign: 'left',
        textAlignVertical: 'center',
        paddingLeft: 8,
    },
    tableActionBtn: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailsBtn: {
        backgroundColor: '#f3f8ff',
        borderColor: '#2563eb',
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 60,
    },
    detailsBtnText: {
        color: '#2563eb',
        fontWeight: '700',
        fontSize: 12,
    },
    viewFullDetailsBtn: {
        backgroundColor: '#8b5cf6',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        flex: 1,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    viewFullDetailsBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        marginLeft: 8,
        letterSpacing: 0.3,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    editTransactionBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 56,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    deleteTransactionBtn: {
        backgroundColor: '#ef4444',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        width: 56,
        height: 56,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    // Modal Header Styles
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
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
        backgroundColor: '#fef3c7',
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