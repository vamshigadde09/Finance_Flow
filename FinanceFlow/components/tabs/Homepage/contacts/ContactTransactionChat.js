import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    FlatList,
    Alert,
    StyleSheet,
    Image,
    Linking,
    StatusBar,
    Platform,
    BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useIsFocused } from '@react-navigation/native';

import { API_BASE_URL } from '../../../../api';

// ContactHeader Component
const ContactHeader = ({ contact, navigation }) => {
    return (
        <View style={styles.contactHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#8b5cf6" />
            </TouchableOpacity>

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
                <Text style={styles.contactName} numberOfLines={1} ellipsizeMode="tail">
                    {contact.name || 'No Name'}
                </Text>
                <Text style={styles.contactPhone}>
                    {contact.phoneNumbers?.[0]?.number || 'No phone number'}
                </Text>
            </View>
        </View>
    );
};

// TransactionItem Component
const TransactionItem = ({ item, contact, userPhoneNumber, togglePaymentStatus }) => {
    const isOutgoing = item.transactionType === 'expense' && item.user.phoneNumber === userPhoneNumber;
    const isIncoming = item.transactionType === 'expense' && item.contact.phone.includes(userPhoneNumber);

    return (
        <View style={[
            styles.messageContainer,
            isOutgoing ? styles.sentContainer : styles.receivedContainer
        ]}>
            <View style={[
                styles.bubble,
                isOutgoing ? styles.sentBubble : styles.receivedBubble
            ]}>
                <View style={styles.amountContainer}>
                    <Text style={[
                        styles.amountText,
                        isOutgoing ? styles.sentAmountText : styles.receivedAmountText
                    ]}>
                        ₹{item.amount.toFixed(2)}
                    </Text>
                </View>

                {item.category && (
                    <View style={styles.categoryContainer}>
                        <Ionicons name="pricetag-outline" size={14} color={isOutgoing ? '#2E7D32' : '#1565C0'} />
                        <Text style={[
                            styles.categoryText,
                            isOutgoing ? styles.sentCategoryText : styles.receivedCategoryText
                        ]}>
                            {item.category}
                        </Text>
                    </View>
                )}

                {item.description && (
                    <Text style={[
                        styles.descriptionText,
                        isOutgoing ? styles.sentDescriptionText : styles.receivedDescriptionText
                    ]}>
                        {item.description}
                    </Text>
                )}

                <View style={styles.footer}>
                    <Text style={styles.timeText}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={styles.dateText}>
                        {new Date(item.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </Text>
                </View>

                {item.paymentLink && (
                    <TouchableOpacity
                        style={[
                            styles.linkButton,
                            isOutgoing ? styles.sentLinkButton : styles.receivedLinkButton
                        ]}
                        onPress={() => Linking.openURL(item.paymentLink)}
                    >
                        <Ionicons name="link-outline" size={14} color={isOutgoing ? '#2E7D32' : '#1565C0'} />
                        <Text style={[
                            styles.linkText,
                            isOutgoing ? styles.sentLinkText : styles.receivedLinkText
                        ]}>
                            View Payment Link
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// ActionButtons Component
const ActionButtons = ({ onPayPress, initialAmount }) => {
    const [amount, setAmount] = useState(initialAmount || '');

    useEffect(() => {
        setAmount(initialAmount || '');
    }, [initialAmount]);

    const handlePayPress = () => {
        const trimmedAmount = amount.trim();
        if (!trimmedAmount) {
            Alert.alert("Error", "Please enter an amount");
            return;
        }
        if (isNaN(parseFloat(trimmedAmount))) {
            Alert.alert("Error", "Please enter a valid number");
            return;
        }
        onPayPress(trimmedAmount);
    };

    return (
        <View style={styles.actioncontainer}>
            <View style={styles.actionButtonsContainer}>
                <TextInput
                    style={[styles.amountInput, { flex: 3 }]}
                    placeholder="Enter amount"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={text => {
                        setAmount(text.replace(/[^0-9.]/g, ''));
                    }}
                    returnKeyType="done"
                    onSubmitEditing={handlePayPress}
                />
                <TouchableOpacity
                    style={[styles.actionButton, styles.payButton, { flex: 1 }]}
                    onPress={handlePayPress}
                    activeOpacity={0.8}
                >
                    <Text style={styles.actionButtonText}>Pay</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Main TransactionChatScreen Component
const TransactionChatScreen = ({ route, navigation }) => {
    const { contact, sentamount, groupId } = route.params;
    const [transactions, setTransactions] = useState([]);
    const [amount, setAmount] = useState(sentamount || '');
    const [isLoading, setIsLoading] = useState(true);
    const [userPhoneNumber, setUserPhoneNumber] = useState('');
    const [error, setError] = useState(null);
    const isFocused = useIsFocused();

    useEffect(() => {
        let intervalId;

        if (isFocused) {
            fetchUserData();
            fetchTransactions();
            setAmount('');

            intervalId = setInterval(() => {
                fetchTransactions();
            }, 5000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isFocused]);

    useEffect(() => {
        if (sentamount) {
            setAmount(sentamount);
        }
    }, [sentamount]);

    useEffect(() => {
        navigation.setOptions({ title: contact.name || 'Transaction History' });
    }, []);

    useEffect(() => {
        const backAction = () => {
            navigation.goBack();
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [navigation]);

    const fetchUserData = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                navigation.navigate("Login");
                return;
            }

            const user = JSON.parse(userData);
            setUserPhoneNumber(user.phoneNumber);
        } catch (error) {
            console.error("Error fetching user data:", error);
            setError("Failed to load user data");
        }
    };

    const fetchTransactions = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                navigation.navigate("Login");
                return;
            }
            const user = JSON.parse(userData);
            const contactNumber = contact.phoneNumbers?.[0]?.number;

            if (!contactNumber) {
                throw new Error("Contact phone number is missing");
            }


            const normalizePhoneNumber = (phone) => {
                const digits = phone.replace(/\D/g, '');
                if (digits.length === 12 && digits.startsWith('91')) {
                    return digits.substring(2);
                }
                if (digits.length > 10 && digits.startsWith('91')) {
                    return digits.slice(-10);
                }
                return digits.slice(-10);
            };

            const normalizedContactNumber = normalizePhoneNumber(contactNumber);

            const response = await axios.get(`${API_BASE_URL}/api/v1/contact/personal-contact`, {
                headers: { Authorization: `Bearer ${user.token}` },
                params: {
                    contactNumber: normalizedContactNumber,
                    isContactTransaction: true
                }
            });


            const processedTransactions = response.data.transactions.map(tx => {
                const isSender = tx.user.toString() === user._id;
                let displayType;
                if (tx.transactionType === 'expense') {
                    displayType = isSender ? 'sent' : 'received';
                } else {
                    displayType = isSender ? 'requested' : 'requested_from_you';
                }

                return {
                    ...tx,
                    isSentByMe: isSender,
                    displayType
                };
            });

            setTransactions(processedTransactions);

        } catch (error) {
            console.error("Error fetching transactions:", error);
            console.error("Error details:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            setError(error.response?.data?.message || error.message || "Failed to load transactions");

            if (error.response?.status === 401) {
                console.log('Session expired, redirecting to login');
                Alert.alert("Session Expired", "Please login again");
                navigation.navigate("Login");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaymentSuccess = () => {
        if (route.params?.onPaymentSuccess) {
            route.params.onPaymentSuccess();
        }
        fetchTransactions();
    };

    const handlePayPress = (amount) => {
        if (!amount || isNaN(parseFloat(amount))) {
            Alert.alert("Error", "Please enter a valid amount");
            return;
        }

        navigation.navigate('ContactTran', {
            contact,
            sentamount: amount,
            groupId: groupId,
            description: route.params.isSettleUp
                ? `Settle up for ${route.params.groupName || 'split'} group`
                : '',
            onTransactionComplete: () => {
                fetchTransactions();
                handlePaymentSuccess();
            }
        });
    };

    const togglePaymentStatus = async (transactionId, currentStatus) => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                navigation.navigate("Login");
                return;
            }

            const user = JSON.parse(userData);
            const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';

            await axios.put(
                `${API_BASE_URL}/api/v1/transactions/personal/${transactionId}/status`,
                { paymentStatus: newStatus },
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    }
                }
            );

            fetchTransactions();
        } catch (error) {
            console.error("Error toggling payment status:", error);
            Alert.alert("Error", error.response?.data?.message || "Failed to update payment status");
        }
    };

    return (
        <View style={styles.safeArea}>
            <View style={styles.container}>
                <ContactHeader contact={contact} navigation={navigation} />

                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={fetchTransactions}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={transactions}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <TransactionItem
                                item={item}
                                contact={contact}
                                userPhoneNumber={userPhoneNumber}
                                togglePaymentStatus={togglePaymentStatus}
                            />
                        )}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={
                            !isLoading && (
                                <Text style={styles.emptyStateText}>
                                    {isLoading ? 'Loading...' : 'No transactions yet'}
                                </Text>
                            )
                        }
                        refreshing={isLoading}
                        onRefresh={fetchTransactions}
                        inverted={true}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                <ActionButtons
                    onPayPress={handlePayPress}
                    initialAmount={amount}
                />
            </View>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        paddingBottom: 60,
    },
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    contactHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    backButton: {
        marginRight: 12,
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
    },
    contactImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#8b5cf6',
    },
    contactImagePlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#8b5cf6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    contactInitial: {
        fontSize: 20,
        color: '#ffffff',
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    contactInfo: {
        marginLeft: 12,
        flex: 1,
    },
    contactName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.3,
    },
    contactPhone: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        marginTop: 2,
    },
    messageContainer: {
        width: '100%',
        paddingHorizontal: 16,
        marginVertical: 4,
    },
    sentContainer: {
        alignItems: 'flex-end',
    },
    receivedContainer: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '90%',
        minWidth: 150,
        padding: 16,
        borderRadius: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sentBubble: {
        backgroundColor: '#f0f9ff',
        borderTopRightRadius: 6,
    },
    receivedBubble: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 6,
    },
    amountContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    amountText: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    sentAmountText: {
        color: '#8b5cf6',
    },
    receivedAmountText: {
        color: '#22c55e',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginTop: 4,
    },
    sentStatusBadge: {
        backgroundColor: '#e0f2fe',
        borderWidth: 1,
        borderColor: '#8b5cf6',
    },
    receivedStatusBadge: {
        backgroundColor: '#dcfce7',
        borderWidth: 1,
        borderColor: '#22c55e',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    sentStatusText: {
        color: '#8b5cf6',
    },
    receivedStatusText: {
        color: '#22c55e',
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    categoryText: {
        fontSize: 13,
        marginLeft: 4,
        fontWeight: '600',
    },
    sentCategoryText: {
        color: '#8b5cf6',
    },
    receivedCategoryText: {
        color: '#22c55e',
    },
    descriptionText: {
        fontSize: 14,
        marginBottom: 6,
        lineHeight: 18,
        fontWeight: '500',
    },
    sentDescriptionText: {
        color: '#1f2937',
    },
    receivedDescriptionText: {
        color: '#1f2937',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 4,
    },
    timeText: {
        fontSize: 11,
        color: '#6b7280',
        marginRight: 4,
        fontWeight: '500',
    },
    dateText: {
        fontSize: 11,
        color: '#6b7280',
        fontWeight: '500',
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        padding: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sentLinkButton: {
        backgroundColor: '#e0f2fe',
        borderWidth: 1,
        borderColor: '#8b5cf6',
    },
    receivedLinkButton: {
        backgroundColor: '#dcfce7',
        borderWidth: 1,
        borderColor: '#22c55e',
    },
    linkText: {
        marginLeft: 4,
        fontSize: 12,
        fontWeight: '600',
    },
    sentLinkText: {
        color: '#8b5cf6',
    },
    receivedLinkText: {
        color: '#22c55e',
    },
    actioncontainer: {
        padding: 16,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    amountInput: {
        height: 48,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: '#ffffff',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderLeftWidth: 3,
        borderLeftColor: '#8b5cf6',
        fontWeight: '600',
        color: '#1f2937',
    },
    actionButton: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    payButton: {
        backgroundColor: '#8b5cf6',
    },
    actionButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    listContainer: {
        flexGrow: 1,
        paddingBottom: 24,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    emptyStateText: {
        textAlign: 'center',
        marginTop: 60,
        color: '#6b7280',
        fontSize: 16,
        fontWeight: '600',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        fontWeight: '600',
    },
    retryButton: {
        backgroundColor: '#8b5cf6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.5,
    },
});

export default TransactionChatScreen;