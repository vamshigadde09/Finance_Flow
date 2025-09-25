import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


import { API_BASE_URL } from '../../api';

const openWithFallback = async (schemeUrl, storeId) => {
    try {
        const can = await Linking.canOpenURL(schemeUrl);
        if (can) {
            await Linking.openURL(schemeUrl);
            return;
        }
    } catch (_e) { }
    const storeUrl = Platform.OS === 'android'
        ? `https://play.google.com/store/apps/details?id=${storeId}`
        : 'https://apps.apple.com';
    Linking.openURL(storeUrl);
};

const PAYMENT_APPS = {
    GPay: { scheme: 'tez://upi/pay', pkg: 'com.google.android.apps.nbu.paisa.user' },
    PhonePe: { scheme: 'phonepe://upi/pay', pkg: 'com.phonepe.app' },
    Paytm: { scheme: 'paytmmp://upi/pay', pkg: 'net.one97.paytm' },
};

const openPaymentApp = async (appName) => {
    const appConfig = PAYMENT_APPS[appName];
    if (!appConfig) {
        Alert.alert('Error', `Payment app "${appName}" not configured.`);
        return;
    }
    try {
        await openWithFallback(appConfig.scheme, appConfig.pkg);
    } catch (error) {
        console.error(`Error opening ${appName}:`, error);
        Alert.alert('Error', `Failed to open ${appName}. Please try again or install the app.`);
    }
};

const categories = [
    { key: 'Housing', label: 'Housing', icon: <FontAwesome5 name="home" size={22} color="#6b7280" /> },
    { key: 'Groceries', label: 'Groceries', icon: <MaterialIcons name="shopping-cart" size={22} color="#6b7280" /> },
    { key: 'Dining', label: 'Dining', icon: <MaterialIcons name="restaurant" size={22} color="#6b7280" /> },
    { key: 'Transport', label: 'Transport', icon: <MaterialIcons name="directions-car" size={22} color="#6b7280" /> },
    { key: 'Travel', label: 'Travel', icon: <Ionicons name="airplane-outline" size={22} color="#6b7280" /> },
    { key: 'Entertainment', label: 'Entertainment', icon: <MaterialIcons name="movie" size={22} color="#6b7280" /> },
    { key: 'Coffee', label: 'Coffee', icon: <MaterialIcons name="local-cafe" size={22} color="#6b7280" /> },
    { key: 'Health', label: 'Health', icon: <FontAwesome5 name="heartbeat" size={20} color="#6b7280" /> },
    { key: 'Work', label: 'Work', icon: <MaterialIcons name="work-outline" size={22} color="#6b7280" /> },
    { key: 'Utilities', label: 'Utilities', icon: <MaterialIcons name="flash-on" size={22} color="#6b7280" /> },
    { key: 'Gifts', label: 'Gifts', icon: <Ionicons name="gift-outline" size={22} color="#6b7280" /> },
    { key: 'Other', label: 'Other', icon: <MaterialIcons name="category" size={22} color="#6b7280" /> },
];

