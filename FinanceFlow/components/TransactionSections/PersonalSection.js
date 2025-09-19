import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';


import { API_BASE_URL } from '../../api';

const categories = [
    { key: 'Housing', icon: <FontAwesome5 name="home" size={22} color="#6b7280" />, label: 'Housing' },
    { key: 'Groceries', icon: <MaterialIcons name="local-grocery-store" size={22} color="#6b7280" />, label: 'Groceries' },
    { key: 'Dining', icon: <MaterialIcons name="restaurant" size={22} color="#6b7280" />, label: 'Dining' },
    { key: 'Transport', icon: <MaterialIcons name="directions-car" size={22} color="#6b7280" />, label: 'Transport' },
    { key: 'Travel', icon: <FontAwesome5 name="plane" size={22} color="#6b7280" />, label: 'Travel' },
    { key: 'Entertainment', icon: <MaterialIcons name="movie" size={22} color="#6b7280" />, label: 'Entertainment' },
    { key: 'Coffee', icon: <MaterialIcons name="local-cafe" size={22} color="#6b7280" />, label: 'Coffee' },
    { key: 'Health', icon: <MaterialIcons name="local-hospital" size={22} color="#6b7280" />, label: 'Health' },
    { key: 'Work', icon: <MaterialIcons name="work" size={22} color="#6b7280" />, label: 'Work' },
    { key: 'Utilities', icon: <MaterialIcons name="flash-on" size={22} color="#6b7280" />, label: 'Utilities' },
    { key: 'Gifts', icon: <MaterialIcons name="card-giftcard" size={22} color="#6b7280" />, label: 'Gifts' },
    { key: 'Other', icon: <MaterialIcons name="more" size={22} color="#6b7280" />, label: 'Other' },
];

