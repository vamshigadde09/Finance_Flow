import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, StatusBar, RefreshControl, Image, Alert, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import axios from 'axios';
import ViewTrans from './VIew_Trans/viewTrans';

import { API_BASE_URL } from '../../../api';
const { width } = Dimensions.get('window');
const itemSize = 70; // Fixed size for contact cards

const Dashboard = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const [userName, setUserName] = useState('User');
    const [userPhoneNumber, setUserPhoneNumber] = useState('');
    const [userProfileImage, setUserProfileImage] = useState(null);

    // Function to get time-based greeting
    const getTimeOfDay = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Morning';
        if (hour < 17) return 'Afternoon';
        return 'Evening';
    };

    // Function to get user's profile image from contacts
    const getUserProfileImage = async () => {
        try {
            if (!userPhoneNumber) return null;

            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') return null;

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
            });

            // Normalize user's phone number
            const userDigits = userPhoneNumber.replace(/\D/g, "");
            const userLast10 = userDigits.slice(-10);

            // Find matching contact
            const matchingContact = data.find(contact => {
                if (!contact.phoneNumbers?.[0]?.number) return false;
                const contactDigits = contact.phoneNumbers[0].number.replace(/\D/g, "");
                const contactLast10 = contactDigits.slice(-10);
                return contactLast10 === userLast10;
            });

            return matchingContact?.image?.uri || null;
        } catch (error) {
            console.error('Error getting user profile image:', error);
            return null;
        }
    };
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [primaryAccount, setPrimaryAccount] = useState(null);
    const [dashboardAccounts, setDashboardAccounts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [registeredContacts, setRegisteredContacts] = useState([]);
    const [isLoadingContacts, setIsLoadingContacts] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [weeklySpending, setWeeklySpending] = useState([0, 0, 0, 0, 0, 0, 0]); // Mon-Sun
    const [transactionsLoading, setTransactionsLoading] = useState(true);
    const [selectedBarIdx, setSelectedBarIdx] = useState(null);
    const [thisMonthIncome, setThisMonthIncome] = useState(0);
    const [thisMonthExpenses, setThisMonthExpenses] = useState(0);
    const [activeGroupsCount, setActiveGroupsCount] = useState(0);
    const [tappedContacts, setTappedContacts] = useState(new Set());
    const [lastSeenTransactions, setLastSeenTransactions] = useState({});

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

        if (loading || isLoadingContacts || transactionsLoading) {
            animateSkeleton();
        } else {
            skeletonOpacity.setValue(0.3);
        }

        return () => {
            skeletonOpacity.stopAnimation();
        };
    }, [loading, isLoadingContacts, transactionsLoading, skeletonOpacity]);

    const fetchRegisteredUsers = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                console.log("No user data found, redirecting to login");
                navigation.navigate("Login");
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
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
            });

            const filteredContacts = data.filter((contact) => {
                if (!contact.phoneNumbers?.[0]?.number) return false;
                const digits = contact.phoneNumbers[0].number.replace(/\D/g, "");
                const last10 = digits.slice(-10);
                const normalizedNumber = `+91${last10}`;
                return registeredNumbers.includes(normalizedNumber);
            });

            // Fetch transaction history for each contact
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                navigation.navigate("Login");
                return;
            }
            const user = JSON.parse(userData);

            // Get transaction history for each contact
            const contactsWithTransactions = await Promise.all(
                filteredContacts.map(async (contact) => {
                    const contactNumber = contact.phoneNumbers[0].number;
                    const digits = contactNumber.replace(/\D/g, "");
                    const last10 = digits.slice(-10);
                    const normalizedNumber = last10;

                    try {
                        const response = await axios.get(
                            `${API_BASE_URL}/api/v1/contact/personal-contact`,
                            {
                                headers: { Authorization: `Bearer ${user.token}` },
                                params: {
                                    contactNumber: normalizedNumber,
                                    isContactTransaction: true
                                }
                            }
                        );

                        const transactions = response.data.transactions || [];
                        const lastTransaction = transactions.length > 0 ? transactions[0] : null;

                        // Get the last seen transaction timestamp for this contact
                        const contactId = normalizedNumber;
                        const lastSeenTimestamp = lastSeenTransactions[contactId];

                        // Filter only incoming transactions (transactions where you are the receiver)
                        const incomingTransactions = transactions.filter(t => {
                            // Check if this is an incoming transaction
                            // Look for transactions where you are the receiver
                            return t.transactionType === 'received' ||
                                t.transactionType === 'income' ||
                                (t.receiver && t.receiver === user._id) ||
                                (t.to && t.to === user._id) ||
                                (t.receiverId && t.receiverId === user._id) ||
                                (t.recipientId && t.recipientId === user._id);
                        });

                        // Count new incoming transactions (transactions after the last seen timestamp)
                        const newTransactionCount = lastSeenTimestamp
                            ? incomingTransactions.filter(t => new Date(t.createdAt) > new Date(lastSeenTimestamp)).length
                            : incomingTransactions.length;

                        return {
                            ...contact,
                            lastTransactionDate: lastTransaction ? new Date(lastTransaction.createdAt).toISOString() : new Date(0).toISOString(),
                            transactionCount: incomingTransactions.length,
                            newTransactionCount: newTransactionCount
                        };
                    } catch (error) {
                        console.error(`Error fetching transactions for ${contact.firstName}:`, error);
                        return {
                            ...contact,
                            lastTransactionDate: new Date(0).toISOString(),
                            transactionCount: 0,
                            newTransactionCount: 0
                        };
                    }
                })
            );

            // Sort contacts by last transaction date and transaction count
            const sortedContacts = contactsWithTransactions.sort((a, b) => {
                // First sort by transaction count
                if (b.transactionCount !== a.transactionCount) {
                    return b.transactionCount - a.transactionCount;
                }
                // Then sort by last transaction date
                return new Date(b.lastTransactionDate) - new Date(a.lastTransactionDate);
            });

            // Always show first 7 contacts and add More button
            const displayContacts = sortedContacts.slice(0, 7);
            displayContacts.push({ isMoreButton: true });

            setContacts(displayContacts);
        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            setIsLoadingContacts(false);
        }
    };

    const isContactRegistered = (contact, registeredNumbers) => {
        if (!contact.phoneNumbers?.[0]?.number) return false;

        const digits = contact.phoneNumbers[0].number.replace(/\D/g, "");
        const last10 = digits.slice(-10);
        const normalizedNumber = `+91${last10}`;

        return registeredNumbers.includes(normalizedNumber);
    };

    const handleContactPress = (contact, index) => {
        // Mark this contact as tapped
        const contactId = contact.phoneNumbers?.[0]?.number || `contact-${index}`;
        setTappedContacts(prev => new Set([...prev, contactId]));

        // Mark the latest transaction as seen
        if (contact.transactionCount > 0) {
            const normalizedNumber = contactId.replace(/\D/g, "").slice(-10);
            const currentTime = new Date().toISOString();
            setLastSeenTransactions(prev => ({
                ...prev,
                [normalizedNumber]: currentTime
            }));
        }

        // Navigate to contact chat
        navigation.navigate("ContactTransactionChat", { contact });
    };

    const renderContactItem = (contact, index) => {

        if (contact.isMoreButton) {
            return (
                <TouchableOpacity
                    key={`more-${index}`}
                    onPress={() => navigation.navigate("AllContacts")}
                    style={styles.contactCard}
                    activeOpacity={0.7}
                >
                    <View style={styles.contactCardInner}>
                        <View style={styles.moreButtonContainer}>
                            <View style={styles.moreButtonIcon}>
                                <Ionicons name="add" size={24} color="#8b5cf6" />
                            </View>
                            <Text style={styles.moreButtonText}>More</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }

        const contactId = contact.phoneNumbers?.[0]?.number || `contact-${index}`;
        const isTapped = tappedContacts.has(contactId);
        const shouldShowBadge = (contact.newTransactionCount || 0) > 0 && !isTapped;

        return (
            <TouchableOpacity
                key={index}
                style={styles.contactCard}
                onPress={() => handleContactPress(contact, index)}
                activeOpacity={0.7}
            >
                <View style={styles.contactCardInner}>
                    {contact.imageAvailable && contact.image ? (
                        <Image
                            source={{ uri: contact.image.uri, width: 120, height: 120 }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {contact.firstName
                                    ? contact.firstName.charAt(0).toUpperCase()
                                    : "?"}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.contactName} numberOfLines={1}>
                        {contact.firstName || "Unnamed"}
                    </Text>
                    {shouldShowBadge && (
                        <View style={styles.transactionBadge}>
                            <Text style={styles.transactionBadgeText}>{contact.newTransactionCount}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const userData = await AsyncStorage.getItem('userData');
            const token = await AsyncStorage.getItem('token');
            if (userData && token) {
                const user = JSON.parse(userData);
                setUserName(user.firstName ? user.firstName : 'User');
                setUserPhoneNumber(user.phoneNumber || '');
                setUserProfileImage(user.profileImage || null);
                const userId = user._id;
                const response = await fetch(`${API_BASE_URL}/api/v1/bankaccounts/get-bank-accounts/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success && data.data) {
                    setAccounts(data.data);
                    // Find primary account
                    const primary = data.data.find(acc => acc.isPrimary);
                    setPrimaryAccount(primary || null);
                    // Find all accounts to show in dashboard
                    setDashboardAccounts(data.data);
                } else {
                    setAccounts([]);
                    setPrimaryAccount(null);
                    setDashboardAccounts([]);
                }
            }
        } catch (err) {
            setAccounts([]);
            setPrimaryAccount(null);
            setDashboardAccounts([]);
        }
        setLoading(false);
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchData().finally(() => setRefreshing(false));
    }, []);

    useEffect(() => {
        const loadContacts = async () => {
            const registeredNumbers = await fetchRegisteredUsers();
            await fetchAndFilterContacts(registeredNumbers);
        };
        loadContacts();
    }, []);

    useEffect(() => {
        if (isFocused) {
            fetchData();
            // Reset tapped contacts when returning to dashboard
            setTappedContacts(new Set());
            // Refresh profile image when coming back to dashboard
            if (userPhoneNumber) {
                getUserProfileImage().then(imageUri => {
                    if (imageUri) {
                        setUserProfileImage(imageUri);
                    }
                });
            }
        }
    }, [isFocused]);

    // Fetch user's profile image when phone number is available or when component comes into focus
    useEffect(() => {
        if (userPhoneNumber) {
            getUserProfileImage().then(imageUri => {
                if (imageUri) {
                    setUserProfileImage(imageUri);
                }
            });
        }
    }, [userPhoneNumber, isFocused]);

    // Fetch groups count for KPI
    const fetchGroupsCount = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) return;
            const user = JSON.parse(userData);
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/groups/${user._id}`,
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            const count = Array.isArray(response.data?.groups) ? response.data.groups.length : 0;
            setActiveGroupsCount(count);
        } catch (e) {
            setActiveGroupsCount(0);
        }
    };

    useEffect(() => {
        fetchGroupsCount();
    }, [isFocused]);

    // Helper to pad contacts to 4 per row
    const padRow = (row) => {
        const padded = [...row];
        while (padded.length < 4) {
            padded.push({ isPlaceholder: true });
        }
        return padded;
    };

    // Fetch all transactions for the current user
    const fetchTransactionsForSpending = async () => {
        setTransactionsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/personal/get-all-transactions`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const txns = response.data.transactions || [];
            setTransactions(txns);
            // Compute this month's totals
            const nowMonth = new Date();
            const startOfMonth = new Date(nowMonth.getFullYear(), nowMonth.getMonth(), 1, 0, 0, 0, 0);
            const endOfMonth = new Date(nowMonth.getFullYear(), nowMonth.getMonth() + 1, 0, 23, 59, 59, 999);
            let monthIncome = 0;
            let monthExpense = 0;
            txns.forEach(t => {
                const d = new Date(t.createdAt);
                if (d >= startOfMonth && d <= endOfMonth) {
                    if (t.transactionType === 'income') monthIncome += Math.abs(t.amount || 0);
                    if (t.transactionType === 'expense') monthExpense += Math.abs(t.amount || 0);
                }
            });
            setThisMonthIncome(monthIncome);
            setThisMonthExpenses(monthExpense);
            // Process for weekly spending (this week only)
            const week = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
            const now = new Date();
            // Find Monday of this week
            const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
            const monday = new Date(now);
            monday.setDate(now.getDate() - dayOfWeek);
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            txns.forEach(t => {
                if (t.transactionType === 'expense') {
                    const d = new Date(t.createdAt);
                    if (d >= monday && d <= sunday) {
                        let dayIdx = d.getDay();
                        dayIdx = (dayIdx + 6) % 7; // Mon=0, ..., Sun=6
                        week[dayIdx] += Math.abs(t.amount);
                    }
                }
            });
            setWeeklySpending(week);
        } catch (e) {
            setTransactions([]);
            setWeeklySpending([0, 0, 0, 0, 0, 0, 0]);
            setThisMonthIncome(0);
            setThisMonthExpenses(0);
        }
        setTransactionsLoading(false);
    };

    useEffect(() => {
        fetchTransactionsForSpending();
    }, []);

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

    const SkeletonPrimaryCard = () => (
        <View style={styles.primaryCard}>
            <SkeletonBox width="60%" height={16} style={{ marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <SkeletonBox width="80%" height={32} style={{ marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <View style={styles.rowBetween}>
                <View style={styles.arrowBoxContainer}>
                    <View style={styles.arrowBoxRow}>
                        <SkeletonBox width={28} height={28} style={{ borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 6 }} />
                        <View style={styles.arrowBoxTextCol}>
                            <SkeletonBox width="60%" height={12} style={{ backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 4 }} />
                            <SkeletonBox width="80%" height={16} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                        </View>
                    </View>
                </View>
                <View style={styles.arrowBoxContainer}>
                    <View style={styles.arrowBoxRow}>
                        <SkeletonBox width={28} height={28} style={{ borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 6 }} />
                        <View style={styles.arrowBoxTextCol}>
                            <SkeletonBox width="60%" height={12} style={{ backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 4 }} />
                            <SkeletonBox width="80%" height={16} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    const SkeletonSpendingCard = () => (
        <View style={styles.spendingCard}>
            <View style={styles.spendingHeader}>
                <View style={styles.spendingTitleRow}>
                    <SkeletonBox width={4} height={24} style={{ borderRadius: 2, marginRight: 12, backgroundColor: '#E1E9EE' }} />
                    <SkeletonBox width="50%" height={18} style={{ backgroundColor: '#E1E9EE' }} />
                </View>
                <View style={styles.spendingSummary}>
                    {[1, 2, 3].map((_, idx) => (
                        <View key={idx} style={styles.summaryItem}>
                            <SkeletonBox width="60%" height={12} style={{ backgroundColor: '#E1E9EE', marginBottom: 4 }} />
                            <SkeletonBox width="80%" height={16} style={{ backgroundColor: '#E1E9EE' }} />
                        </View>
                    ))}
                </View>
            </View>
            <SkeletonBox width="100%" height={1} style={{ backgroundColor: '#E1E9EE', marginBottom: 20 }} />
            <View style={styles.barChartContainer}>
                {[1, 2, 3, 4, 5, 6, 7].map((_, idx) => (
                    <View key={idx} style={styles.barColumn}>
                        <SkeletonBox
                            width={28}
                            height={Math.random() * 80 + 40}
                            style={{
                                backgroundColor: '#E1E9EE',
                                borderRadius: 12,
                                marginBottom: 8
                            }}
                        />
                        <SkeletonBox width="60%" height={12} style={{ backgroundColor: '#E1E9EE', marginBottom: 2 }} />
                        <SkeletonBox width="40%" height={10} style={{ backgroundColor: '#E1E9EE' }} />
                    </View>
                ))}
            </View>
        </View>
    );

    const SkeletonContactCard = () => (
        <View style={styles.contactCard}>
            <View style={styles.contactCardInner}>
                <SkeletonBox width={60} height={60} style={{ borderRadius: 30, marginBottom: 8, backgroundColor: '#E1E9EE' }} />
                <SkeletonBox width="80%" height={12} style={{ backgroundColor: '#E1E9EE', marginBottom: 4 }} />
                <SkeletonBox width="40%" height={8} style={{ backgroundColor: '#E1E9EE' }} />
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 30 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#8b5cf6']}
                        tintColor="#8b5cf6"
                    />
                }
            >
                <View style={styles.welcomeSection}>
                    <View style={styles.welcomeHeader}>
                        <View style={styles.welcomeLeft}>
                            <View style={styles.profileAvatar}>
                                {userProfileImage ? (
                                    <Image
                                        source={{ uri: userProfileImage }}
                                        style={styles.profileImage}
                                    />
                                ) : (
                                    <Text style={styles.profileInitial}>{userName.charAt(0).toUpperCase()}</Text>
                                )}
                            </View>
                            <View style={styles.welcomeText}>
                                <Text style={styles.welcomeGreeting}>Good {getTimeOfDay()}</Text>
                                <Text style={styles.welcomeName}>Welcome back, {userName}</Text>
                            </View>
                        </View>
                        {/* <View style={styles.welcomeActions}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="notifications-outline" size={20} color="#64748b" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="search-outline" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View> */}
                    </View>
                    <View style={styles.welcomeDivider} />
                </View>
                {/* Primary Account Card */}
                {loading ? (
                    <SkeletonPrimaryCard />
                ) : primaryAccount ? (
                    <View style={styles.primaryCard}>
                        <View style={styles.primaryDecorCircleLg} />
                        <View style={styles.primaryDecorCircleSm} />
                        <Text style={styles.primaryLabel}>Current Balance</Text>
                        <Text style={styles.primaryBalance}>₹{parseFloat(primaryAccount.currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        <View style={styles.chipsRow}>
                            <View style={[styles.chip, styles.chipIncome]}>
                                <Ionicons name="arrow-down" size={14} color="#0a7d4f" />
                                <Text style={[styles.chipText, { color: '#0a7d4f' }]}>Income</Text>
                                <Text style={[styles.chipAmount, { color: '#0a7d4f' }]}>₹{parseFloat(primaryAccount.limitAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>
                            </View>
                            <View style={[styles.chip, styles.chipExpense]}>
                                <Ionicons name="arrow-up" size={14} color="#6c3cc6" />
                                <Text style={[styles.chipText, { color: '#6c3cc6' }]}>Expenses</Text>
                                <Text style={[styles.chipAmount, { color: '#6c3cc6' }]}>₹{parseFloat(primaryAccount.personalLimitAmount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.primaryCard}>
                        <View style={styles.primaryDecorCircleLg} />
                        <View style={styles.primaryDecorCircleSm} />
                        <Text style={styles.primaryLabel}>Current Balance</Text>
                        <Text style={styles.primaryBalance}>₹00.00</Text>
                        <View style={styles.chipsRow}>
                            <View style={[styles.chip, styles.chipIncome]}>
                                <Ionicons name="arrow-down" size={14} color="#0a7d4f" />
                                <Text style={[styles.chipText, { color: '#0a7d4f' }]}>Income</Text>
                                <Text style={[styles.chipAmount, { color: '#0a7d4f' }]}>₹0</Text>
                            </View>
                            <View style={[styles.chip, styles.chipExpense]}>
                                <Ionicons name="arrow-up" size={14} color="#6c3cc6" />
                                <Text style={[styles.chipText, { color: '#6c3cc6' }]}>Expenses</Text>
                                <Text style={[styles.chipAmount, { color: '#6c3cc6' }]}>₹0</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.addBankButton}
                            onPress={() => navigation.navigate('Profile', { screen: 'BankAccount' })}
                        >
                            <Ionicons name="add-circle" size={20} color="#8b5cf6" />
                            <Text style={styles.addBankButtonText}>Add Bank Account</Text>
                        </TouchableOpacity>
                    </View>
                )}


                {/* <ViewTrans /> */}
                {/* KPI Stat Cards */}
                <View style={styles.kpiRow}>
                    <View style={[styles.kpiCard, { borderLeftColor: '#16a34a', borderLeftWidth: 2 }]}>
                        <View style={[styles.kpiIconCircle, { backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="trending-up" size={16} color="#16a34a" />
                        </View>
                        <Text style={styles.kpiTitle}>This Month Income</Text>
                        <Text style={styles.kpiValue}>₹{thisMonthIncome.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>
                    </View>
                    <View style={[styles.kpiCard, { borderLeftColor: '#7c3aed', borderLeftWidth: 2 }]}>
                        <View style={[styles.kpiIconCircle, { backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="trending-down" size={16} color="#7c3aed" />
                        </View>
                        <Text style={styles.kpiTitle}>This Month Expenses</Text>
                        <Text style={styles.kpiValue}>₹{thisMonthExpenses.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>
                    </View>
                    <View style={[styles.kpiCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 2 }]}>
                        <View style={[styles.kpiIconCircle, { backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="people" size={16} color="#3b82f6" />
                        </View>
                        <Text style={styles.kpiTitle}>Groups Active</Text>
                        <Text style={styles.kpiValue}>{activeGroupsCount.toLocaleString('en-IN')}</Text>
                    </View>
                </View>


                <ViewTrans />

                {/* Enhanced Spending Overview */}
                {transactionsLoading ? (
                    <SkeletonSpendingCard />
                ) : (
                    <View style={styles.spendingCard}>
                        <View style={styles.spendingHeader}>
                            <View style={styles.spendingTitleRow}>
                                <View style={styles.spendingAccent} />
                                <Text style={styles.spendingTitle}>Weekly Spending Overview</Text>
                            </View>
                            <View style={styles.spendingSummary}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>This Week</Text>
                                    <Text style={styles.summaryValue}>₹{weeklySpending.reduce((a, b) => a + b, 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Daily Avg</Text>
                                    <Text style={styles.summaryValue}>₹{Math.round(weeklySpending.reduce((a, b) => a + b, 0) / 7).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Highest Day</Text>
                                    <Text style={styles.summaryValue}>₹{Math.max(...weeklySpending).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.spendingDivider} />
                        <View style={styles.barChartContainer}>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                                const max = Math.max(...weeklySpending, 1);
                                const barHeight = Math.round((weeklySpending[idx] / max) * 120);
                                const isSelected = selectedBarIdx === idx;
                                const displayHeight = Math.max(barHeight, 8); // Minimum height for visibility
                                const displayWidth = isSelected ? 36 : 28;
                                const isToday = new Date().getDay() === (idx + 1) % 7;

                                // Calculate the date for this weekday in the current week
                                const now = new Date();
                                const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
                                const monday = new Date(now);
                                monday.setDate(now.getDate() - dayOfWeek);
                                monday.setHours(0, 0, 0, 0);
                                const thisDate = new Date(monday);
                                thisDate.setDate(monday.getDate() + idx);
                                const dateStr = thisDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                                return (
                                    <View key={day} style={styles.barColumn}>
                                        {/* Tooltip */}
                                        {isSelected && (
                                            <View style={styles.barTooltip}>
                                                <Text style={styles.barTooltipDay}>{day}, {dateStr}</Text>
                                                <Text style={styles.barTooltipAmount}>₹{weeklySpending[idx].toLocaleString('en-IN', { minimumFractionDigits: 0 })}</Text>
                                            </View>
                                        )}
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => setSelectedBarIdx(isSelected ? null : idx)}
                                            style={styles.barTouchable}
                                        >
                                            <View style={[
                                                styles.bar,
                                                {
                                                    width: displayWidth,
                                                    height: displayHeight,
                                                    backgroundColor: isSelected
                                                        ? '#7c3aed'
                                                        : isToday
                                                            ? '#8b5cf6'
                                                            : weeklySpending[idx] > 0
                                                                ? '#a855f7'
                                                                : '#e5e7eb',
                                                    shadowColor: isSelected ? '#8b5cf6' : '#8b5cf6',
                                                }
                                            ]} />
                                        </TouchableOpacity>
                                        <Text style={[
                                            styles.barLabel,
                                            { color: isToday ? '#7c3aed' : '#6b7280' }
                                        ]}>
                                            {day}
                                        </Text>
                                        {weeklySpending[idx] > 0 && (
                                            <Text style={styles.barAmount}>
                                                ₹{weeklySpending[idx] > 1000 ? `${(weeklySpending[idx] / 1000).toFixed(1)}k` : weeklySpending[idx].toFixed(0)}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Enhanced Quick Contacts Section */}
                <View style={styles.contactsCard}>
                    <View style={styles.contactsHeader}>
                        <View style={styles.contactsTitleRow}>
                            <View style={styles.contactsAccent} />
                            <Text style={styles.contactsTitle}>Quick Contacts</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.viewAllButton}
                            onPress={() => navigation.navigate("AllContacts")}
                        >
                            <Text style={styles.viewAllText}>View All</Text>
                            <Ionicons name="chevron-forward" size={16} color="#7c3aed" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.contactsDivider} />
                    {isLoadingContacts ? (
                        <View style={styles.contactsContainer}>
                            {[0, 1].map(rowIdx => (
                                <View style={styles.contactsRow} key={rowIdx}>
                                    {[1, 2, 3, 4].map((_, idx) => (
                                        <SkeletonContactCard key={`skeleton-${rowIdx}-${idx}`} />
                                    ))}
                                </View>
                            ))}
                        </View>
                    ) : contacts.length > 0 ? (
                        <View style={styles.contactsContainer}>
                            {[0, 1].map(rowIdx => (
                                <View style={styles.contactsRow} key={rowIdx}>
                                    {padRow(contacts.slice(rowIdx * 4, rowIdx * 4 + 4)).map((contact, idx) =>
                                        contact.isPlaceholder ? (
                                            <View key={`placeholder-${idx}`} style={[styles.contactCard, { opacity: 0 }]} />
                                        ) : (
                                            renderContactItem(contact, rowIdx * 4 + idx)
                                        )
                                    )}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.noContactsContainer}>
                            <View style={styles.noContactsIcon}>
                                <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                            </View>
                            <Text style={styles.noContactsText}>No contacts found</Text>
                            <Text style={styles.noContactsSubText}>Add contacts to start sending money</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
        paddingTop: '10%',
    },
    welcomeSection: {
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
    profileAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#8b5cf6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    profileInitial: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    profileImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    welcomeText: {
        flex: 1,
    },
    welcomeGreeting: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 2,
    },
    welcomeName: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    welcomeActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    welcomeDivider: {
        height: 1,
        backgroundColor: '#1e293b',
        marginTop: 16,
        marginHorizontal: 0,
        opacity: 0.1,
    },
    primaryCard: {
        backgroundColor: '#3b82f6',
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: 8,
        padding: 18,
        shadowColor: '#3b82f6',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryDecorCircleLg: {
        position: 'absolute',
        right: -30,
        top: -20,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    primaryDecorCircleSm: {
        position: 'absolute',
        right: 20,
        top: 30,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    primaryLabel: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    primaryBalance: {
        color: '#fff',
        fontSize: 30,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    chipsRow: {
        flexDirection: 'row',
        marginTop: 6,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginRight: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    chipIncome: {
        backgroundColor: 'rgba(243, 255, 247, 0.95)',
    },
    chipExpense: {
        backgroundColor: 'rgba(244, 238, 255, 0.95)',
    },
    chipText: {
        fontSize: 12,
        marginLeft: 6,
        marginRight: 6,
        fontWeight: '600',
    },
    chipAmount: {
        fontSize: 13,
        fontWeight: '700',
    },
    addBankButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    addBankButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingHorizontal: 0,
        alignItems: 'center',
        paddingVertical: 4,
    },
    arrowBoxContainer: {
        alignItems: 'center',
        flex: 1,
        paddingHorizontal: 8,
    },
    arrowSquare: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
    arrowBoxLabel: {
        color: '#fff',
        fontSize: 12,
        marginTop: 2,
    },
    arrowBoxValue: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        marginTop: 2,
    },
    arrowBoxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    arrowBoxTextCol: {
        marginLeft: 10,
        justifyContent: 'center',
    },
    dashboardCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    bankName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#222',
    },
    accountType: {
        fontSize: 12,
        color: '#888',
        marginTop: 1,
    },
    balance: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3b82f6',
        marginTop: 4,
    },
    contactsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: 18,
        padding: 24,
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.10,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e3e8ee',
    },
    contactsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    contactsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contactsAccent: {
        width: 4,
        height: 24,
        backgroundColor: '#7c3aed',
        borderRadius: 2,
        marginRight: 12,
    },
    contactsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f3e8ff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e9d5ff',
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#7c3aed',
        marginRight: 4,
    },
    contactsDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginBottom: 20,
    },
    contactsContainer: {
        paddingHorizontal: 0,
    },
    contactsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    contactCard: {
        alignItems: 'center',
        width: 70,
    },
    contactCardInner: {
        alignItems: 'center',
        width: '100%',
        position: 'relative',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
        resizeMode: 'cover',
        backgroundColor: '#f0f0f0',
        borderWidth: 2,
        borderColor: '#f1f5f9',
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#7c3aed",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#f1f5f9',
        shadowColor: '#7c3aed',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarText: {
        fontSize: 24,
        color: "#fff",
        fontWeight: "bold",
    },
    contactName: {
        fontSize: 12,
        textAlign: "center",
        maxWidth: 70,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 2,
    },
    transactionBadge: {
        position: 'absolute',
        top: -2,
        right: 8,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    transactionBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    moreButtonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f8fafc',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        marginBottom: 8,
    },
    moreButtonIcon: {
        marginBottom: 2,
    },
    moreButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#7c3aed',
    },
    noContactsContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noContactsIcon: {
        marginBottom: 16,
    },
    noContactsText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    noContactsSubText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    spendingCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginTop: 18,
        padding: 24,
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.10,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e3e8ee',
        minHeight: 320,
    },
    kpiRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginTop: 14,
    },
    kpiCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#eaeef3',
        alignItems: 'flex-start',
    },
    kpiIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e9eef6',
        marginBottom: 8,
    },
    kpiTitle: {
        fontSize: 11,
        color: '#6b7280',
        marginBottom: 2,
    },
    kpiValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        marginTop: 2,
    },
    kpiSubtext: {
        fontSize: 12,
        color: '#8a8f98',
        marginTop: 2,
    },

    spendingHeader: {
        marginBottom: 16,
    },
    spendingTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 0,
    },
    spendingTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    spendingAccent: {
        width: 4,
        height: 24,
        backgroundColor: '#7c3aed',
        borderRadius: 2,
        marginRight: 12,
    },
    spendingSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    spendingDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginBottom: 20,
    },
    barChartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 180,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    barColumn: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-end',
    },
    barTouchable: {
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 8,
    },
    bar: {
        borderRadius: 12,
        marginBottom: 4,
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    barLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
        marginBottom: 2,
    },
    barAmount: {
        fontSize: 10,
        color: '#6b7280',
        fontWeight: '500',
        textAlign: 'center',
    },
    barTooltip: {
        position: 'absolute',
        bottom: 110,
        left: '50%',
        transform: [{ translateX: -60 }],
        width: 120,
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        shadowColor: '#222',
        shadowOpacity: 0.13,
        shadowRadius: 8,
        elevation: 4,
        alignItems: 'center',
        zIndex: 10,
    },
    barTooltipDay: {
        fontWeight: 'bold',
        color: '#222',
        fontSize: 15,
        marginBottom: 2,
    },
    barTooltipAmount: {
        color: '#1b8be0',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default Dashboard;
