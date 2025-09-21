import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal, Switch, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { API_BASE_URL } from '../../../api';

const BankAccount = () => {
    const navigation = useNavigation();
    const [accounts, setAccounts] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [bankName, setBankName] = useState('');
    const [accountType, setAccountType] = useState('savings');
    const [currentBalance, setCurrentBalance] = useState('');
    const [limitAmount, setLimitAmount] = useState('');
    const [personalLimitAmount, setPersonalLimitAmount] = useState('');
    const [isPrimary, setIsPrimary] = useState(false);
    const [showInDashboard, setShowInDashboard] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [confirmPrimaryVisible, setConfirmPrimaryVisible] = useState(false);
    const [pendingPrimaryId, setPendingPrimaryId] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Dashboard calculations
    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.currentBalance || 0), 0);
    const totalAccounts = accounts.length;
    const primaryAccount = accounts.find(acc => acc.isPrimary);
    const totalLimits = accounts.reduce((sum, acc) => sum + parseFloat(acc.limitAmount || 0), 0);

    // Fetch existing accounts when component mounts
    useEffect(() => {
        const checkLoginStatus = async () => {
            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('userData');

            if (!token || !userData) {
                // console.log('User not logged in');
                Alert.alert('Error', 'Please login to view your bank accounts');
                navigation.navigate('Login');
                return;
            }

            fetchAccounts();
        };

        checkLoginStatus();
    }, []);

    // Helper: always keep primary on top
    const sortAccounts = (inputAccounts) => {
        try {
            return [...inputAccounts].sort((a, b) => {
                // Primary first
                if (a.isPrimary && !b.isPrimary) return -1;
                if (!a.isPrimary && b.isPrimary) return 1;
                // Then by most recently created/updated (fallback by name)
                const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
                if (bTime !== aTime) return bTime - aTime;
                return (a.bankName || '').localeCompare(b.bankName || '');
            });
        } catch (_e) {
            return inputAccounts;
        }
    };

    const fetchAccounts = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('userData');
            // console.log('Stored userData:', userData);

            if (!userData) {
                //  console.log('No user data found in AsyncStorage');
                Alert.alert('Error', 'Please login to view your bank accounts');
                return;
            }

            const parsedUserData = JSON.parse(userData);
            const userId = parsedUserData._id;
            //  console.log('Fetching accounts for user:', userId);

            if (!token || !userId) {
                // console.log('Missing token or userId:', { token: !!token, userId });
                Alert.alert('Error', 'Please login to view your bank accounts');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/bankaccounts/get-bank-accounts/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            //  console.log('Fetch accounts response status:', response.status);
            const data = await response.json();
            //  console.log('Fetch accounts response data:', data);

            if (response.ok) {
                if (data.success && data.data) {
                    setAccounts(sortAccounts(data.data));
                } else {
                    //   console.log('No accounts data in response');
                    setAccounts([]);
                }
            } else {
                // console.log('Fetch error:', response.status);
                setAccounts([]);
            }
        } catch (error) {
            //   console.error('Error fetching accounts:', error);
            Alert.alert('Error', 'Failed to fetch bank accounts');
            setAccounts([]);
        }
    };

    const performSetPrimary = async (id) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login to update account');
                return;
            }

            // First unset current primary
            await fetch(`${API_BASE_URL}/api/v1/bankaccounts/unset-primary-account`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Then set new primary
            const response = await fetch(`${API_BASE_URL}/api/v1/bankaccounts/set-primary-account/${id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchAccounts();
            } else {
                const errorData = await response.json();
                Alert.alert('Error', errorData.message || 'Failed to update primary account');
            }
        } catch (error) {
            console.error('Error updating primary account:', error);
            Alert.alert('Error', 'Failed to update primary account');
        }
    };

    const handleSetPrimary = (id) => {
        setPendingPrimaryId(id);
        setConfirmPrimaryVisible(true);
    };

    const handleAddAccount = async () => {
        // Validate fields as needed
        if (!bankName || !currentBalance || !limitAmount || !personalLimitAmount) {
            Alert.alert('Please fill all required fields');
            return;
        }
        try {
            // console.log('Adding new bank account with data:', {
            //     bankName,
            //     accountType,
            //     currentBalance,
            //     limitAmount,
            //     personalLimitAmount,
            //     isPrimary,
            //     showInDashboard
            // });

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login to add a bank account');
                return;
            }

            // If this is the first account, force it to be primary
            const shouldBePrimary = accounts.length === 0 || isPrimary;
            // console.log('Should be primary:', shouldBePrimary);

            // If setting as primary, confirm with user
            if (shouldBePrimary && accounts.length > 0) {
                Alert.alert(
                    "Set as Primary Account",
                    "This will set this account as your primary account. Do you want to continue?",
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Continue",
                            onPress: async () => {
                                await createBankAccount(shouldBePrimary);
                            }
                        }
                    ]
                );
            } else {
                await createBankAccount(shouldBePrimary);
            }
        } catch (error) {
            console.error('Error adding account:', error);
            Alert.alert('Error', 'Failed to connect to the server');
        }
    };

    const createBankAccount = async (shouldBePrimary) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/v1/bankaccounts/create-bank-account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    bankName,
                    accountType,
                    currentBalance: parseFloat(currentBalance),
                    limitAmount: parseFloat(limitAmount),
                    personalLimitAmount: parseFloat(personalLimitAmount),
                    isPrimary: shouldBePrimary,
                    showInDashboard
                }),
            });

            const responseData = await response.json();
            //console.log('Create account response data:', responseData);

            if (response.ok) {
                // Refresh the accounts list instead of just adding the new one
                await fetchAccounts();
                setModalVisible(false);
                // Reset form fields
                setBankName('');
                setAccountType('savings');
                setCurrentBalance('');
                setLimitAmount('');
                setPersonalLimitAmount('');
                setIsPrimary(false);
                setShowInDashboard(true);
                setIsEditMode(false);
                setSelectedAccount(null);
            } else {
                Alert.alert('Error', responseData.message || 'Failed to add account');
            }
        } catch (error) {
            console.error('Error creating account:', error);
            Alert.alert('Error', 'Failed to create bank account');
        }
    };

    const handleLongPress = (account) => {
        setSelectedAccount(account);
        setOptionsVisible(true);
    };

    const handleDeleteAccount = async (id) => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to delete this account? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('token');
                            if (!token) {
                                Alert.alert('Error', 'Please login to delete account');
                                return;
                            }

                            const response = await fetch(`${API_BASE_URL}/api/v1/bankaccounts/delete-bank-account/${id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });

                            if (response.ok) {
                                await fetchAccounts();
                            } else {
                                const errorData = await response.json();
                                Alert.alert('Error', errorData.message || 'Failed to delete account');
                            }
                        } catch (error) {
                            console.error('Error deleting account:', error);
                            Alert.alert('Error', 'Failed to delete account');
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateAccount = async () => {
        if (!selectedAccount) return;

        // Validate form fields
        if (!bankName || !currentBalance || !limitAmount || !personalLimitAmount) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        try {
            console.log('Selected account for update:', selectedAccount);
            console.log('Form data:', { bankName, accountType, currentBalance, limitAmount, personalLimitAmount, isPrimary });

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                Alert.alert('Error', 'Please login to update account');
                return;
            }
            const accountId = selectedAccount._id || selectedAccount.id;
            console.log('Account ID for update:', accountId);
            if (!accountId) {
                Alert.alert('Error', 'Account ID not found');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/bankaccounts/update-bank-account/${accountId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    bankName: bankName,
                    accountType: accountType,
                    currentBalance: parseFloat(currentBalance),
                    limitAmount: parseFloat(limitAmount),
                    personalLimitAmount: parseFloat(personalLimitAmount),
                    isPrimary: isPrimary,
                    showInDashboard: showInDashboard
                })
            });

            const responseData = await response.json();
            console.log('Update response:', responseData);

            if (response.ok) {
                setModalVisible(false);
                setEditModalVisible(false);
                setSelectedAccount(null);
                setIsEditMode(false);
                await fetchAccounts();
            } else {
                Alert.alert('Error', responseData.message || 'Failed to update account');
            }
        } catch (error) {
            console.error('Error updating account:', error);
            Alert.alert('Error', 'Failed to connect to the server');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Dashboard Header */}
            <View style={styles.welcomeSection}>
                <View style={styles.welcomeHeader}>
                    <View style={styles.welcomeLeft}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="chevron-back" size={24} color="#1e293b" />
                        </TouchableOpacity>
                        <View style={styles.welcomeText}>
                            <Text style={styles.welcomeGreeting}>Bank Accounts</Text>
                            <Text style={styles.welcomeName}>Manage your accounts</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.welcomeDivider} />
            </View>



            {/* Quick Actions */}
            {accounts.length > 0 && (
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add-circle" size={24} color="#8b5cf6" />
                        <Text style={styles.quickActionText}>Add Account</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('FiltersView')}>
                        <Ionicons name="analytics" size={24} color="#8b5cf6" />
                        <Text style={styles.quickActionText}>Analytics</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={() => Linking.openSettings()}
                    >
                        <Ionicons name="settings" size={24} color="#8b5cf6" />
                        <Text style={styles.quickActionText}>Settings</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Accounts List */}
            <ScrollView style={styles.accountsContainer} showsVerticalScrollIndicator={false}>
                {accounts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <LinearGradient
                            colors={['#f3e8ff', '#e9d5ff']}
                            style={styles.emptyStateCard}
                        >
                            <Ionicons name="wallet-outline" size={80} color="#8b5cf6" />
                            <Text style={styles.emptyStateTitle}>No Bank Accounts Yet</Text>
                            <Text style={styles.emptyStateSubtitle}>
                                Create your first bank account to start tracking your finances and managing your money effectively.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyStateButton}
                                onPress={() => setModalVisible(true)}
                            >
                                <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.emptyStateButtonText}>Add Bank Account</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                ) : (
                    <View style={styles.accountsList}>
                        {accounts.map((acc) => (
                            <TouchableOpacity
                                key={acc._id || acc.id}
                                style={[
                                    styles.accountCard,
                                    acc.isPrimary && styles.primaryCard
                                ]}
                                onLongPress={() => handleLongPress(acc)}
                                delayLongPress={500}
                            >
                                {acc.isPrimary ? (
                                    // Primary Card - Special Design
                                    <LinearGradient
                                        colors={['#8b5cf6', '#7c3aed']}
                                        style={styles.primaryCardGradient}
                                    >
                                        <View style={styles.primaryCardHeader}>
                                            <View style={styles.primaryCardInfo}>
                                                <View style={styles.primaryBankRow}>
                                                    <Ionicons
                                                        name={acc.accountType === 'savings' ? 'cash' : 'card'}
                                                        size={20}
                                                        color="#fff"
                                                    />
                                                    <Text style={styles.primaryBankName}>{acc.bankName}</Text>
                                                    <View style={styles.primaryStarBadge}>
                                                        <Ionicons name="star" size={12} color="#8b5cf6" />
                                                    </View>
                                                </View>
                                                <Text style={styles.primaryAccountType}>
                                                    {acc.accountType.charAt(0).toUpperCase() + acc.accountType.slice(1)} Account
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.primaryCardBody}>
                                            <View style={styles.primaryBalanceSection}>
                                                <Text style={styles.primaryBalanceLabel}>Balance</Text>
                                                <Text style={styles.primaryBalance}>₹{parseFloat(acc.currentBalance).toFixed(2)}</Text>
                                            </View>
                                            <View style={styles.primaryLimitSection}>
                                                <Text style={styles.primaryLimitLabel}>Min</Text>
                                                <Text style={styles.primaryLimit}>₹{parseFloat(acc.limitAmount).toFixed(2)}</Text>
                                            </View>
                                        </View>
                                    </LinearGradient>
                                ) : (
                                    // Regular Card - Compact Design
                                    <View style={styles.regularCard}>
                                        <View style={styles.regularCardHeader}>
                                            <View style={styles.regularCardInfo}>
                                                <View style={styles.regularBankRow}>
                                                    <Ionicons
                                                        name={acc.accountType === 'savings' ? 'cash-outline' : 'card-outline'}
                                                        size={18}
                                                        color="#8b5cf6"
                                                    />
                                                    <Text style={styles.regularBankName}>{acc.bankName}</Text>
                                                </View>
                                                <Text style={styles.regularAccountType}>
                                                    {acc.accountType.charAt(0).toUpperCase() + acc.accountType.slice(1)}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.setPrimaryBtn}
                                                onPress={() => handleSetPrimary(acc._id || acc.id)}
                                            >
                                                <Ionicons name="star-outline" size={14} color="#8b5cf6" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.regularCardBody}>
                                            <View style={styles.regularBalanceSection}>
                                                <Text style={styles.regularBalanceLabel}>Balance</Text>
                                                <Text style={styles.regularBalance}>₹{parseFloat(acc.currentBalance).toFixed(2)}</Text>
                                            </View>
                                            <View style={styles.regularLimitSection}>
                                                <Text style={styles.regularLimitLabel}>Min</Text>
                                                <Text style={styles.regularLimit}>₹{parseFloat(acc.limitAmount).toFixed(2)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Navigation */}
            {false && (
                <View style={styles.bottomNav}>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="home-outline" size={24} color="#009CF9" />
                        <Text style={styles.navTextActive}>Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="people-outline" size={24} color="#222" />
                        <Text style={styles.navText}>Groups</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addNavBtn}>
                        <Ionicons name="add" size={32} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="stats-chart-outline" size={24} color="#222" />
                        <Text style={styles.navText}>Stats</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="person-outline" size={24} color="#222" />
                        <Text style={styles.navText}>Profile</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={styles.formModal}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleContainer}>
                                <Ionicons name={isEditMode ? "create" : "add-circle"} size={24} color="#8b5cf6" />
                                <Text style={styles.modalTitle}>{isEditMode ? "Update Bank Account" : "Add Bank Account"}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    setIsEditMode(false);
                                    setSelectedAccount(null);
                                }}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Bank Name</Text>
                            <TextInput
                                value={bankName}
                                onChangeText={setBankName}
                                placeholder="e.g., SBI, HDFC"
                                style={styles.input}
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Account Type</Text>
                            <View style={styles.accountTypeContainer}>
                                <TouchableOpacity
                                    onPress={() => setAccountType('savings')}
                                    style={[
                                        styles.accountTypeButton,
                                        accountType === 'savings' && styles.accountTypeButtonActive
                                    ]}
                                >
                                    <View style={[
                                        styles.radioButton,
                                        accountType === 'savings' && styles.radioButtonActive
                                    ]} />
                                    <Text style={[
                                        styles.accountTypeText,
                                        accountType === 'savings' && styles.accountTypeTextActive
                                    ]}>Savings</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setAccountType('checking')}
                                    style={[
                                        styles.accountTypeButton,
                                        accountType === 'checking' && styles.accountTypeButtonActive
                                    ]}
                                >
                                    <View style={[
                                        styles.radioButton,
                                        accountType === 'checking' && styles.radioButtonActive
                                    ]} />
                                    <Text style={[
                                        styles.accountTypeText,
                                        accountType === 'checking' && styles.accountTypeTextActive
                                    ]}>Checking</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Current Balance</Text>
                            <TextInput
                                value={currentBalance}
                                onChangeText={setCurrentBalance}
                                placeholder="₹0.00"
                                keyboardType="numeric"
                                style={styles.input}
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Limit Amount</Text>
                            <TextInput
                                value={limitAmount}
                                onChangeText={setLimitAmount}
                                placeholder="₹0.00"
                                keyboardType="numeric"
                                style={styles.input}
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Personal Limit Amount</Text>
                            <TextInput
                                value={personalLimitAmount}
                                onChangeText={setPersonalLimitAmount}
                                placeholder="₹0.00"
                                keyboardType="numeric"
                                style={styles.input}
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        <View style={styles.primaryToggleContainer}>
                            <View style={styles.primaryToggleRow}>
                                <Ionicons name="star" size={20} color={isPrimary ? "#8b5cf6" : "#9ca3af"} />
                                <Text style={[styles.primaryToggleText, isPrimary && styles.primaryToggleTextActive]}>
                                    Set as primary account
                                </Text>
                            </View>
                            <Switch
                                value={isPrimary}
                                onValueChange={setIsPrimary}
                                trackColor={{ false: '#e5e7eb', true: '#8b5cf6' }}
                                thumbColor={isPrimary ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={isEditMode ? handleUpdateAccount : handleAddAccount}
                            >
                                <LinearGradient
                                    colors={['#8b5cf6', '#7c3aed']}
                                    style={styles.addButtonGradient}
                                >
                                    <Ionicons name={isEditMode ? "checkmark" : "add"} size={20} color="#fff" />
                                    <Text style={styles.addButtonText}>{isEditMode ? "Update Account" : "Add Account"}</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    setIsEditMode(false);
                                    setSelectedAccount(null);
                                }}
                                style={styles.cancelButton}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Options Bottom Sheet */}
            <Modal
                visible={optionsVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setOptionsVisible(false)}
            >
                <View style={styles.sheetBackdrop}>
                    <View style={styles.sheetContainer}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>{selectedAccount?.bankName}</Text>
                        <TouchableOpacity
                            style={styles.sheetItem}
                            onPress={() => {
                                if (!selectedAccount) return;
                                setBankName(selectedAccount.bankName);
                                setAccountType(selectedAccount.accountType);
                                setCurrentBalance(String(selectedAccount.currentBalance));
                                setLimitAmount(String(selectedAccount.limitAmount));
                                setPersonalLimitAmount(String(selectedAccount.personalLimitAmount));
                                setIsPrimary(selectedAccount.isPrimary);
                                setIsEditMode(true);
                                setOptionsVisible(false);
                                setModalVisible(true);
                            }}
                        >
                            <Text style={styles.sheetItemText}>Update</Text>
                        </TouchableOpacity>
                        {!selectedAccount?.isPrimary && (
                            <TouchableOpacity
                                style={styles.sheetItem}
                                onPress={() => {
                                    setOptionsVisible(false);
                                    handleSetPrimary(selectedAccount?._id || selectedAccount?.id);
                                }}
                            >
                                <Text style={styles.sheetItemText}>Set as Primary</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.sheetItem, styles.sheetDanger]}
                            onPress={() => {
                                setOptionsVisible(false);
                                handleDeleteAccount(selectedAccount?._id || selectedAccount?.id);
                            }}
                        >
                            <Text style={[styles.sheetItemText, styles.sheetDangerText]}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sheetCancel} onPress={() => setOptionsVisible(false)}>
                            <Text style={styles.sheetCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Confirm Set Primary Modal */}
            <Modal
                visible={confirmPrimaryVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setConfirmPrimaryVisible(false)}
            >
                <View style={styles.confirmModalOverlay}>
                    <View style={styles.confirmModal}>
                        <View style={styles.confirmModalHeader}>
                            <View style={styles.confirmIconContainer}>
                                <Ionicons name="star" size={24} color="#8b5cf6" />
                            </View>
                            <Text style={styles.confirmTitle}>Set as Primary Account</Text>
                        </View>

                        <View style={styles.confirmContent}>
                            <Text style={styles.confirmText}>
                                This will replace your current primary account. The selected account will become your main account for transactions.
                            </Text>

                            <View style={styles.confirmWarning}>
                                <Ionicons name="information-circle" size={20} color="#f59e0b" />
                                <Text style={styles.confirmWarningText}>
                                    Your current primary account will be changed to a regular account.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.confirmButtonContainer}>
                            <TouchableOpacity
                                style={styles.confirmCancelButton}
                                onPress={() => setConfirmPrimaryVisible(false)}
                            >
                                <Text style={styles.confirmCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmPrimaryButton}
                                onPress={async () => {
                                    const id = pendingPrimaryId;
                                    setConfirmPrimaryVisible(false);
                                    setOptionsVisible(false);
                                    if (id) await performSetPrimary(id);
                                }}
                            >
                                <LinearGradient
                                    colors={['#8b5cf6', '#7c3aed']}
                                    style={styles.confirmPrimaryButtonGradient}
                                >
                                    <Ionicons name="star" size={18} color="#fff" />
                                    <Text style={styles.confirmPrimaryButtonText}>Set as Primary</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default BankAccount;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    // Dashboard Header Styles
    welcomeSection: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    welcomeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    welcomeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    welcomeText: {
        marginLeft: 12,
    },
    welcomeGreeting: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 2,
    },
    welcomeName: {
        fontSize: 14,
        color: '#64748b',
    },
    welcomeDivider: {
        height: 1,
        backgroundColor: '#1e293b',
        marginTop: 16,
        marginHorizontal: 0,
        opacity: 0.1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryCards: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        padding: 20,
        backdropFilter: 'blur(10px)',
    },
    summaryCardContent: {
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginTop: 8,
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    // Quick Actions Styles
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 24,
        paddingVertical: 24,
        backgroundColor: '#fff',
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 24,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    quickActionBtn: {
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        backgroundColor: '#f8fafc',
        minWidth: 80,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    quickActionText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'center',
    },
    // Accounts Container
    accountsContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    accountsList: {
        paddingBottom: 20,
    },
    // Empty State Styles
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    emptyStateCard: {
        width: '100%',
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginTop: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyStateSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    emptyStateButton: {
        backgroundColor: '#8b5cf6',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    emptyStateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // Account Card Styles
    accountCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },

    // Primary Card Styles
    primaryCardGradient: {
        padding: 20,
        minHeight: 140,
        position: 'relative',
    },
    primaryCardHeader: {
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    primaryCardInfo: {
        flex: 1,
    },
    primaryBankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    primaryBankName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginLeft: 10,
        flex: 1,
    },
    primaryStarBadge: {
        backgroundColor: '#fff',
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryAccountType: {
        fontSize: 13,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.8)',
        marginLeft: 34,
    },
    primaryCardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    primaryBalanceSection: {
        flex: 1,
    },
    primaryLimitSection: {
        flex: 1,
        alignItems: 'flex-end',
    },
    primaryBalanceLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    primaryBalance: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    primaryLimitLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    primaryLimit: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    // Regular Card Styles
    regularCard: {
        backgroundColor: '#fff',
        padding: 18,
        minHeight: 110,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        position: 'relative',
    },
    regularCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    regularCardInfo: {
        flex: 1,
    },
    regularBankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    regularBankName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 8,
    },
    regularAccountType: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6b7280',
        marginLeft: 26,
        textTransform: 'capitalize',
    },
    regularCardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    regularBalanceSection: {
        flex: 1,
    },
    regularLimitSection: {
        flex: 1,
        alignItems: 'flex-end',
    },
    regularBalanceLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#6b7280',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    regularBalance: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1f2937',
    },
    regularLimitLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#6b7280',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    regularLimit: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1f2937',
    },
    setPrimaryBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e9d5ff',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e6f4fd',
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 4,
    },
    headerContent: {
        flex: 1,
        marginLeft: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0f172a',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAccent: {
        width: 4,
        height: 20,
        backgroundColor: '#06a6f7',
        borderRadius: 2,
        marginRight: 10,
    },
    bankName: {
        fontWeight: 'bold',
        fontSize: 18,
        color: '#0f172a',
    },
    accountType: {
        color: '#64748b',
        marginTop: 2,
        marginBottom: 6,
        fontSize: 14,
    },
    balance: {
        fontWeight: 'bold',
        fontSize: 22,
        color: '#06a6f7',
        marginTop: 2,
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#e6f4fd',
        marginTop: 12,
    },
    primaryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#06a6f7',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginLeft: 8,
    },
    primaryBadgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    setPrimaryBtn: {
        marginTop: 16,
        backgroundColor: '#f2f8ff',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    setPrimaryText: {
        color: '#06a6f7',
        fontWeight: 'bold',
        fontSize: 15,
    },
    bottomNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e6f4fd',
    },
    navItem: {
        alignItems: 'center',
        flex: 1,
    },
    navText: {
        fontSize: 12,
        color: '#0f172a',
        marginTop: 2,
    },
    navTextActive: {
        fontSize: 12,
        color: '#06a6f7',
        marginTop: 2,
        fontWeight: 'bold',
    },
    addNavBtn: {
        backgroundColor: '#06a6f7',
        borderRadius: 30,
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -28,
        shadowColor: '#06a6f7',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    limitAmount: {
        color: '#64748b',
        fontSize: 14,
        marginTop: 4,
    },
    addBtn: {
        margin: 16,
        backgroundColor: '#06a6f7',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    addBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Modal styling
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 20,
    },
    formModal: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginLeft: 8,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 14,
        backgroundColor: '#f9fafb',
        fontSize: 16,
        color: '#1f2937',
    },
    accountTypeContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    accountTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
    },
    accountTypeButtonActive: {
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    radioButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#d1d5db',
        backgroundColor: '#fff',
        marginRight: 10,
    },
    radioButtonActive: {
        borderColor: '#8b5cf6',
        backgroundColor: '#8b5cf6',
    },
    accountTypeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    accountTypeTextActive: {
        color: '#8b5cf6',
        fontWeight: '600',
    },
    primaryToggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 24,
    },
    primaryToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    primaryToggleText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
        marginLeft: 8,
    },
    primaryToggleTextActive: {
        color: '#8b5cf6',
        fontWeight: '600',
    },
    buttonContainer: {
        gap: 12,
    },
    addButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    addButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    cancelButtonText: {
        color: '#8b5cf6',
        fontSize: 16,
        fontWeight: '500',
    },
    // Bottom sheet
    sheetBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        backgroundColor: '#fff',
        paddingTop: 8,
        paddingBottom: 20,
        paddingHorizontal: 16,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderWidth: 1,
        borderColor: '#e6f4fd',
    },
    sheetHandle: {
        alignSelf: 'center',
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e2e8f0',
        marginBottom: 10,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 8,
    },
    sheetItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eef6ff',
    },
    sheetItemText: {
        fontSize: 15,
        color: '#0f172a',
        fontWeight: '500',
    },
    sheetDanger: {
        borderBottomColor: '#fee2e2',
    },
    sheetDangerText: {
        color: '#ef4444',
        fontWeight: '600',
    },
    sheetCancel: {
        marginTop: 10,
        alignItems: 'center',
        paddingVertical: 10,
    },
    sheetCancelText: {
        color: '#06a6f7',
        fontWeight: '600',
        fontSize: 15,
    },
    // Confirm modal styles
    confirmModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 20,
    },
    confirmModal: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        maxWidth: '100%',
    },
    confirmModalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    confirmIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
    },
    confirmContent: {
        marginBottom: 24,
    },
    confirmText: {
        fontSize: 15,
        color: '#64748b',
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 16,
    },
    confirmWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fbbf24',
    },
    confirmWarningText: {
        fontSize: 13,
        color: '#92400e',
        marginLeft: 8,
        flex: 1,
        lineHeight: 18,
    },
    confirmButtonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    confirmCancelButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    confirmCancelButtonText: {
        color: '#64748b',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmPrimaryButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    confirmPrimaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 8,
    },
    confirmPrimaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
