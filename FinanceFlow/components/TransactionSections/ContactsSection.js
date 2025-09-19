import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


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

import { API_BASE_URL } from '../../api';


const ContactsSection = ({
    contact,
    setContact,
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
    const [showContactModal, setShowContactModal] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [registeredContacts, setRegisteredContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccount, setSelectedBankAccount] = useState(null);
    const [showBankAccounts, setShowBankAccounts] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [direction, setDirection] = useState('sent');




    const fetchRegisteredUsers = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                console.log("No user data found");
                return [];
            }

            const user = JSON.parse(userData);
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/user/usersdata`,
                {
                    headers: { Authorization: `Bearer ${user.token}` },
                }
            );

            // Normalize registered users' phone numbers to include +91 prefix
            const registeredPhoneNumbers = response.data.users.map(
                (user) => {
                    const normalizedNumber = user.phoneNumber.replace(/\D/g, "");
                    const last10 = normalizedNumber.slice(-10);
                    return `+91${last10}`;
                }
            );
            setRegisteredContacts(registeredPhoneNumbers);
            return registeredPhoneNumbers;
        } catch (error) {
            console.error("Error fetching registered users:", error);
            return [];
        }
    };

    const fetchAndFilterContacts = async (registeredNumbers) => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Denied", "Please enable contacts permission.");
                return;
            }

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name, Contacts.Fields.Image],
            });

            const filteredContacts = data.filter((contact) => {
                if (!contact.phoneNumbers?.[0]?.number) return false;
                const digits = contact.phoneNumbers[0].number.replace(/\D/g, "");
                const last10 = digits.slice(-10);
                const normalizedNumber = `+91${last10}`;
                return registeredNumbers.includes(normalizedNumber);
            });

            setContacts(filteredContacts);
        } catch (error) {
            console.error("Error fetching contacts:", error);
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
        if (showContactModal) {
            const loadContacts = async () => {
                const registeredNumbers = await fetchRegisteredUsers();
                await fetchAndFilterContacts(registeredNumbers);
            };
            loadContacts();
        }
        fetchBankAccounts();
    }, [showContactModal]);

    const isContactRegistered = (contact) => {
        if (!contact.phoneNumbers?.[0]?.number) return false;
        const digits = contact.phoneNumbers[0].number.replace(/\D/g, "");
        const last10 = digits.slice(-10);
        const normalizedNumber = `+91${last10}`;
        return registeredContacts.includes(normalizedNumber);
    };

    const filteredContacts = contacts.filter(contact => {
        const searchLower = searchQuery.toLowerCase();
        const nameMatch = contact.name?.toLowerCase().includes(searchLower);
        const phoneMatch = contact.phoneNumbers?.some(phone => {
            const digits = phone.number.replace(/\D/g, "");
            const last10 = digits.slice(-10);
            return last10.includes(searchQuery.replace(/\D/g, ""));
        });

        // If there's a search query, show all matching contacts
        if (searchQuery) {
            return nameMatch || phoneMatch;
        }

        // If no search query, only show registered contacts
        return (nameMatch || phoneMatch) && isContactRegistered(contact);
    });

    const renderContactItem = ({ item }) => {
        const isRegistered = isContactRegistered(item);

        return (
            <TouchableOpacity
                style={styles.contactItem}
                onPress={() => {
                    if (isRegistered) {
                        setContact(item);
                        setShowContactModal(false);
                    }
                }}
            >
                <View style={styles.contactInfo}>
                    {item.imageAvailable ? (
                        <Image source={{ uri: item.image.uri }} style={styles.contactAvatar} />
                    ) : (
                        <View style={styles.contactAvatarPlaceholder}>
                            <Text style={styles.contactInitials}>
                                {item.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.contactDetails}>
                        <Text style={styles.contactName}>{item.name}</Text>
                        {item.phoneNumbers && item.phoneNumbers.length > 0 && (
                            <Text style={styles.contactPhone}>{item.phoneNumbers[0].number}</Text>
                        )}
                    </View>
                </View>
                {isRegistered ? (
                    <View style={styles.registeredBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#00bfff" />
                        <Text style={styles.registeredText}>Registered</Text>
                    </View>
                ) : (
                    <View style={styles.unregisteredBadge}>
                        <Text style={styles.unregisteredText}>Not Registered</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const handleSave = async () => {
        if (!contact) {
            Alert.alert('Error', 'Please select a contact');
            return;
        }

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
                contactName: contact?.name,
            });

            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('userData');

            if (!token || !userData) {
                throw new Error("Authentication token or user data not found");
            }

            const parsedUserData = JSON.parse(userData);
            const currentUserId = parsedUserData._id;

            // Get contact phone number
            let contactPhoneNumber = '';
            if (contact?.phoneNumbers?.length > 0) {
                const primaryNumber = contact.phoneNumbers.find(p => p.isPrimary) || contact.phoneNumbers[0];
                contactPhoneNumber = primaryNumber.number.replace(/\D/g, '');
                if (!contactPhoneNumber.startsWith('91') && contactPhoneNumber.length === 10) {
                    contactPhoneNumber = '91' + contactPhoneNumber;
                }
            }

            // Prepare the transaction data
            const transactionData = {
                title,
                description,
                amount: parseFloat(amount),
                category: category || "Other",
                paidBy: currentUserId,
                paidTo: contact._id,
                notes: description || "",
                tags: [],
                singleStatus: "pending",
                transactionType: "expense",
                direction: direction,
                bankAccountId: selectedBankAccount._id,
                isContactTransaction: true,
                paymentStatus: "pending",
                contact: {
                    name: contact?.name || "Unknown",
                    phone: contactPhoneNumber,
                    relationship: "friend"
                },
                relatedUsers: [{
                    title: contact.title || "Unknown",
                    phoneNumber: contactPhoneNumber,
                    role: "recipient",
                    amount: parseFloat(amount),
                    ...(contact.imageAvailable && contact.image && {
                        avatar: contact.image.uri
                    })
                }],
                settlements: [{
                    user: contact._id,
                    amount: parseFloat(amount),
                    status: "pending",
                    paidAt: null,
                    settledBy: null,
                    personalTransactionId: null
                }]
            };

            const response = await axios.post(
                `${API_BASE_URL}/api/v1/contact/create`,
                transactionData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            if (response.data.success) {
                // Transition from processing to success
                onShowResult('success', {
                    title: 'Transaction Successful!',
                    subtitle: 'Your transaction has been completed successfully',
                    amount: parseFloat(amount),
                    transactionId: response.data.data?._id || 'TXN' + Date.now(),
                    category: category,
                    bankAccount: selectedBankAccount?.bankName,
                    contactName: contact?.name,
                });
                if (onSave) onSave();

            } else {
                throw new Error(response.data.message || 'Failed to save transaction');
            }
        } catch (error) {
            console.error("Error in transaction creation:", error);
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
                contactName: contact?.name,
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.sectionContainer} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                {/* Pay To */}
                <View style={styles.section}>
                    <Text style={styles.label}>Pay To*</Text>
                    <TouchableOpacity
                        style={styles.selectBox}
                        onPress={() => setShowContactModal(true)}
                    >
                        {contact ? (
                            <View style={styles.selectedContact}>
                                {contact.imageAvailable ? (
                                    <Image source={{ uri: contact.image.uri }} style={styles.selectedContactAvatar} />
                                ) : (
                                    <View style={styles.selectedContactAvatarPlaceholder}>
                                        <Text style={styles.selectedContactInitials}>
                                            {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <Text style={styles.selectedContactName}>{contact.name}</Text>
                            </View>
                        ) : (
                            <>
                                <Ionicons name="person-outline" size={20} color="#b0b0b0" style={{ marginRight: 8 }} />
                                <Text style={styles.selectText}>Select contact</Text>
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
            </ScrollView>

            {/* Contact Selection Modal */}
            <Modal
                visible={showContactModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowContactModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Contact</Text>
                            <TouchableOpacity onPress={() => setShowContactModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search contacts..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <FlatList
                            data={filteredContacts}
                            renderItem={renderContactItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.contactList}
                            showsVerticalScrollIndicator={false}
                        />
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
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        margin: 20,
        paddingHorizontal: 18,
        borderRadius: 16,
        height: 52,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '500',
    },
    contactList: {
        paddingHorizontal: 20,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        borderRadius: 12,
        marginBottom: 8,
    },
    contactInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    contactAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#f1f5f9',
    },
    contactAvatarPlaceholder: {
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
    contactInitials: {
        fontSize: 18,
        fontWeight: '700',
        color: '#8b5cf6',
    },
    contactDetails: {
        flex: 1,
    },
    contactName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    contactPhone: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    registeredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    registeredText: {
        fontSize: 12,
        color: '#16a34a',
        marginLeft: 6,
        fontWeight: '600',
    },
    unregisteredBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#fde68a',
    },
    unregisteredText: {
        fontSize: 12,
        color: '#d97706',
        fontWeight: '600',
    },
    selectedContact: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedContactAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#e9d5ff',
    },
    selectedContactAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#e9d5ff',
    },
    selectedContactInitials: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8b5cf6',
    },
    selectedContactName: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '600',
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
    successButton: {
        backgroundColor: '#10b981',
        shadowColor: '#10b981',
    },
    failedButton: {
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
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
});

export default ContactsSection; 