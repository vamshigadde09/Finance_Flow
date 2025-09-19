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
                <Ionicons name="arrow-back" size={24} color="#333" paddingRight={10} />
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
                <View style={styles.amountRow}>
                    <Text style={[
                        styles.amountText,
                        isOutgoing ? styles.sentAmountText : styles.receivedAmountText
                    ]}>
                        ₹{item.amount.toFixed(2)}
                    </Text>
                    <View style={[
                        styles.statusBadge,
                        isOutgoing ? styles.sentStatusBadge : styles.receivedStatusBadge
                    ]}>
                        <Text style={styles.statusText}>
                            {isOutgoing ? 'Paid' : 'Received'}
                        </Text>
                    </View>
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
            }).reverse();

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
                ? `Settle up payment for ${route.params.groupName || 'split'} group`
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
        backgroundColor: '#f8f9fa',
    },
    contactHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginRight: 10,
    },
    contactImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    contactImagePlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactInitial: {
        fontSize: 18,
        color: '#666',
    },
    contactInfo: {
        marginLeft: 10,
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
    },
    contactPhone: {
        fontSize: 14,
        color: '#666',
    },
    messageContainer: {
        width: '100%',
        paddingHorizontal: 12,
        marginVertical: 2,
    },
    sentContainer: {
        alignItems: 'flex-end',
    },
    receivedContainer: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '75%',
        padding: 10,
        borderRadius: 16,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 1,
    },
    sentBubble: {
        backgroundColor: '#E8F5E9',
        borderTopRightRadius: 4,
    },
    receivedBubble: {
        backgroundColor: '#E3F2FD',
        borderTopLeftRadius: 4,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    amountText: {
        fontSize: 18,
        fontWeight: '600',
    },
    sentAmountText: {
        color: '#2E7D32',
    },
    receivedAmountText: {
        color: '#1565C0',
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    sentStatusBadge: {
        backgroundColor: '#C8E6C9',
    },
    receivedStatusBadge: {
        backgroundColor: '#BBDEFB',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '500',
    },
    categoryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryText: {
        fontSize: 12,
        marginLeft: 3,
    },
    sentCategoryText: {
        color: '#2E7D32',
    },
    receivedCategoryText: {
        color: '#1565C0',
    },
    descriptionText: {
        fontSize: 13,
        marginBottom: 4,
        lineHeight: 16,
    },
    sentDescriptionText: {
        color: '#1B5E20',
    },
    receivedDescriptionText: {
        color: '#0D47A1',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 2,
    },
    timeText: {
        fontSize: 10,
        color: '#757575',
        marginRight: 3,
    },
    dateText: {
        fontSize: 10,
        color: '#757575',
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        padding: 6,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    sentLinkButton: {
        backgroundColor: '#C8E6C9',
    },
    receivedLinkButton: {
        backgroundColor: '#BBDEFB',
    },
    linkText: {
        marginLeft: 3,
        fontSize: 11,
        fontWeight: '500',
    },
    sentLinkText: {
        color: '#2E7D32',
    },
    receivedLinkText: {
        color: '#1565C0',
    },
    actioncontainer: {
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amountInput: {
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 10,
        marginRight: 10,
    },
    actionButton: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    payButton: {
        backgroundColor: '#4CAF50',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    listContainer: {
        flexGrow: 1,
        paddingBottom: 20,
        paddingHorizontal: 15,
        paddingTop: 12,
    },
    emptyStateText: {
        textAlign: 'center',
        marginTop: 40,
        color: '#6c757d',
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#dc3545',
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#28a745',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default TransactionChatScreen;