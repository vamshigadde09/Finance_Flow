import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    Alert,
    ActivityIndicator,
    Linking,
    Image,
    Modal,
    StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons, MaterialIcons, FontAwesome5, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import TransactionResultScreen from '../../../TransactionSections/TransactionResultScreen';
import { API_BASE_URL } from '../../../../api';

const PAYMENT_APPS = {
    GPay: {
        packageName: 'com.google.android.apps.nbu.paisa.user',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user',
        icon: 'logo-google',
        color: '#4285F4'
    },
    PhonePe: {
        packageName: 'com.phonepe.app',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.phonepe.app',
        icon: 'phone-portrait-outline',
        color: '#5F259F'
    },
    Paytm: {
        packageName: 'net.one97.paytm',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=net.one97.paytm',
        icon: 'wallet-outline',
        color: '#00BAF2'
    }
};

const ContactTran = () => {
    const navigation = useNavigation();
    const route = useRoute();

    const { contact = {}, transactionDetails = {}, sentamount = 0, groupId: routeGroupId, description = "" } = route.params || {};

    const [formData, setFormData] = useState({
        description: description || transactionDetails?.description || "",
        amount: sentamount || transactionDetails?.amount || "",
        category: transactionDetails?.category || "Other",
        paymentStatus: transactionDetails?.paymentStatus || null,
        notes: transactionDetails?.notes || "",
        tags: transactionDetails?.tags ? transactionDetails.tags.join(', ') : "",
        direction: transactionDetails?.direction || "sent",
        groupId: routeGroupId || null
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(!transactionDetails._id);
    const [selectedPaymentApp, setSelectedPaymentApp] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccount, setSelectedBankAccount] = useState(null);
    const [showBankAccounts, setShowBankAccounts] = useState(false);
    const [errors, setErrors] = useState({});
    const [showErrors, setShowErrors] = useState(false);
    const [registeredUsers, setRegisteredUsers] = useState([]);

    // Transaction Result Screen State
    const [showResultScreen, setShowResultScreen] = useState(false);
    const [resultType, setResultType] = useState('success');
    const [resultData, setResultData] = useState({});

    const categories = [
        { key: 'Housing', icon: <FontAwesome5 name="home" size={22} color="#888" />, label: 'Housing' },
        { key: 'Groceries', icon: <MaterialIcons name="local-grocery-store" size={22} color="#888" />, label: 'Groceries' },
        { key: 'Dining', icon: <MaterialIcons name="restaurant" size={22} color="#888" />, label: 'Dining' },
        { key: 'Transport', icon: <MaterialIcons name="directions-car" size={22} color="#888" />, label: 'Transport' },
        { key: 'Travel', icon: <FontAwesome5 name="plane" size={22} color="#888" />, label: 'Travel' },
        { key: 'Entertainment', icon: <MaterialIcons name="movie" size={22} color="#888" />, label: 'Entertainment' },
        { key: 'Coffee', icon: <MaterialIcons name="local-cafe" size={22} color="#888" />, label: 'Coffee' },
        { key: 'Health', icon: <MaterialIcons name="local-hospital" size={22} color="#888" />, label: 'Health' },
        { key: 'Work', icon: <MaterialIcons name="work" size={22} color="#888" />, label: 'Work' },
        { key: 'Utilities', icon: <MaterialIcons name="flash-on" size={22} color="#888" />, label: 'Utilities' },
        { key: 'Gifts', icon: <MaterialIcons name="card-giftcard" size={22} color="#888" />, label: 'Gifts' },
        { key: 'Other', icon: <MaterialIcons name="more" size={22} color="#888" />, label: 'Other' },
    ];

    const transactionTypes = ["income", "expense", "transfer"];
    const directions = ["sent", "received"];

    useEffect(() => {
        if (sentamount) {
            setFormData(prev => ({
                ...prev,
                amount: sentamount.toString()
            }));
        }
    }, [sentamount]);

    useEffect(() => {
        if (transactionDetails._id) {
            navigation.setOptions({
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => setIsEditing(!isEditing)}
                        style={styles.editButton}
                    >
                        <Ionicons
                            name={isEditing ? "eye-outline" : "create-outline"}
                            size={24}
                            color="#007AFF"
                        />
                    </TouchableOpacity>
                )
            });
        }
    }, [isEditing, transactionDetails]);

    useEffect(() => {
        fetchBankAccounts();
        fetchRegisteredUsers();
    }, []);

    const fetchBankAccounts = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('userData');



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

    const fetchRegisteredUsers = async () => {
        const userData = await AsyncStorage.getItem("userData");
        if (!userData) return;
        const user = JSON.parse(userData);
        const response = await axios.get(`${API_BASE_URL}/api/v1/user/usersdata`, {
            headers: { Authorization: `Bearer ${user.token}` },
        });
        setRegisteredUsers(response.data.users);
    };

    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const validateForm = useCallback(() => {
        if (!formData.description.trim()) {
            Alert.alert("Error", "Please enter a description");
            return false;
        }
        if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
            Alert.alert("Error", "Please enter a valid amount");
            return false;
        }
        if (!selectedBankAccount) {
            Alert.alert("Error", "Please select a bank account");
            return false;
        }
        return true;
    }, [formData, selectedBankAccount]);

    const handlePayment = useCallback(async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                Alert.alert("Error", "Please login again");
                navigation.navigate("Login");
                return;
            }

            const user = JSON.parse(userData);

            // Show processing result screen
            setResultType('processing');
            setResultData({
                title: 'Processing Transaction',
                subtitle: 'Please wait while we process your transaction...',
                amount: parseFloat(formData.amount),
                category: formData.category,
                bankAccount: selectedBankAccount?.bankName,
                contactName: contact?.name,
            });
            setShowResultScreen(true);

            // Simulate processing time
            setTimeout(async () => {
                try {
                    const apiUrl = transactionDetails._id
                        ? `${API_BASE_URL}/api/v1/contact/create/${transactionDetails._id}`
                        : `${API_BASE_URL}/api/v1/contact/create`;

                    let contactPhoneNumber = '';
                    if (contact?.phoneNumbers?.length > 0) {
                        const primaryNumber = contact.phoneNumbers.find(p => p.isPrimary) || contact.phoneNumbers[0];
                        contactPhoneNumber = primaryNumber.number.replace(/\D/g, '');
                        if (!contactPhoneNumber.startsWith('91') && contactPhoneNumber.length === 10) {
                            contactPhoneNumber = '91' + contactPhoneNumber;
                        }
                    }

                    // Find registered user by phone
                    const normalizedContactNumber = `+${contactPhoneNumber}`;
                    const matchedUser = registeredUsers.find(
                        u => u.phoneNumber.replace(/\D/g, '').slice(-10) === contactPhoneNumber.slice(-10)
                    );
                    const contactUserId = matchedUser ? matchedUser._id : undefined;

                    const relatedUsers = contact ? [{
                        title: contact.title || "Unknown",
                        phoneNumber: contactPhoneNumber,
                        role: "recipient",
                        amount: parseFloat(formData.amount),
                        ...(contact.imageAvailable && contact.image && {
                            avatar: contact.image.uri
                        })
                    }] : [];

                    const requestData = {
                        title: formData.description,
                        description: formData.notes,
                        amount: parseFloat(formData.amount),
                        category: formData.category,
                        user: user._id,
                        paymentStatus: "pending",
                        notes: formData.notes || undefined,
                        tags: formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag),
                        isContactTransaction: true,
                        contact: {
                            user: contactUserId,
                            name: contact?.name || "Unknown",
                            firstName: contact?.firstName,
                            lastName: contact?.lastName,
                            avatar: contact?.image?.uri,
                            phone: contactPhoneNumber,
                            amount: parseFloat(formData.amount),
                        },
                        relatedUsers,
                        transactionType: "expense",
                        direction: "sent",
                        bankAccountId: selectedBankAccount._id,
                        groupId: route.params.groupId || formData.groupId,
                        isSettleUp: route.params.isSettleUp || false
                    };

                    const response = transactionDetails._id
                        ? await axios.put(apiUrl, requestData, {
                            headers: { Authorization: `Bearer ${user.token}` }
                        })
                        : await axios.post(apiUrl, requestData, {
                            headers: { Authorization: `Bearer ${user.token}` }
                        });

                    if (response.data.success) {
                        if (selectedPaymentApp) {
                            await openPaymentApp(selectedPaymentApp);
                        }

                        // Transition from processing to success
                        setResultType('success');
                        setResultData({
                            title: 'Transaction Successful!',
                            subtitle: transactionDetails._id
                                ? 'Transaction updated successfully!'
                                : 'Transaction created successfully!',
                            amount: parseFloat(formData.amount),
                            transactionId: response.data.data?._id || 'TXN' + Date.now(),
                            category: formData.category,
                            bankAccount: selectedBankAccount?.bankName,
                            contactName: contact?.name,
                        });
                    }
                } catch (error) {
                    console.error("Transaction error:", error);
                    setError(error.response?.data?.message || "Failed to process transaction");

                    // Show error result screen
                    setResultType('error');
                    setResultData({
                        title: 'Transaction Failed',
                        subtitle: error.response?.data?.message || "Failed to process transaction. Please try again.",
                        amount: parseFloat(formData.amount),
                        category: formData.category,
                        bankAccount: selectedBankAccount?.bankName,
                        contactName: contact?.name,
                    });
                } finally {
                    setLoading(false);
                }
            }, 2000); // 2 second delay to show processing
        } catch (error) {
            console.error("Transaction error:", error);
            setError("Failed to process transaction");
            Alert.alert("Error", "Failed to process transaction");
            setLoading(false);
        }
    }, [formData, contact, transactionDetails, selectedPaymentApp, selectedBankAccount, navigation, route.params, registeredUsers]);

    const openPaymentApp = useCallback(async (appName) => {
        try {
            const app = PAYMENT_APPS[appName];
            if (!app) {
                Alert.alert("Error", "Payment app not supported");
                return;
            }

            const appUrl = `intent://#Intent;package=${app.packageName};scheme=upi;end`;
            await Linking.openURL(appUrl);
        } catch (err) {
            console.error("Error opening payment app:", err);
            Linking.openURL(PAYMENT_APPS[appName]?.playStoreUrl ||
                'https://play.google.com/store/apps');
        }
    }, []);

    const renderContactHeader = () => (
        <View style={styles.contactHeader}>
            <View style={styles.contactContent}>
                {contact.imageAvailable && contact.image ? (
                    <Image source={{ uri: contact.image.uri }} style={styles.contactImage} />
                ) : (
                    <View style={styles.contactImagePlaceholder}>
                        <Text style={styles.contactInitial}>
                            {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
                        </Text>
                    </View>
                )}

                <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                        <Text style={styles.contactName} numberOfLines={1}>
                            {contact.name || 'Unknown Contact'}
                        </Text>
                        <View style={styles.contactStatus}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>Active</Text>
                        </View>
                    </View>
                    <Text style={styles.contactPhone}>
                        {contact.phoneNumbers?.[0]?.number || 'No phone number'}
                    </Text>
                </View>

                <View style={styles.contactActions}>
                    <TouchableOpacity style={styles.callButton}>
                        <Ionicons name="call" size={20} color="#8b5cf6" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.messageButton}>
                        <Ionicons name="chatbubble" size={20} color="#8b5cf6" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

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
                            <Ionicons name="person" size={20} color="#8b5cf6" />
                        </View>
                        <Text style={styles.headerTitle}>Send Money</Text>
                        <Text style={styles.headerSubtitle}>
                            {contact.name || 'Contact'}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="ellipsis-vertical" size={24} color="#8b5cf6" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    {renderContactHeader()}

                    <View style={styles.section}>
                        <Text style={styles.label}>Description*</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="What's this transaction for?"
                            value={formData.description}
                            onChangeText={(text) => handleInputChange('description', text)}
                            editable={isEditing}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Amount (₹)*</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={formData.amount.toString()}
                            onChangeText={(text) =>
                                handleInputChange('amount', text.replace(/[^0-9.]/g, ""))
                            }
                            editable={isEditing}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[
                                        styles.categoryButton,
                                        formData.category === cat.key && styles.selectedCategory,
                                    ]}
                                    onPress={() => handleInputChange('category', cat.key)}
                                    disabled={!isEditing}
                                >
                                    <View style={styles.categoryContent}>
                                        {cat.icon}
                                        <Text
                                            style={[
                                                styles.categoryText,
                                                formData.category === cat.key && styles.selectedCategoryText,
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                    <View style={styles.section}>
                        <Text style={styles.label}>Tags (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Comma separated tags (e.g., urgent, work, personal)"
                            value={formData.tags}
                            onChangeText={(text) => handleInputChange('tags', text)}
                            editable={isEditing}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Notes (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.notesInput]}
                            placeholder="Add any additional notes..."
                            value={formData.notes}
                            onChangeText={(text) => handleInputChange('notes', text)}
                            multiline
                            numberOfLines={3}
                            editable={isEditing}
                        />
                    </View>

                    {bankAccounts.length === 0 ? (
                        <View style={styles.section}>
                            <Text style={styles.label}>Select Bank Account*</Text>
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
                            {showErrors && errors.bankAccount && (
                                <Text style={styles.errorText}>{errors.bankAccount}</Text>
                            )}
                        </View>
                    ) : (
                        <>
                            <Text style={styles.label}>Select Bank Account*</Text>
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
                            {showErrors && errors.bankAccount && (
                                <Text style={styles.errorText}>{errors.bankAccount}</Text>
                            )}
                        </>
                    )}

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
                                        >
                                            <View style={styles.bankInfo}>
                                                <Ionicons
                                                    name={account.accountType === 'savings' ? 'cash-outline' : 'card-outline'}
                                                    size={24}
                                                    color="#009CF9"
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
                                                        <Ionicons name="star" size={16} color="#fff" />
                                                        <Text style={styles.primaryBadgeText}>Primary</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>

                    {isEditing && (
                        <View style={styles.paymentAppsContainer}>
                            <Text style={styles.sectionTitle}>Payment Options</Text>
                            <View style={styles.paymentAppsGrid}>
                                {Object.entries(PAYMENT_APPS).map(([appName, app]) => (
                                    <TouchableOpacity
                                        key={appName}
                                        style={[
                                            styles.paymentAppButton,
                                            { backgroundColor: app.color },
                                            selectedPaymentApp === appName && styles.selectedPaymentApp
                                        ]}
                                        onPress={() => setSelectedPaymentApp(appName)}
                                    >
                                        <Ionicons name={app.icon} size={24} color="#fff" />
                                        <Text style={styles.paymentAppText}>{appName}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {isEditing && (
                        <TouchableOpacity
                            style={[
                                styles.payButton,
                                loading && styles.loadingButton,
                                selectedPaymentApp && styles.selectedPayButton
                            ]}
                            onPress={handlePayment}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.payButtonText}>
                                    {transactionDetails._id ? "Update Transaction" : "Complete Transaction"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {error && (
                        <Text style={styles.errorText}>{error}</Text>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Transaction Result Screen */}
            <TransactionResultScreen
                visible={showResultScreen}
                type={resultType}
                title={resultData.title}
                subtitle={resultData.subtitle}
                amount={resultData.amount}
                transactionId={resultData.transactionId}
                bankAccount={resultData.bankAccount}
                category={resultData.category}
                groupName={resultData.groupName}
                contactName={resultData.contactName}
                onClose={() => setShowResultScreen(false)}
                onViewDetails={() => {
                    setShowResultScreen(false);
                    // Navigate to transaction details
                }}
                onShare={() => {
                    // Share transaction details
                    console.log('Sharing transaction details');
                }}
                onHome={() => {
                    setShowResultScreen(false);
                    if (route.params?.onTransactionComplete) {
                        route.params.onTransactionComplete();
                    }
                    navigation.goBack();
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
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
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#8b5cf6',
        marginTop: 0,
        fontWeight: '700',
        letterSpacing: 0.3,
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignSelf: 'flex-start',
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
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    contactHeader: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    contactContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    contactImage: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 16,
        borderWidth: 3,
        borderColor: '#8b5cf6',
    },
    contactImagePlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#8b5cf6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 3,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    contactInitial: {
        fontSize: 24,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    contactInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    contactNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    contactName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.3,
        flex: 1,
        marginRight: 12,
    },
    contactPhone: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    contactStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0f2fe',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#8b5cf6',
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        color: '#8b5cf6',
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    contactActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    messageButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontWeight: '600',
        fontSize: 14,
        marginTop: 10,
        marginBottom: 4,
        color: '#333',
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e9ecef',
        padding: 10,
        fontSize: 15,
        marginBottom: 4,
    },
    notesInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    categoryButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    categoryContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedCategory: {
        backgroundColor: '#007bff',
        borderColor: '#007bff',
    },
    categoryText: {
        color: '#495057',
        fontSize: 14,
        marginLeft: 6,
    },
    selectedCategoryText: {
        color: '#fff',
    },
    typeButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    selectedType: {
        backgroundColor: '#28a745',
        borderColor: '#28a745',
    },
    typeText: {
        color: '#495057',
        fontSize: 14,
    },
    selectedTypeText: {
        color: '#fff',
    },
    directionButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    selectedDirection: {
        backgroundColor: '#6c757d',
        borderColor: '#6c757d',
    },
    directionText: {
        color: '#495057',
        fontSize: 14,
    },
    selectedDirectionText: {
        color: '#fff',
    },
    paymentAppsContainer: {
        marginTop: 20,
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
    },
    paymentAppsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: 8,
    },
    paymentAppButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        minWidth: 90,
    },
    selectedPaymentApp: {
        transform: [{ scale: 1.05 }],
        shadowOpacity: 0.2,
    },
    paymentAppText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 4,
    },
    payButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    selectedPayButton: {
        backgroundColor: '#0056b3',
    },
    loadingButton: {
        opacity: 0.7,
    },
    payButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 4,
        marginBottom: 8,
        marginLeft: 4,
    },
    editButton: {
        padding: 8,
        marginRight: 8,
    },
    inputError: {
        borderColor: '#FF3B30',
        borderWidth: 1,
    },
    categoryGridError: {
        borderColor: '#FF3B30',
        borderWidth: 1,
        borderRadius: 8,
        padding: 4,
    },
    categoryBtnError: {
        borderColor: '#FF3B30',
    },
    successButton: {
        backgroundColor: '#34C759',
    },
    failedButton: {
        backgroundColor: '#FF3B30',
    },
    bankAccountSelector: {
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e9ecef',
        padding: 10,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectedBankAccount: {
        flex: 1,
    },
    bankInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bankDetails: {
        marginLeft: 10,
    },
    bankName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    accountType: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    balance: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
        marginTop: 4,
    },
    placeholderText: {
        color: '#666',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '75%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    bankAccountsList: {
        padding: 14,
    },
    bankAccountItem: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
    },
    selectedBankAccountItem: {
        borderColor: '#007AFF',
        borderWidth: 1.5,
        backgroundColor: '#e6f2ff',
    },
    accountRight: {
        alignItems: 'flex-end',
        marginTop: 6,
    },
    primaryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginTop: 4,
    },
    primaryBadgeText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
        marginLeft: 4,
    },
    noBankAccountContainer: {
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FFF9F0',
        borderRadius: 8,
        marginVertical: 8,
    },
    noBankAccountTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginTop: 8,
        marginBottom: 4,
    },
    noBankAccountText: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        marginBottom: 12,
    },
    addBankAccountButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    addBankAccountButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default ContactTran;