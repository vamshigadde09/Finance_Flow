import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Alert, Linking, Platform, Modal, RefreshControl, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5, Entypo } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import TransactionResultScreen from '../../TransactionSections/TransactionResultScreen';
import { API_BASE_URL } from '../../../api';

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
// Use a passive config object (no function calls here)
const PAYMENT_APPS = {
    GPay: { scheme: 'tez://upi/pay', pkg: 'com.google.android.apps.nbu.paisa.user' },
    PhonePe: { scheme: 'phonepe://upi/pay', pkg: 'com.phonepe.app' },
    Paytm: { scheme: 'paytmmp://upi/pay', pkg: 'net.one97.paytm' },
};

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
];

const SplitTransactions = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { selectedMembers = [], groupName, groupId, template } = route.params || {};

    // Initialize state with template data if available
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [splitWith, setSplitWith] = useState([]);
    const [splitType, setSplitType] = useState('even');
    const [customAmounts, setCustomAmounts] = useState([]);
    const [shareCounts, setShareCounts] = useState([]);
    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState('');
    const [receiptNumber, setReceiptNumber] = useState('');
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccount, setSelectedBankAccount] = useState(null);
    const [showBankAccounts, setShowBankAccounts] = useState(false);
    const [showAddBankAccount, setShowAddBankAccount] = useState(false);
    const [errors, setErrors] = useState({});
    const [showErrors, setShowErrors] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [bankAccountsLoading, setBankAccountsLoading] = useState(true);
    const [bankAccountsError, setBankAccountsError] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: '',
        description: '',
        notes: '',
        tags: '',
        receiptNumber: '',
        splitType: 'even',
        customAmounts: []
    });
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Transaction Result Screen State
    const [showResultScreen, setShowResultScreen] = useState(false);
    const [resultType, setResultType] = useState('success');
    const [resultData, setResultData] = useState({});

    // Initialize state with template data if available
    useEffect(() => {
        if (template) {
            // Update individual state variables
            setTitle(template.name || '');
            setAmount(template.amount?.toString() || '');
            setCategory(template.category || '');
            setDescription(template.description || '');
            setNotes(template.notes || '');
            setTags(template.tags?.join(', ') || '');
            setSplitType(template.splitType || 'even');

            // Update form data
            setFormData({
                title: template.name || '',
                amount: template.amount?.toString() || '',
                category: template.category || '',
                description: template.description || '',
                notes: template.notes || '',
                tags: template.tags?.join(', ') || '',
                receiptNumber: '',
                splitType: template.splitType || 'even',
                customAmounts: template.splitType === 'custom' && template.customAmounts ?
                    template.customAmounts.map(ca => ca.amount.toString()) : []
            });
        }
    }, [template]);

    // Initialize members when component mounts
    useEffect(() => {
        if (selectedMembers.length > 0) {
            // Get all group members from route params
            const allGroupMembers = route.params?.groupData?.members || [];

            // If template exists and has splitBetween members, use those for pre-selection
            if (template && template.splitBetween && template.splitBetween.length > 0) {
                const initialMembers = allGroupMembers.map(member => {
                    const isSelected = template.splitBetween.some(templateMember => templateMember._id === member._id);
                    return {
                        ...member,
                        selected: isSelected
                    };
                });
                setSplitWith(initialMembers);
                setCustomAmounts(new Array(initialMembers.length).fill(''));
                setShareCounts(new Array(initialMembers.length).fill(1));
            } else {
                // Only select members that were passed in selectedMembers
                const initialMembers = allGroupMembers.map(member => ({
                    ...member,
                    selected: selectedMembers.some(selectedMember => selectedMember._id === member._id)
                }));
                setSplitWith(initialMembers);
                setCustomAmounts(new Array(initialMembers.length).fill(''));
                setShareCounts(new Array(initialMembers.length).fill(1));
            }
        }
    }, [selectedMembers, template, route.params?.groupData?.members]);

    // Load saved form data only if no template is provided
    useEffect(() => {
        if (!template) {
            loadSavedFormData();
        }
    }, [template]);

    // Save form data whenever it changes, but only if no template is provided
    useEffect(() => {
        if (!template) {
            saveFormData();
        }
    }, [formData, template]);

    // Fetch bank accounts when component mounts
    useEffect(() => {
        fetchBankAccounts();
    }, []);

    const fetchBankAccounts = async (retryCount = 0) => {
        try {
            setBankAccountsLoading(true);
            setBankAccountsError(null);

            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('userData');

            if (!userData) {
                console.log('No user data found');
                setBankAccountsLoading(false);
                return;
            }

            if (!token) {
                console.log('No authentication token found');
                setBankAccountsLoading(false);
                return;
            }

            const parsedUserData = JSON.parse(userData);
            const userId = parsedUserData._id;

            console.log('Fetching bank accounts for user:', userId);
            console.log('API URL:', `${API_BASE_URL}/api/v1/bankaccounts/get-bank-accounts/${userId}`);

            const response = await fetch(`${API_BASE_URL}/api/v1/bankaccounts/get-bank-accounts/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000, // 10 second timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Bank accounts response:', data);

            if (data.success && data.data) {
                setBankAccounts(data.data);
                // Set primary account as selected by default
                const primaryAccount = data.data.find(acc => acc.isPrimary);
                setSelectedBankAccount(primaryAccount || data.data[0]);
                setBankAccountsError(null);
            } else {
                console.log('No bank accounts found or API returned error:', data.message);
                // Set empty array if no accounts found
                setBankAccounts([]);
                setBankAccountsError(data.message || 'No bank accounts found');
            }
        } catch (error) {
            console.error('Error fetching bank accounts:', error);

            // Provide more specific error messages
            let errorMessage = 'Failed to fetch bank accounts';
            if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
                errorMessage = 'Network connection failed. Please check your internet connection and try again.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out. Please try again.';
            } else if (error.message.includes('HTTP error')) {
                errorMessage = 'Server error. Please try again later.';
            }

            // Don't show alert for network errors, just log them
            console.log('Bank accounts fetch error:', errorMessage);

            // Set empty bank accounts array to prevent UI issues
            setBankAccounts([]);
            setBankAccountsError(errorMessage);

            // Retry mechanism (max 2 retries)
            if (retryCount < 2) {
                console.log(`Retrying bank accounts fetch... Attempt ${retryCount + 1}`);
                setTimeout(() => {
                    fetchBankAccounts(retryCount + 1);
                }, 2000 * (retryCount + 1)); // Exponential backoff
            }
        } finally {
            setBankAccountsLoading(false);
        }
    };

    const loadSavedFormData = async () => {
        try {
            const savedData = await AsyncStorage.getItem('splitTransactionFormData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                setFormData(parsedData);
                setTitle(parsedData.title);
                setAmount(parsedData.amount);
                setCategory(parsedData.category);
                setDescription(parsedData.description);
                setNotes(parsedData.notes);
                setTags(parsedData.tags);
                setReceiptNumber(parsedData.receiptNumber);
                setSplitType(parsedData.splitType);
                setCustomAmounts(parsedData.customAmounts);
            }
        } catch (error) {
            console.error('Error loading saved form data:', error);
        }
    };

    const saveFormData = async () => {
        try {
            const dataToSave = {
                title,
                amount,
                category,
                description,
                notes,
                tags,
                receiptNumber,
                splitType,
                customAmounts,
            };
            await AsyncStorage.setItem('splitTransactionFormData', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving form data:', error);
        }
    };

    const clearFormData = async () => {
        try {
            await AsyncStorage.removeItem('splitTransactionFormData');
            setTitle('');
            setAmount('');
            setCategory('');
            setDescription('');
            setNotes('');
            setTags('');
            setReceiptNumber('');
            setSplitType('even');
            setCustomAmounts([]);
            setErrors({});
            setShowErrors(false);
        } catch (error) {
            console.error('Error clearing form data:', error);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchBankAccounts();
            // Optionally refresh other data here
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    }, []);

    const toggleMember = (index) => {
        setSplitWith(prev => {
            const updated = [...prev];
            updated[index].selected = !updated[index].selected;
            return updated;
        });
    };

    const calculateEvenSplit = () => {
        const selectedCount = splitWith.filter(m => m.selected).length;
        if (selectedCount === 0 || !amount) return '0.00';
        return (parseFloat(amount) / selectedCount).toFixed(2);
    };

    const handleCustomAmountChange = (index, value) => {
        const newAmounts = [...customAmounts];
        newAmounts[index] = value.replace(/[^0-9.]/g, '');
        setCustomAmounts(newAmounts);
    };

    const validateCustomSplit = () => {
        if (splitType !== 'custom') return true;

        const selectedMembers = splitWith.filter(m => m.selected);
        const totalCustomAmount = customAmounts
            .slice(0, selectedMembers.length)
            .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

        const total = parseFloat(amount || 0);

        if (Math.abs(totalCustomAmount - total) > 0.01) {
            Alert.alert(
                "Mismatch in Custom Split",
                `The total of entered amounts (₹${totalCustomAmount.toFixed(2)}) doesn't match the overall amount (₹${total.toFixed(2)}). Please adjust.`
            );
            return false;
        }

        return true;
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

        if (!splitWith.filter(m => m.selected).length) {
            newErrors.members = 'Please select at least one member to split with';
        }

        if (splitType === 'custom') {
            const selectedMembers = splitWith.filter(m => m.selected);
            const totalCustomAmount = customAmounts
                .slice(0, selectedMembers.length)
                .reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

            if (Math.abs(totalCustomAmount - parseFloat(amount)) > 0.01) {
                newErrors.customAmounts = 'Custom split amounts must equal the total amount';
            }
        } else if (splitType === 'share') {
            const selectedMembers = splitWith.filter(m => m.selected);
            const shares = shareCounts.slice(0, selectedMembers.length).map(v => parseFloat(v) || 0);
            const totalShares = shares.reduce((s, v) => s + v, 0);
            if (totalShares <= 0) {
                newErrors.customAmounts = 'Enter at least one share to split by shares';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePayment = async () => {
        setShowErrors(true);
        if (!validateForm()) {
            return;
        }

        // Validate required fields with detailed logging
        const missingFields = [];
        if (!title) missingFields.push('title');
        if (!amount) missingFields.push('amount');
        if (!category) missingFields.push('category');
        if (!groupId) missingFields.push('groupId');
        if (!splitWith.filter(m => m.selected).length) missingFields.push('selectedMembers');
        if (!selectedBankAccount) missingFields.push('bankAccount');

        if (missingFields.length > 0) {
            Alert.alert("Error", `Please fill all required fields: ${missingFields.join(', ')}`);
            return;
        }

        const selectedMembers = splitWith.filter(m => m.selected);
        if (selectedMembers.length === 0) {
            Alert.alert("Error", "Please select at least one person to split with");
            return;
        }

        if (splitType === 'custom' && !validateCustomSplit()) {
            return;
        }

        // Show processing result screen
        setResultType('processing');
        setResultData({
            title: 'Processing Transaction',
            subtitle: 'Please wait while we process your transaction...',
            amount: parseFloat(amount),
            category: category,
            bankAccount: selectedBankAccount?.bankName,
            groupName: groupName,
        });
        setShowResultScreen(true);

        // Simulate processing time
        setTimeout(async () => {
            try {
                setUploading(true);
                const token = await AsyncStorage.getItem('token');
                const userData = await AsyncStorage.getItem('userData');

                if (!token || !userData) {
                    throw new Error("Authentication token or user data not found");
                }

                const parsedUserData = JSON.parse(userData);
                const currentUserId = parsedUserData._id;

                // Prepare the transaction data
                const transactionData = {
                    title,
                    description,
                    amount: parseFloat(amount),
                    category: category || "Other",
                    paidBy: currentUserId,
                    splitBetween: selectedMembers.map(m => m._id),
                    group: groupId,
                    bankAccountId: selectedBankAccount?._id,
                    splitType: splitType,
                    customAmounts:
                        splitType === 'custom'
                            ? customAmounts.slice(0, selectedMembers.length).map(a => parseFloat(a) || 0)
                            : splitType === 'share'
                                ? (function () {
                                    const shares = shareCounts
                                        .slice(0, selectedMembers.length)
                                        .map(v => parseFloat(v) || 0);
                                    const totalShares = shares.reduce((s, v) => s + v, 0);
                                    const totalAmount = parseFloat(amount);
                                    return shares.map(sh => (totalShares > 0 ? (totalAmount * sh) / totalShares : 0));
                                })()
                                : []
                };

                const response = await axios.post(
                    `${API_BASE_URL}/api/v1/splits/create-transaction`,
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
                    setPaymentStatus("success");
                    await clearFormData();

                    // Transition from processing to success
                    setResultType('success');
                    setResultData({
                        title: 'Transaction Successful!',
                        subtitle: 'Your split transaction has been completed successfully',
                        amount: parseFloat(amount),
                        transactionId: response.data.data?._id || 'TXN' + Date.now(),
                        category: category,
                        bankAccount: selectedBankAccount?.bankName,
                        groupName: groupName,
                    });
                } else {
                    throw new Error(response.data.message || 'Failed to save transaction');
                }
            } catch (error) {
                console.error("Error in transaction creation:", error);
                console.error("Error details:", {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status
                });
                let errorMessage = "Failed to save transaction. Please try again.";

                if (error.response) {
                    console.error("Error response data:", error.response.data);
                    console.error("Error response status:", error.response.status);
                    errorMessage = error.response.data?.message || errorMessage;
                    if (error.response.data?.missingFields) {
                        errorMessage += `\nMissing fields: ${error.response.data.missingFields.join(', ')}`;
                    }
                } else if (error.request) {
                    console.error("No response received:", error.request);
                    errorMessage = "No response from server. Please check your internet connection and make sure the server is running.";
                } else {
                    console.error("Error message:", error.message);
                    errorMessage = error.message;
                }

                // Show error result screen
                setResultType('error');
                setResultData({
                    title: 'Transaction Failed',
                    subtitle: errorMessage,
                    amount: parseFloat(amount),
                    category: category,
                    bankAccount: selectedBankAccount?.bankName,
                    groupName: groupName,
                });
                setPaymentStatus("failed");
            } finally {
                setUploading(false);
            }
        }, 2000); // 2 second delay to show processing
    };

    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template);
        setTitle(template.name || '');
        setAmount(template.amount?.toString() || '');
        setCategory(template.category || '');
        setDescription(template.description || '');
        setNotes(template.notes || '');
        setTags(template.tags?.join(', ') || '');
        setSplitType(template.splitType || 'even');

        if (template.splitType === 'custom' && template.customAmounts) {
            const amounts = template.customAmounts.map(ca => ca.amount.toString());
            setCustomAmounts(amounts);
        }

        setFormData(prev => ({
            ...prev,
            title: template.name || '',
            amount: template.amount?.toString() || '',
            category: template.category || '',
            description: template.description || '',
            notes: template.notes || '',
            tags: template.tags?.join(', ') || '',
            splitType: template.splitType || 'even',
            customAmounts: template.splitType === 'custom' && template.customAmounts ?
                template.customAmounts.map(ca => ca.amount.toString()) : []
        }));

        setShowTemplateModal(false);
    };

    const renderTemplateModal = () => (
        <Modal
            visible={showTemplateModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowTemplateModal(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Template</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowTemplateModal(false)}
                        >
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color="#0000ff" />
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : templates.length === 0 ? (
                        <Text style={styles.emptyText}>No templates available</Text>
                    ) : (
                        <FlatList
                            data={templates}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.templateItem}
                                    onPress={() => handleTemplateSelect(item)}
                                >
                                    <Text style={styles.templateName}>{item.name}</Text>
                                    {item.description && (
                                        <Text style={styles.templateDescription}>
                                            {item.description}
                                        </Text>
                                    )}
                                    <View style={styles.templateMeta}>
                                        <Text style={styles.templateCategory}>{item.category}</Text>
                                        <Text style={styles.templateSplitType}>
                                            {item.splitType === "even" ? "Even Split" : "Custom Split"}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={styles.templateList}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
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
                            <Text style={styles.headerTitle}>{groupName || 'New Transaction'}</Text>
                            <Text style={styles.headerSubtitle}>{selectedMembers.length} members</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="ellipsis-vertical" size={24} color="#8b5cf6" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#007AFF']}
                        tintColor="#007AFF"
                    />
                }
            >
                <Text style={styles.label}>Title*</Text>
                <TextInput
                    style={[styles.input, errors.title && styles.inputError]}
                    placeholder="E.g., Grocery Shopping"
                    value={title}
                    onChangeText={(text) => {
                        setTitle(text);
                        setFormData(prev => ({ ...prev, title: text }));
                    }}
                />
                {showErrors && errors.title && (
                    <Text style={styles.errorText}>{errors.title}</Text>
                )}

                <Text style={styles.label}>Amount*</Text>
                <View style={[styles.amountRow, errors.amount && styles.inputError]}>
                    <Text style={styles.amountPrefix}>₹</Text>
                    <TextInput
                        style={styles.amountInput}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={(text) => {
                            setAmount(text);
                            setFormData(prev => ({ ...prev, amount: text }));
                        }}
                    />
                </View>
                {showErrors && errors.amount && (
                    <Text style={styles.errorText}>{errors.amount}</Text>
                )}

                <Text style={styles.label}>Category*</Text>
                <View style={[styles.categoryGrid, errors.category && styles.categoryGridError]}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[
                                styles.categoryBtn,
                                category === cat.key && styles.categoryBtnActive,
                                errors.category && styles.categoryBtnError
                            ]}
                            onPress={() => {
                                setCategory(cat.key);
                                setFormData(prev => ({ ...prev, category: cat.key }));
                            }}
                        >
                            {cat.icon}
                            <Text style={styles.categoryText} numberOfLines={1}>{cat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {showErrors && errors.category && (
                    <Text style={styles.errorText}>{errors.category}</Text>
                )}

                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={styles.textarea}
                    placeholder="Add details about this transaction"
                    value={description}
                    onChangeText={(text) => {
                        setDescription(text);
                        setFormData(prev => ({ ...prev, description: text }));
                    }}
                    multiline
                    numberOfLines={3}
                />

                {/* Split Type moved above member list */}
                <View style={styles.section}>
                    <Text style={styles.label}>Split Type*</Text>
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
                                Custom Amounts
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
                    {showErrors && errors.members && (
                        <Text style={styles.errorText}>{errors.members}</Text>
                    )}
                    {splitWith.map((member, index) => (
                        <TouchableOpacity
                            key={member._id}
                            style={[
                                styles.memberItem,
                                member.selected && styles.selectedMemberItem
                            ]}
                            onPress={() => toggleMember(index)}
                        >
                            <View style={styles.memberContent}>
                                {/* Left checkbox */}
                                <View style={[
                                    styles.checkbox,
                                    styles.checkboxLeft,
                                    member.selected && styles.checkboxSelected
                                ]}>
                                    {member.selected && (
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                    )}
                                </View>

                                {member.avatar ? (
                                    <Image source={{ uri: member.avatar }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.initials}>
                                            {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.memberInfo}>
                                    <View style={styles.memberHeaderRow}>
                                        <Text
                                            style={styles.memberName}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                        >
                                            {member.name}
                                        </Text>
                                        {splitType === 'share' && (() => {
                                            const totalAmountNum = parseFloat(amount) || 0;
                                            const totalShares = splitWith.reduce((s, m, i) => s + (m.selected ? (parseFloat(shareCounts[i]) || 0) : 0), 0);
                                            const mShare = parseFloat(shareCounts[index]) || 0;
                                            const mAmt = totalShares > 0 ? (totalAmountNum * mShare) / totalShares : 0;
                                            return <Text style={styles.memberShareAmount}>₹{mAmt.toFixed(2)}</Text>;
                                        })()}
                                    </View>
                                    <Text
                                        style={styles.memberPhone}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {member.phone}
                                    </Text>
                                </View>

                                {/* Inline split controls */}
                                {member.selected && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {splitType === 'even' && (
                                            <Text style={{ color: '#8b5cf6', fontWeight: '800' }}>₹{calculateEvenSplit()}</Text>
                                        )}

                                        {splitType === 'custom' && (
                                            <TextInput
                                                style={styles.customAmountInput}
                                                placeholder="0.00"
                                                keyboardType="numeric"
                                                value={customAmounts[index]}
                                                onChangeText={(value) => handleCustomAmountChange(index, value)}
                                            />
                                        )}

                                        {splitType === 'share' && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <TouchableOpacity
                                                    style={styles.shareBtn}
                                                    onPress={() => {
                                                        setShareCounts(prev => {
                                                            const arr = [...prev];
                                                            arr[index] = Math.max(0, (arr[index] || 1) - 1);
                                                            return arr;
                                                        });
                                                    }}
                                                >
                                                    <Text style={styles.shareBtnText}>−</Text>
                                                </TouchableOpacity>
                                                <Text style={styles.shareCountText}>{shareCounts[index] || 1}</Text>
                                                <TouchableOpacity
                                                    style={styles.shareBtn}
                                                    onPress={() => {
                                                        setShareCounts(prev => {
                                                            const arr = [...prev];
                                                            arr[index] = (arr[index] || 1) + 1;
                                                            return arr;
                                                        });
                                                    }}
                                                >
                                                    <Text style={styles.shareBtnText}>+</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}

                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {splitType === 'even' && (
                    <></>
                )}

                {splitType === 'custom' && (
                    <></>
                )}

                {splitType === 'share' && (
                    <></>
                )}

                <Text style={styles.label}>Notes</Text>
                <TextInput
                    style={styles.textarea}
                    placeholder="Add any additional notes"
                    value={notes}
                    onChangeText={(text) => {
                        setNotes(text);
                        setFormData(prev => ({ ...prev, notes: text }));
                    }}
                    multiline
                    numberOfLines={2}
                />

                <Text style={styles.label}>Tags (comma-separated)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="E.g., monthly, groceries, shared"
                    value={tags}
                    onChangeText={(text) => {
                        setTags(text);
                        setFormData(prev => ({ ...prev, tags: text }));
                    }}
                />

                <View style={styles.section}>
                    <Text style={styles.label}>Receipt Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter receipt number"
                        value={receiptNumber}
                        onChangeText={setReceiptNumber}
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

                        {bankAccountsLoading ? (
                            <View style={styles.bankAccountSelector}>
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="#8b5cf6" />
                                    <Text style={styles.loadingText}>Loading bank accounts...</Text>
                                </View>
                            </View>
                        ) : bankAccountsError ? (
                            <View style={styles.bankAccountSelector}>
                                <View style={styles.errorContainer}>
                                    <Ionicons name="warning-outline" size={24} color="#ef4444" />
                                    <View style={styles.errorTextContainer}>
                                        <Text style={styles.errorTitle}>Failed to load bank accounts</Text>
                                        <Text style={styles.errorSubtitle}>{bankAccountsError}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={() => fetchBankAccounts()}
                                    >
                                        <Ionicons name="refresh" size={20} color="#8b5cf6" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : bankAccounts.length === 0 && !bankAccountsError ? (
                            <View style={styles.bankAccountSelector}>
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="add-circle-outline" size={24} color="#8b5cf6" />
                                    <View style={styles.emptyTextContainer}>
                                        <Text style={styles.emptyTitle}>No bank accounts found</Text>
                                        <Text style={styles.emptySubtitle}>Add a bank account to continue</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.addButton}
                                        onPress={() => setShowAddBankAccount(true)}
                                    >
                                        <Ionicons name="add" size={20} color="#8b5cf6" />
                                    </TouchableOpacity>
                                </View>
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
                                                color="#8b5cf6"
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
                                <Ionicons name="chevron-down" size={20} color="#8b5cf6" />
                            </TouchableOpacity>
                        )}

                        {showErrors && errors.bankAccount && (
                            <Text style={styles.errorText}>{errors.bankAccount}</Text>
                        )}
                    </>
                )}
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
                <TouchableOpacity
                    style={[
                        styles.saveBtn,
                        paymentStatus === "success" && styles.successButton,
                        paymentStatus === "failed" && styles.failedButton
                    ]}
                    onPress={handlePayment}
                >
                    <Text style={styles.saveBtnText}>
                        {paymentStatus === "success"
                            ? "Payment Successful ✓"
                            : paymentStatus === "failed"
                                ? "Payment Failed ✗"
                                : "Complete Transaction"}
                    </Text>
                </TouchableOpacity>
                {/* Bank Account Selection Modal */}
                <Modal
                    visible={showBankAccounts}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowBankAccounts(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.bankModal}>
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
                }}
                onHome={() => {
                    setShowResultScreen(false);
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
        paddingHorizontal: 20,
        paddingTop: '10%',
        paddingBottom: '10%',
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
        borderBottomWidth: 0,
        backgroundColor: 'transparent',
        paddingTop: 10,
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
    headerTextContainer: {
        flex: 1,
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
    label: {
        fontWeight: '700',
        fontSize: 16,
        marginTop: 8,
        marginBottom: 8,
        color: '#1f2937',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        fontSize: 16,
        marginBottom: 8,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#8b5cf6',
        color: '#1f2937',
        fontWeight: '600',
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 16,
        marginBottom: 8,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#8b5cf6',
    },
    amountPrefix: {
        fontSize: 18,
        color: '#8b5cf6',
        marginRight: 8,
        fontWeight: '700',
    },
    amountInput: {
        flex: 1,
        fontSize: 18,
        paddingVertical: 12,
        color: '#1f2937',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
        gap: 8,
    },
    categoryBtn: {
        width: '23%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        alignItems: 'center',
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    categoryBtnActive: {
        borderColor: '#8b5cf6',
        backgroundColor: '#f3f4f6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    categoryText: {
        fontSize: 12,
        color: '#1f2937',
        marginTop: 6,
        textAlign: 'center',
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    textarea: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
        color: '#1f2937',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#8b5cf6',
        fontWeight: '600',
    },
    section: {
        marginBottom: 20,
    },
    memberItem: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    selectedMemberItem: {
        borderColor: '#8b5cf6',
        backgroundColor: '#f3f4f6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    memberContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        minHeight: 60, // Ensure minimum height
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#8b5cf6',
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#8b5cf6',
    },
    initials: {
        fontSize: 16,
        fontWeight: '800',
        color: '#8b5cf6',
    },
    memberInfo: {
        flex: 1,
        marginRight: 12,
        minWidth: 0, // Prevents flex shrinking issues
    },
    memberHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
        flex: 1,
        marginRight: 12,
        letterSpacing: 0.3,
        flexWrap: 'nowrap',
        numberOfLines: 1,
        ellipsizeMode: 'tail',
    },
    memberPhone: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        flexWrap: 'nowrap',
        numberOfLines: 1,
        ellipsizeMode: 'tail',
    },
    memberShareAmount: {
        fontSize: 18,
        color: '#8b5cf6',
        fontWeight: '800',
        marginLeft: 12,
        minWidth: 90,
        textAlign: 'right',
        letterSpacing: 0.5,
        flexShrink: 0, // Prevents the amount from shrinking
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 0,
        backgroundColor: '#ffffff',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    checkboxLeft: {
        marginLeft: 0,
        marginRight: 12,
    },
    checkboxSelected: {
        backgroundColor: '#8b5cf6',
        borderColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    evenSplitAmount: {
        fontSize: 22,
        fontWeight: '800',
        color: '#8b5cf6',
        textAlign: 'center',
        marginTop: 8,
        letterSpacing: 0.5,
    },
    customAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    customAmountInput: {
        width: 110,
        padding: 8,
        borderWidth: 1,
        borderColor: '#8b5cf6',
        borderRadius: 12,
        textAlign: 'right',
        backgroundColor: '#f3f4f6',
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
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
    paymentAppsContainer: {
        marginTop: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
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
    saveBtn: {
        backgroundColor: '#8b5cf6',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 24,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    saveBtnText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 18,
        letterSpacing: 0.5,
    },
    successButton: {
        backgroundColor: '#10b981',
        shadowColor: '#10b981',
    },
    failedButton: {
        backgroundColor: '#ef4444',
        shadowColor: '#ef4444',
    },
    splitTypeContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#f3f4f6',
        borderRadius: 16,
        padding: 4,
    },
    splitTypeBtn: {
        flex: 1,
        backgroundColor: 'transparent',
        borderRadius: 12,
        borderWidth: 0,
        padding: 12,
        marginHorizontal: 2,
        alignItems: 'center',
    },
    splitTypeBtnActive: {
        backgroundColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    splitTypeText: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '700',
    },
    splitTypeTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    bankAccountSelector: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderLeftWidth: 3,
        borderLeftColor: '#8b5cf6',
    },
    selectedBankAccount: {
        flex: 1,
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
    bankInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    bankDetails: {
        marginLeft: 12,
    },
    bankName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.3,
    },
    accountType: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
        fontWeight: '600',
    },
    balance: {
        fontSize: 16,
        fontWeight: '800',
        color: '#8b5cf6',
        marginTop: 4,
        textAlign: 'right',
        letterSpacing: 0.5,
    },
    placeholderText: {
        color: '#6b7280',
        fontSize: 16,
        fontWeight: '600',
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
    bankModal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        maxHeight: '75%',
        borderWidth: 1,
        borderColor: '#e6f4fd',
        shadowColor: '#06a6f7',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
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
    closeButton: {
        padding: 5,
    },
    errorContainer: {
        padding: 10,
        backgroundColor: '#FFE6E6',
        borderRadius: 5,
        marginBottom: 10,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 12,
    },
    emptyText: {
        color: '#666',
        fontSize: 14,
    },
    templateItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    templateName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    templateDescription: {
        fontSize: 12,
        color: '#666',
    },
    templateMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    templateCategory: {
        fontSize: 12,
        color: '#666',
    },
    templateSplitType: {
        fontSize: 12,
        color: '#666',
    },
    templateList: {
        padding: 10,
    },
    bankAccountsList: {
        padding: 14,
    },
    bankAccountItem: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    selectedBankAccountItem: {
        borderColor: '#8b5cf6',
        borderWidth: 2,
        backgroundColor: '#f3f4f6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    accountRight: {
        alignItems: 'flex-end',
        marginTop: 0,
        marginLeft: 10,
    },
    primaryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginTop: 6,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    primaryBadgeText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 12,
        marginLeft: 6,
        letterSpacing: 0.3,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    loadingText: {
        marginLeft: 8,
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '600',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    errorTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ef4444',
        marginBottom: 2,
    },
    errorSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 16,
    },
    retryButton: {
        padding: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    emptyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    emptyTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#6b7280',
        marginBottom: 2,
    },
    emptySubtitle: {
        fontSize: 12,
        color: '#9ca3af',
        lineHeight: 16,
    },
    addButton: {
        padding: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
});

export default SplitTransactions;