const SplitSection = ({
    splitWith,
    setSplitWith,
    title,
    setTitle,
    amount,
    setAmount,
    category,
    setCategory,
    description,
    setDescription,
    onShowResult,
    navigation: propNavigation
}) => {
    const navigation = useNavigation();
    const finalNavigation = propNavigation || navigation;
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [splitType, setSplitType] = useState('even');
    const [customAmounts, setCustomAmounts] = useState({});
    const [shareCounts, setShareCounts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccount, setSelectedBankAccount] = useState(null);
    const [showBankAccounts, setShowBankAccounts] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const amountInputRef = React.useRef(null);



    const fetchGroups = async () => {
        try {
            setLoading(true);
            setError(null);

            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                throw new Error("User session expired");
            }

            const user = JSON.parse(userData);
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/groups/${user._id}`,
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                }
            );

            if (response.data.success && response.data.groups) {
                // Sort groups by createdAt in descending order (newest first)
                const sortedGroups = response.data.groups.sort((a, b) => {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                setGroups(sortedGroups);
            } else {
                setGroups([]);
                setError("No groups found");
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
            setError(error.response?.data?.message || "Failed to fetch groups");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (showGroupModal) {
            fetchGroups();
        }
    }, [showGroupModal]);

    const handleGroupSelect = (group) => {
        setSplitWith(group);
        setShowGroupModal(false);
    };

    const calculateEvenSplit = () => {
        if (!amount || !selectedMembers.length) return;
        const splitAmount = parseFloat(amount) / selectedMembers.length;
        const newCustomAmounts = {};
        selectedMembers.forEach(member => {
            newCustomAmounts[member._id] = splitAmount.toFixed(2);
        });
        setCustomAmounts(newCustomAmounts);
    };

    const handleCustomAmountChange = (memberId, value) => {
        setCustomAmounts(prev => ({
            ...prev,
            [memberId]: value
        }));
    };

    const toggleMember = (member) => {
        setSelectedMembers((prev) => {
            const isSelected = prev.some((m) => m._id === member._id);
            if (isSelected) {
                // Remove member
                const updated = prev.filter((m) => m._id !== member._id);
                // Remove custom amount if present
                const newCustomAmounts = { ...customAmounts };
                delete newCustomAmounts[member._id];
                setCustomAmounts(newCustomAmounts);
                return updated;
            } else {
                // Add member
                return [...prev, member];
            }
        });
    };

    useEffect(() => {
        if (splitType === 'even' && amount && selectedMembers.length) {
            calculateEvenSplit();
        }
    }, [amount, selectedMembers, splitType]);

    useEffect(() => {
        if (splitWith && splitWith.members) {
            setSelectedMembers(splitWith.members);
            setShareCounts(new Array(splitWith.members.length).fill(1));
        } else {
            setSelectedMembers([]);
            setShareCounts([]);
        }
    }, [splitWith]);

    const fetchBankAccounts = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                throw new Error("User session expired");
            }

            const user = JSON.parse(userData);
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/bankaccounts/get-bank-accounts/${user._id}`,
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                }
            );

            if (response.data.success && response.data.data) {
                setBankAccounts(response.data.data);
                // Set primary account as selected by default
                const primaryAccount = response.data.data.find(acc => acc.isPrimary);
                setSelectedBankAccount(primaryAccount || response.data.data[0]);
            }
        } catch (error) {
            console.error("Error fetching bank accounts:", error);
            setError("Failed to fetch bank accounts");
        }
    };

    useEffect(() => {
        fetchBankAccounts();
    }, []);

    const validateForm = () => {
        const newErrors = {};

        if (!title.trim()) {
            newErrors.title = 'Transaction title is required';
        }

        if (!amount || parseFloat(amount) <= 0) {
            newErrors.amount = 'Please enter a valid amount';
        }

        if (!category) {
            newErrors.category = 'Please select a category';
        }

        if (!selectedBankAccount) {
            newErrors.bankAccount = 'Please select a bank account';
        }

        if (!splitWith) {
            newErrors.group = 'Please select a group';
        }

        if (selectedMembers.length === 0) {
            newErrors.members = 'Please select at least one member to split with';
        }

        if (splitType === 'custom') {
            const totalCustomAmount = Object.values(customAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            if (Math.abs(totalCustomAmount - parseFloat(amount)) > 0.01) {
                newErrors.customAmounts = 'Custom split amounts must equal the total amount';
            }
        }

        if (splitType === 'share') {
            const totalShares = selectedMembers.reduce((sum, member) => {
                const memberIndex = splitWith.members.findIndex(m => m._id === member._id);
                return sum + (parseFloat(shareCounts[memberIndex]) || 0);
            }, 0);
            if (totalShares === 0) {
                newErrors.shares = 'Enter at least one share to split by shares';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setCategory('');
        setDescription('');
        setSplitWith(null);
        setSelectedMembers([]);
        setCustomAmounts({});
        setSplitType('even');
        setSelectedBankAccount(null);
        setErrors({});
    };

    const handleSave = async () => {
        if (!validateForm()) {
            Alert.alert('Error', 'Please fill in all required fields correctly');
            return;
        }

        // Show processing result screen
        onShowResult('processing', {
            title: 'Processing Transaction',
            subtitle: 'Please wait while we process your transaction...',
            amount: parseFloat(amount),
            category: category,
            bankAccount: selectedBankAccount?.bankName,
            groupName: splitWith?.name,
        });

        // Simulate processing time
        setTimeout(async () => {
            try {
                setSaving(true);
                const userData = await AsyncStorage.getItem("userData");
                if (!userData) {
                    throw new Error("User session expired");
                }

                const user = JSON.parse(userData);
                const selectedMembersList = selectedMembers.map(member => member._id);

                const transactionData = {
                    title,
                    description,
                    amount: parseFloat(amount),
                    category: category || "Other",
                    paidBy: user._id,
                    splitBetween: selectedMembersList,
                    group: splitWith._id,
                    splitType,
                    customAmounts: splitType === 'custom' ?
                        selectedMembers.map(member => ({
                            user: member._id,
                            amount: parseFloat(customAmounts[member._id] || 0)
                        })) : splitType === 'share' ?
                            selectedMembers.map(member => {
                                const memberIndex = splitWith.members.findIndex(m => m._id === member._id);
                                const shares = parseFloat(shareCounts[memberIndex]) || 0;
                                const totalShares = selectedMembers.reduce((sum, m) => {
                                    const idx = splitWith.members.findIndex(mem => mem._id === m._id);
                                    return sum + (parseFloat(shareCounts[idx]) || 0);
                                }, 0);
                                return {
                                    user: member._id,
                                    amount: totalShares > 0 ? (parseFloat(amount) * shares) / totalShares : 0
                                };
                            }) : [],
                    notes: description || "",
                    tags: [],
                    singleStatus: "pending",
                    transactionType: "expense",
                    bankAccountId: selectedBankAccount._id,
                    settlements: selectedMembers.map(member => {
                        let memberAmount = 0;
                        if (splitType === "custom") {
                            memberAmount = parseFloat(customAmounts[member._id]);
                        } else if (splitType === "share") {
                            const memberIndex = splitWith.members.findIndex(m => m._id === member._id);
                            const shares = parseFloat(shareCounts[memberIndex]) || 0;
                            const totalShares = selectedMembers.reduce((sum, m) => {
                                const idx = splitWith.members.findIndex(mem => mem._id === m._id);
                                return sum + (parseFloat(shareCounts[idx]) || 0);
                            }, 0);
                            memberAmount = totalShares > 0 ? (parseFloat(amount) * shares) / totalShares : 0;
                        } else {
                            memberAmount = parseFloat(amount) / selectedMembers.length;
                        }
                        return {
                            user: member._id,
                            amount: memberAmount,
                            status: "pending",
                            paidAt: null,
                            settledBy: null,
                            personalTransactionId: null
                        };
                    })
                };
                console.log('transactionData', transactionData)

                const response = await axios.post(
                    `${API_BASE_URL}/api/v1/splits/create-transaction`,
                    transactionData,
                    {
                        headers: {
                            Authorization: `Bearer ${user.token}`,
                        },
                    }
                );
                console.log('response', response)

                if (response.data.success) {
                    resetForm();

                    // Transition from processing to success
                    onShowResult('success', {
                        title: 'Transaction Successful!',
                        subtitle: 'Your split transaction has been completed successfully',
                        amount: parseFloat(amount),
                        transactionId: response.data.data?._id || 'TXN' + Date.now(),
                        category: category,
                        bankAccount: selectedBankAccount?.bankName,
                        groupName: splitWith?.name,
                    });
                } else {
                    throw new Error(response.data.message || 'Failed to save transaction');
                }
            } catch (error) {
                console.error("Error saving transaction:", error);

                if (error.response) {
                    console.error("Error response data:", error.response.data);
                    console.error("Error response status:", error.response.status);
                    console.error("Error response headers:", error.response.headers);
                } else if (error.request) {
                    console.error("Error request (no response):", error.request);
                } else {
                    console.error("Error message:", error.message);
                }

                console.error("Axios config:", error.config);

                // Show error result screen
                onShowResult('error', {
                    title: 'Transaction Failed',
                    subtitle: error.response?.data?.message || error.message || 'Failed to save transaction',
                    amount: parseFloat(amount),
                    category: category,
                    bankAccount: selectedBankAccount?.bankName,
                    groupName: splitWith?.name,
                });
            } finally {
                setSaving(false);
            }
        }, 2000); // 2 second delay to show processing
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
            <ScrollView style={styles.sectionContainer} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                {/* Select Group */}
                <View style={styles.section}>
                    <Text style={styles.label}>Select Group</Text>
                    <TouchableOpacity
                        style={styles.selectBox}
                        onPress={() => setShowGroupModal(true)}
                    >
                        {splitWith ? (
                            <View style={styles.selectedGroup}>
                                <MaterialIcons name="groups" size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
                                <Text style={styles.selectedGroupText}>{splitWith.name}</Text>
                            </View>
                        ) : (
                            <>
                                <Ionicons name="people-outline" size={20} color="#9ca3af" style={{ marginRight: 8 }} />
                                <Text style={styles.selectText}>+ Select group</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Transaction Title */}
                <View style={styles.section}>
                    <Text style={styles.label}>Transaction Title*</Text>
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
                    <TouchableOpacity
                        style={styles.amountBox}
                        activeOpacity={0.7}
                        onPress={() => {
                            // Find the input ref and focus it
                            if (amountInputRef.current) {
                                amountInputRef.current.focus();
                            }
                        }}
                    >
                        <Text style={styles.amountPrefix}>₹</Text>
                        <TextInput
                            ref={amountInputRef}
                            style={styles.amountInput}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            placeholderTextColor="#b0b0b0"
                        />
                    </TouchableOpacity>
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

                {/* Split Type and Members */}
                {splitWith && splitWith.members && (
                    <>
                        <View style={styles.section}>
                            <Text style={styles.label}>Split Type</Text>
                            <View style={styles.splitTypeContainer}>
                                <TouchableOpacity
                                    style={[styles.splitTypeBtn, splitType === 'even' && styles.splitTypeBtnActive]}
                                    onPress={() => setSplitType('even')}
                                >
                                    <Text style={[styles.splitTypeText, splitType === 'even' && styles.splitTypeTextActive]}>
                                        Even Split
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.splitTypeBtn, splitType === 'custom' && styles.splitTypeBtnActive]}
                                    onPress={() => setSplitType('custom')}
                                >
                                    <Text style={[styles.splitTypeText, splitType === 'custom' && styles.splitTypeTextActive]}>
                                        Custom Split
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.splitTypeBtn, splitType === 'share' && styles.splitTypeBtnActive]}
                                    onPress={() => setSplitType('share')}
                                >
                                    <Text style={[styles.splitTypeText, splitType === 'share' && styles.splitTypeTextActive]}>
                                        By Share
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.label}>Split With</Text>
                            <View style={styles.membersList}>
                                {splitWith.members.map((member) => {
                                    const isSelected = selectedMembers.some((m) => m._id === member._id);
                                    return (
                                        <TouchableOpacity
                                            key={member._id}
                                            style={[styles.memberItem, isSelected && styles.memberItemSelected]}
                                            onPress={() => toggleMember(member)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.memberInfo}>
                                                <View style={styles.memberAvatar}>
                                                    <Text style={styles.memberInitial}>
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <Text style={styles.memberName}>{member.name}</Text>
                                            </View>
                                            {isSelected ? (
                                                splitType === 'custom' ? (
                                                    <View style={styles.amountInputContainer}>
                                                        <Text style={styles.currencySymbol}>₹</Text>
                                                        <TextInput
                                                            style={styles.amountInput}
                                                            value={customAmounts[member._id]}
                                                            onChangeText={(value) => handleCustomAmountChange(member._id, value)}
                                                            keyboardType="numeric"
                                                            placeholder="0.00"
                                                        />
                                                    </View>
                                                ) : splitType === 'share' ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <TouchableOpacity
                                                            style={styles.shareBtn}
                                                            onPress={() => {
                                                                setShareCounts(prev => {
                                                                    const arr = [...prev];
                                                                    const memberIndex = splitWith.members.findIndex(m => m._id === member._id);
                                                                    arr[memberIndex] = Math.max(0, (arr[memberIndex] || 1) - 1);
                                                                    return arr;
                                                                });
                                                            }}
                                                        >
                                                            <Text style={styles.shareBtnText}>−</Text>
                                                        </TouchableOpacity>
                                                        <Text style={styles.shareCountText}>{shareCounts[splitWith.members.findIndex(m => m._id === member._id)] || 1}</Text>
                                                        <TouchableOpacity
                                                            style={styles.shareBtn}
                                                            onPress={() => {
                                                                setShareCounts(prev => {
                                                                    const arr = [...prev];
                                                                    const memberIndex = splitWith.members.findIndex(m => m._id === member._id);
                                                                    arr[memberIndex] = (arr[memberIndex] || 1) + 1;
                                                                    return arr;
                                                                });
                                                            }}
                                                        >
                                                            <Text style={styles.shareBtnText}>+</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <View style={styles.splitAmountContainer}>
                                                        <Text style={styles.splitAmount}>
                                                            ₹{customAmounts[member._id] || '0.00'}
                                                        </Text>
                                                    </View>
                                                )
                                            ) : (
                                                <Ionicons name="remove-circle-outline" size={22} color="#ccc" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </>
                )}

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

                {/* Bank Account Selection */}
                <View style={styles.section}>
                    <Text style={styles.label}>Select Bank Account*</Text>
                    {bankAccounts.length === 0 ? (
                        <View style={[styles.noBankAccountContainer, errors.bankAccount && styles.inputError]}>
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
                    ) : (
                        <TouchableOpacity
                            style={[styles.bankAccountSelector, errors.bankAccount && styles.inputError]}
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
                    )}
                    {errors.bankAccount && (
                        <Text style={styles.errorText}>{errors.bankAccount}</Text>
                    )}
                </View>


                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Transaction</Text>
                    )}
                </TouchableOpacity>

                {/* Payment Apps */}
                <View style={styles.paymentAppsContainer}>
                    <Text style={styles.sectionTitle}>Payment Options</Text>
                    <View style={styles.paymentAppsGrid}>
                        <TouchableOpacity style={[styles.quickBtn, { borderColor: '#1a73e8' }]} onPress={() => openPaymentApp('GPay')}>
                            <Ionicons name="logo-google" size={16} color="#1a73e8" />
                            <Text style={[styles.quickBtnText, { color: '#1a73e8' }]}>Open GPay</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.quickBtn, { borderColor: '#673ab7' }]} onPress={() => openPaymentApp('PhonePe')}>
                            <Ionicons name="phone-portrait-outline" size={16} color="#673ab7" />
                            <Text style={[styles.quickBtnText, { color: '#673ab7' }]}>Open PhonePe</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.quickBtn, { borderColor: '#00baf2' }]} onPress={() => openPaymentApp('Paytm')}>
                            <Ionicons name="wallet-outline" size={16} color="#00baf2" />
                            <Text style={[styles.quickBtnText, { color: '#00baf2' }]}>Open Paytm</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Group Selection Modal */}
                <Modal
                    visible={showGroupModal}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setShowGroupModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Group</Text>
                                <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>

                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#00bfff" />
                                </View>
                            ) : error ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={groups}
                                    keyExtractor={item => item._id}
                                    contentContainerStyle={styles.groupList}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.groupItem}
                                            onPress={() => handleGroupSelect(item)}
                                        >
                                            <View style={styles.groupIconContainer}>
                                                <MaterialIcons name="groups" size={24} color="#00bfff" />
                                            </View>
                                            <View style={styles.groupInfo}>
                                                <Text style={styles.groupName}>{item.name}</Text>
                                                <Text style={styles.groupMembers}>{item.memberCount} members</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                    ListEmptyComponent={
                                        <View style={styles.emptyContainer}>
                                            <Ionicons name="people-outline" size={48} color="#E0E0E0" />
                                            <Text style={styles.emptyText}>No groups found</Text>
                                            <Text style={styles.emptySubtext}>
                                                Create a group to start splitting expenses
                                            </Text>
                                        </View>
                                    }
                                />
                            )}
                        </View>
                    </View>
                </Modal>

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


        </KeyboardAvoidingView>
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
    selectBox: {
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
    selectText: {
        color: '#9ca3af',
        fontSize: 16,
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
        width: '100%',
    },
    amountPrefix: {
        fontSize: 20,
        color: '#7c3aed',
        marginRight: 8,
        fontWeight: '600',
    },
    amountInput: {
        flex: 1,
        fontSize: 20,
        paddingVertical: 16,
        color: '#1f2937',
        fontWeight: '500',
        height: '100%',
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
    paymentAppsContainer: {
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
        color: '#0f172a',
    },
    paymentAppsGrid: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
        gap: 8,
    },
    quickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1.5,
        backgroundColor: '#fff',
    },
    quickBtnText: {
        fontWeight: '700',
    },
    selectedGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedGroupText: {
        color: '#8b5cf6',
        fontSize: 16,
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
    groupList: {
        padding: 20,
    },
    groupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    groupIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#e9d5ff',
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    groupMembers: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    loadingContainer: {
        padding: 24,
        alignItems: 'center',
    },
    errorContainer: {
        padding: 24,
        alignItems: 'center',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 15,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 17,
        color: '#6b7280',
        marginTop: 12,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    splitTypeContainer: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 16,
        padding: 6,
        marginTop: 4,
    },
    splitTypeBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 12,
        marginHorizontal: 2,
    },
    splitTypeBtnActive: {
        backgroundColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    splitTypeText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
    },
    splitTypeTextActive: {
        color: '#fff',
        fontWeight: '700',
    },
    membersList: {
        marginTop: 12,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    memberAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#e9d5ff',
    },
    memberInitial: {
        fontSize: 18,
        fontWeight: '700',
        color: '#8b5cf6',
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minWidth: 110,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    splitAmountContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        minWidth: 110,
        alignItems: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    currencySymbol: {
        fontSize: 15,
        color: '#7c3aed',
        marginRight: 6,
        fontWeight: '600',
    },
    amountInput: {
        width: 80,
        fontSize: 15,
        color: '#1f2937',
        padding: 0,
        fontWeight: '500',
    },
    splitAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8b5cf6',
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
        backgroundColor: '#fffbeb',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginTop: 4,
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
        backgroundColor: '#8b5cf6',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 6,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    primaryBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    saveBtnDisabled: {
        opacity: 0.7,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 13,
        marginTop: 6,
        fontWeight: '500',
    },
    inputError: {
        borderColor: '#ef4444',
        borderLeftColor: '#ef4444',
    },
    memberItemSelected: {
        borderColor: '#8b5cf6',
        backgroundColor: '#f3e8ff',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    shareBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#8b5cf6',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    shareBtnText: {
        color: '#8b5cf6',
        fontSize: 20,
        fontWeight: '800',
        marginTop: -2,
    },
    shareCountText: {
        minWidth: 24,
        textAlign: 'center',
        color: '#1f2937',
        fontWeight: '800',
        fontSize: 16,
    },
});

export default SplitSection; 