const PersonalSection = ({
    title,
    setTitle,
    amount,
    setAmount,
    category,
    setCategory,
    description,
    setDescription,
    onSave,
    onShowResult,
    navigation: propNavigation
}) => {
    const navigation = useNavigation();
    const finalNavigation = propNavigation || navigation;
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccount, setSelectedBankAccount] = useState(null);
    const [showBankAccounts, setShowBankAccounts] = useState(false);
    const [transactionType, setTransactionType] = useState('expense');
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [notes, setNotes] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringFrequency, setRecurringFrequency] = useState('monthly');
    const [showRecurringOptions, setShowRecurringOptions] = useState(false);



    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a transaction title');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (!category) {
            Alert.alert('Error', 'Please select a category');
            return;
        }

        if (!selectedBankAccount) {
            Alert.alert('Error', 'Please select a bank account');
            return;
        }

        try {
            setUploading(true);
            // Show processing result screen
            onShowResult('processing', {
                title: 'Processing Transaction',
                subtitle: 'Please wait while we process your transaction...',
                amount: parseFloat(amount),
                category: category,
                bankAccount: selectedBankAccount?.bankName,
            });

            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('userData');

            console.log('Debug Info:');
            console.log('1. API URL:', `${API_BASE_URL}/api/v1/personal/create`);
            console.log('2. Token exists:', !!token);
            console.log('3. User Data exists:', !!userData);

            if (!token || !userData) {
                throw new Error("Authentication token or user data not found");
            }

            const parsedUserData = JSON.parse(userData);
            const currentUserId = parsedUserData._id;

            console.log('4. User ID:', currentUserId);
            console.log('5. Selected Bank Account:', selectedBankAccount);

            // Prepare the transaction data
            const transactionData = {
                title,
                description,
                amount: parseFloat(amount),
                category: category || "Other",
                user: currentUserId,
                notes: notes || "",
                tags: [],
                transactionType: transactionType,
                bankAccountId: selectedBankAccount._id,
                isPersonalTransaction: true,
                paymentStatus: "pending",
                recurring: isRecurring ? {
                    isRecurring: true,
                    frequency: recurringFrequency,
                    nextDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
                } : {
                    isRecurring: false
                }
            };

            console.log('6. Transaction Data:', JSON.stringify(transactionData, null, 2));
            console.log('7. Request Headers:', {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            });

            const response = await axios.post(
                `${API_BASE_URL}/api/v1/personal/create`,
                transactionData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            console.log('8. Response:', response.data);

            if (response.data.success) {
                setPaymentStatus("success");
                console.log('Transaction saved successfully');
                // Transition from processing to success
                onShowResult('success', {
                    title: 'Transaction Successful!',
                    subtitle: 'Your transaction has been completed successfully',
                    amount: parseFloat(amount),
                    transactionId: response.data.transaction?._id || 'TXN' + Date.now(),
                    category: category,
                    bankAccount: selectedBankAccount?.bankName,
                });
            } else {
                console.log('Transaction save failed:', response.data.message);
                throw new Error(response.data.message || 'Failed to save transaction');
            }
        } catch (error) {
            console.error("Error in transaction creation:", error);
            console.log('Error Details:', {
                message: error.message,
                response: error.response ? {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                } : 'No response data',
                config: error.config ? {
                    url: error.config.url,
                    method: error.config.method,
                    headers: error.config.headers
                } : 'No config data'
            });

            setPaymentStatus("failed");
            let errorMessage = "Failed to save transaction. Please try again.";

            if (error.response) {
                errorMessage = error.response.data?.message || errorMessage;
            }

            // Show error result screen
            onShowResult('error', {
                title: 'Transaction Failed',
                subtitle: errorMessage,
                amount: parseFloat(amount),
                category: category,
                bankAccount: selectedBankAccount?.bankName,
            });
        } finally {
            setUploading(false);
        }
    };

    const fetchBankAccounts = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('userData');

            if (!userData) {
                return;
            }

            const parsedUserData = JSON.parse(userData);
            const userId = parsedUserData._id;

            const response = await fetch(`${API_BASE_URL}/api/v1/bankaccounts/get-bank-accounts/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success && data.data) {
                setBankAccounts(data.data);
                // Set primary account as selected by default
                const primaryAccount = data.data.find(acc => acc.isPrimary);
                setSelectedBankAccount(primaryAccount || data.data[0]);
            }
        } catch (error) {
            console.error('Error fetching bank accounts:', error);
            Alert.alert('Error', 'Failed to fetch bank accounts');
        }
    };

    useEffect(() => {
        fetchBankAccounts();
    }, []);

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.sectionContainer} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

                {/* Transaction Title */}
                <View style={styles.section}>
                    <Text style={styles.label}>Title*</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="E.g., Grocery Shopping"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>
                {/* Amount */}
                <View style={styles.section}>
                    <Text style={styles.label}>Amount*</Text>
                    <View style={styles.amountBox}>
                        <Text style={styles.amountPrefix}>₹</Text>
                        <TextInput
                            style={styles.amountInput}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>
                </View>
                {/* Transaction Type */}
                <View style={styles.section}>
                    <Text style={styles.label}>Transaction Type*</Text>
                    <View style={styles.transactionTypeContainer}>
                        <TouchableOpacity
                            style={[
                                styles.transactionTypeBtn,
                                transactionType === 'expense' && styles.transactionTypeBtnActive
                            ]}
                            onPress={() => setTransactionType('expense')}
                        >
                            <Ionicons
                                name="arrow-down-circle-outline"
                                size={22}
                                color={transactionType === 'expense' ? '#fff' : '#6b7280'}
                            />
                            <Text style={[
                                styles.transactionTypeText,
                                transactionType === 'expense' && styles.transactionTypeTextActive
                            ]}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.transactionTypeBtn,
                                transactionType === 'income' && styles.transactionTypeBtnActive
                            ]}
                            onPress={() => setTransactionType('income')}
                        >
                            <Ionicons
                                name="arrow-up-circle-outline"
                                size={22}
                                color={transactionType === 'income' ? '#fff' : '#6b7280'}
                            />
                            <Text style={[
                                styles.transactionTypeText,
                                transactionType === 'income' && styles.transactionTypeTextActive
                            ]}>Income</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {/* Category */}
                <View style={styles.section}>
                    <Text style={styles.label}>Category*</Text>
                    <View style={styles.categoryGrid}>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.key}
                                style={[styles.categoryBtn, category === cat.key && styles.categoryBtnActive]}
                                onPress={() => setCategory(cat.key)}
                            >
                                {cat.icon}
                                <Text style={styles.categoryLabel}>{cat.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={styles.textarea}
                        placeholder="Add details about this transaction"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                {/* Notes Section */}
                <View style={styles.section}>
                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        style={styles.textarea}
                        placeholder="Add any additional notes about this transaction"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                    />
                </View>
                {/* Bank Account Selection */}
                {bankAccounts.length === 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.label}>Select Bank Account*</Text>
                        <View style={styles.noBankAccountContainer}>
                            <Ionicons name="warning-outline" size={48} color="#FF9500" />
                            <Text style={styles.noBankAccountTitle}>No Bank Account Found</Text>
                            <Text style={styles.noBankAccountText}>
                                Please add a bank account to track your balance and manage transactions.
                            </Text>
                            <TouchableOpacity
                                style={styles.addBankAccountButton}
                                onPress={() => navigation.navigate('BankAccount')}
                            >
                                <Text style={styles.addBankAccountButtonText}>Add Bank Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        <Text style={styles.label}>Select Bank Account*</Text>
                        <TouchableOpacity
                            style={styles.bankAccountSelector}
                            onPress={() => setShowBankAccounts(true)}
                        >
                            {selectedBankAccount ? (
                                <View style={styles.selectedBankAccount}>
                                    <View style={styles.bankInfo}>
                                        <Ionicons
                                            name={selectedBankAccount.accountType === 'savings' ? 'cash-outline' : 'card-outline'}
                                            size={24}
                                            color="#009CF9"
                                        />
                                        <View style={styles.bankDetails}>
                                            <Text style={styles.bankName}>{selectedBankAccount.bankName}</Text>
                                            <Text style={styles.accountType}>
                                                {selectedBankAccount.accountType.charAt(0).toUpperCase() + selectedBankAccount.accountType.slice(1)} Account
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.balance}>₹{parseFloat(selectedBankAccount.currentBalance).toFixed(2)}</Text>
                                </View>
                            ) : (
                                <Text style={styles.placeholderText}>Select a bank account</Text>
                            )}
                            <Ionicons name="chevron-down" size={24} color="#888" />
                        </TouchableOpacity>
                    </>
                )}
                {/* Recurring Transaction Section */}
                <View style={styles.section}>
                    <View style={styles.recurringHeader}>
                        <Text style={styles.label}>Recurring Transaction</Text>
                        <TouchableOpacity
                            style={styles.toggleButton}
                            onPress={() => setIsRecurring(!isRecurring)}
                        >
                            <View style={[
                                styles.toggleTrack,
                                isRecurring && styles.toggleTrackActive
                            ]}>
                                <View style={[
                                    styles.toggleThumb,
                                    isRecurring && styles.toggleThumbActive
                                ]} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {isRecurring && (
                        <View style={styles.recurringOptions}>
                            <Text style={styles.recurringLabel}>Frequency</Text>
                            <View style={styles.frequencyGrid}>
                                {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                                    <TouchableOpacity
                                        key={freq}
                                        style={[
                                            styles.frequencyBtn,
                                            recurringFrequency === freq && styles.frequencyBtnActive
                                        ]}
                                        onPress={() => setRecurringFrequency(freq)}
                                    >
                                        <Text style={[
                                            styles.frequencyText,
                                            recurringFrequency === freq && styles.frequencyTextActive
                                        ]}>
                                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[
                        styles.saveBtn,
                        paymentStatus === "success" && styles.successButton,
                        paymentStatus === "failed" && styles.failedButton
                    ]}
                    onPress={handleSave}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>
                            {paymentStatus === "success"
                                ? "Payment Successful ✓"
                                : paymentStatus === "failed"
                                    ? "Payment Failed ✗"
                                    : "Complete Transaction"}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Bank Account Selection Modal */}
                <Modal
                    visible={showBankAccounts}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowBankAccounts(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Bank Account</Text>
                                <TouchableOpacity onPress={() => setShowBankAccounts(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={styles.bankAccountsList}>
                                {bankAccounts.map((account) => (
                                    <TouchableOpacity
                                        key={account._id}
                                        style={[
                                            styles.bankAccountItem,
                                            selectedBankAccount?._id === account._id && styles.selectedBankAccountItem
                                        ]}
                                        onPress={() => {
                                            setSelectedBankAccount(account);
                                            setShowBankAccounts(false);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.bankItemRow}>
                                            <View style={[styles.bankRadio, selectedBankAccount?._id === account._id && styles.bankRadioSelected]} />
                                            <View style={styles.bankInfo}>
                                                <Ionicons
                                                    name={account.accountType === 'savings' ? 'cash-outline' : 'card-outline'}
                                                    size={22}
                                                    color="#8b5cf6"
                                                />
                                                <View style={styles.bankDetails}>
                                                    <Text style={styles.bankName}>{account.bankName}</Text>
                                                    <Text style={styles.accountType}>
                                                        {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)} Account
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.accountRight}>
                                                <Text style={styles.balance}>₹{parseFloat(account.currentBalance).toFixed(2)}</Text>
                                                {account.isPrimary && (
                                                    <View style={styles.primaryBadge}>
                                                        <Ionicons name="star" size={14} color="#fff" />
                                                        <Text style={styles.primaryBadgeText}>Primary</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </ScrollView>


        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        backgroundColor: '#f7fafd',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontWeight: '700',
        fontSize: 15,
        marginBottom: 8,
        color: '#1f2937',
        letterSpacing: 0.3,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 16,
        backgroundColor: '#fff',
        padding: 18,
        marginTop: 4,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#8b5cf6',
    },
    inputPlain: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 18,
        fontSize: 16,
        marginTop: 4,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#8b5cf6',
    },
    amountBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 18,
        marginTop: 4,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#8b5cf6',
        minHeight: 56,
    },
    amountPrefix: {
        fontSize: 18,
        color: '#7c3aed',
        marginRight: 8,
        fontWeight: '600',
    },
    amountInput: {
        flex: 1,
        fontSize: 18,
        paddingVertical: 18,
        color: '#1f2937',
        fontWeight: '500',
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        gap: 12,
    },
    categoryBtn: {
        width: '30%',
        minWidth: 100,
        alignItems: 'center',
        paddingVertical: 18,
        backgroundColor: '#fff',
        borderRadius: 16,
        margin: 2,
        borderWidth: 2,
        borderColor: '#f3f4f6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    categoryBtnActive: {
        backgroundColor: '#f3e8ff',
        borderColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    categoryLabel: {
        fontSize: 13,
        color: '#374151',
        marginTop: 6,
        fontWeight: '600',
        textAlign: 'center',
    },
    textarea: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 18,
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
        marginTop: 4,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#8b5cf6',
    },
    saveBtn: {
        backgroundColor: '#8b5cf6',
        borderRadius: 16,
        paddingVertical: 20,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 17,
        letterSpacing: 0.5,
    },
    bankAccountSelector: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 18,
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#8b5cf6',
    },
    selectedBankAccount: {
        flex: 1,
    },
    bankInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bankDetails: {
        marginLeft: 12,
    },
    bankName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
    },
    accountType: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
        fontWeight: '500',
    },
    balance: {
        fontSize: 15,
        fontWeight: '700',
        color: '#8b5cf6',
        marginTop: 4,
    },
    placeholderText: {
        color: '#9ca3af',
        fontSize: 16,
        fontWeight: '500',
    },
    noBankAccountContainer: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#fffbeb',
        borderRadius: 16,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: '#fed7aa',
    },
    noBankAccountTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginTop: 12,
        marginBottom: 6,
    },
    noBankAccountText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    addBankAccountButton: {
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    addBankAccountButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        width: '90%',
        maxHeight: '80%',
        shadowColor: '#8b5cf6',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
    },
    bankAccountsList: {
        padding: 14,
    },
    bankAccountItem: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    selectedBankAccountItem: {
        borderColor: '#8b5cf6',
        borderWidth: 2,
        backgroundColor: '#f3e8ff',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 3,
    },
    bankItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bankRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        backgroundColor: '#ffffff',
        marginRight: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    bankRadioSelected: {
        borderColor: '#8b5cf6',
        backgroundColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    accountRight: {
        alignItems: 'flex-end',
        marginTop: 8,
    },
    primaryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginTop: 6,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    primaryBadgeText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
        marginLeft: 4,
    },
    transactionTypeContainer: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 16,
        padding: 6,
        marginTop: 4,
    },
    transactionTypeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginHorizontal: 2,
    },
    transactionTypeBtnActive: {
        backgroundColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    transactionTypeText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6b7280',
        marginLeft: 6,
    },
    transactionTypeTextActive: {
        color: '#fff',
    },
    recurringHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    toggleButton: {
        padding: 6,
    },
    toggleTrack: {
        width: 54,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
        padding: 2,
    },
    toggleTrackActive: {
        backgroundColor: '#8b5cf6',
    },
    toggleThumb: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    toggleThumbActive: {
        transform: [{ translateX: 22 }],
    },
    recurringOptions: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#8b5cf6',
    },
    recurringLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 16,
    },
    frequencyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    frequencyBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    frequencyBtnActive: {
        backgroundColor: '#f3e8ff',
        borderColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    frequencyText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
    },
    frequencyTextActive: {
        color: '#8b5cf6',
    },
});

export default PersonalSection; 