import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import axios from 'axios';
import Colors from '../../constants/Colors';

import { API_BASE_URL } from '../../api';

const Profile = () => {
    const [userData, setUserData] = useState(null);
    const [userProfileImage, setUserProfileImage] = useState(null);
    const [groupsCount, setGroupsCount] = useState(0);
    const [currentBalance, setCurrentBalance] = useState(0);
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    useEffect(() => {
        fetchUserData();
    }, []);

    // Function to get user's profile image from contacts
    const getUserProfileImage = async () => {
        try {
            if (!userData?.phoneNumber) return null;

            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') return null;

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
            });

            // Normalize user's phone number
            const userDigits = userData.phoneNumber.replace(/\D/g, "");
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

    const fetchUserData = async () => {
        try {
            const storedUserData = await AsyncStorage.getItem('userData');
            if (storedUserData) {
                const user = JSON.parse(storedUserData);
                setUserData(user);
                // Fetch groups count and balance when user data is available
                await Promise.all([
                    fetchGroupsCount(user),
                    fetchCurrentBalance(user)
                ]);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    // Fetch groups count for the user
    const fetchGroupsCount = async (user) => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/groups/${user._id}`,
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            if (response.data.success && Array.isArray(response.data.groups)) {
                setGroupsCount(response.data.groups.length);
            } else {
                setGroupsCount(0);
            }
        } catch (error) {
            console.error('Error fetching groups count:', error);
            setGroupsCount(0);
        }
    };

    // Fetch current balance from primary account
    const fetchCurrentBalance = async (user) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/bankaccounts/get-bank-accounts/${user._id}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await response.json();
            if (data.success && data.data) {
                // Find primary account
                const primaryAccount = data.data.find(acc => acc.isPrimary);
                if (primaryAccount) {
                    setCurrentBalance(parseFloat(primaryAccount.currentBalance) || 0);
                } else {
                    setCurrentBalance(0);
                }
            } else {
                setCurrentBalance(0);
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
            setCurrentBalance(0);
        }
    };

    // Fetch user's profile image when userData is available
    useEffect(() => {
        if (userData?.phoneNumber) {
            getUserProfileImage().then(imageUri => {
                if (imageUri) {
                    setUserProfileImage(imageUri);
                }
            });
        }
    }, [userData]);

    // Refresh profile image when component comes into focus
    useEffect(() => {
        if (isFocused && userData?.phoneNumber) {
            getUserProfileImage().then(imageUri => {
                if (imageUri) {
                    setUserProfileImage(imageUri);
                }
            });
        }
    }, [isFocused]);

    // Refresh groups count and balance when component comes into focus
    useEffect(() => {
        if (isFocused && userData) {
            Promise.all([
                fetchGroupsCount(userData),
                fetchCurrentBalance(userData)
            ]);
        }
    }, [isFocused, userData]);


    return (
        <SafeAreaView style={styles.safeContainer}>
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        <View style={styles.profileHeader}>
                            <View style={styles.profileImageContainer}>
                                {userProfileImage ? (
                                    <Image
                                        source={{ uri: userProfileImage }}
                                        style={styles.profileImage}
                                    />
                                ) : (
                                    <View style={styles.profileImagePlaceholder}>
                                        <Ionicons name="person" size={40} color={Colors.primary} />
                                    </View>
                                )}

                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>
                                    {userData?.firstName} {userData?.lastName}
                                </Text>
                                <Text style={styles.profilePhone}>
                                    {userData?.phoneNumber || '+91 0000000000'}
                                </Text>
                                <View style={styles.profileStats}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statNumber}>{groupsCount}</Text>
                                        <Text style={styles.statLabel}>Groups</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statItem}>
                                        <Text style={styles.statNumber}>
                                            {currentBalance >= 1000
                                                ? `₹${(currentBalance / 1000).toFixed(1)}K`
                                                : `₹${currentBalance.toFixed(0)}`
                                            }
                                        </Text>
                                        <Text style={styles.statLabel}>Balance</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.inviteButton} onPress={() => navigation.navigate('Groups')}>
                            <Ionicons name="people" size={20} color="#ffffff" style={styles.inviteIcon} />
                            <Text style={styles.inviteButtonText}>View Groups</Text>
                        </TouchableOpacity>
                    </View>


                    {/* Settings List */}
                    <View style={styles.settingsCard}>
                        <Text style={styles.settingsTitle}>Account Settings</Text>
                        {/* <ProfileListItem
                            icon={<Feather name="credit-card" size={22} color={Colors.primary} />}
                            label="Payment Methods"
                            subtitle="Manage your cards and wallets"
                            onPress={() => navigation.navigate('Payment')}
                        /> */}
                        <ProfileListItem
                            icon={<MaterialIcons name="account-balance" size={22} color={Colors.primary} />}
                            label="Bank Accounts"
                            subtitle="Link and manage bank accounts"
                            onPress={() => navigation.navigate('BankAccount')}
                        />
                        {/* <ProfileListItem
                            icon={<Feather name="shield" size={22} color={Colors.primary} />}
                            label="Privacy & Security"
                            subtitle="Control your privacy settings"
                            onPress={() => navigation.navigate('UserGuide')}
                        /> */}
                        <ProfileListItem
                            icon={<Ionicons name="shield-checkmark-outline" size={24} color="#8b5cf6" />}
                            label="App Permissions"
                            subtitle="Camera, Contacts, Storage & more"
                            onPress={() => navigation.navigate('permission')}
                            isLast
                        />
                        <ProfileListItem
                            icon={<Ionicons name="help-circle-outline" size={22} color={Colors.primary} />}
                            label="Help & Support"
                            subtitle="Get help and contact support"
                            onPress={() => navigation.navigate('Help')}
                            isLast
                        />
                    </View>

                    {/* Quick Actions */}
                    {/* <View style={styles.quickActionsCard}>
                        <Text style={styles.settingsTitle}>Quick Actions</Text>
                        <View style={styles.quickActionsGrid}>
                            <TouchableOpacity style={styles.quickActionItem}>
                                <View style={styles.quickActionIcon}>
                                    <Ionicons name="analytics" size={24} color={Colors.primary} />
                                </View>
                                <Text style={styles.quickActionLabel}>Analytics</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickActionItem}>
                                <View style={styles.quickActionIcon}>
                                    <Ionicons name="receipt" size={24} color={Colors.primary} />
                                </View>
                                <Text style={styles.quickActionLabel}>Reports</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickActionItem}>
                                <View style={styles.quickActionIcon}>
                                    <Ionicons name="settings" size={24} color={Colors.primary} />
                                </View>
                                <Text style={styles.quickActionLabel}>Settings</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickActionItem}>
                                <View style={styles.quickActionIcon}>
                                    <Ionicons name="notifications" size={24} color={Colors.primary} />
                                </View>
                                <Text style={styles.quickActionLabel}>Alerts</Text>
                            </TouchableOpacity>
                        </View>
                    </View> */}

                    {/* Log Out Button */}
                    <TouchableOpacity style={styles.logoutBtn} onPress={() => {
                        AsyncStorage.clear();
                        navigation.navigate('Login');
                    }}>
                        <Ionicons name="log-out" size={20} color="#ef4444" style={styles.logoutIcon} />
                        <Text style={styles.logoutBtnText}>Log Out</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Floating Action Button */}
                {/* <TouchableOpacity style={styles.fab}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
                </TouchableOpacity> */}
            </View>
        </SafeAreaView>
    );
};

const ProfileListItem = ({ icon, label, subtitle, isLast, onPress }) => (
    <TouchableOpacity style={[styles.listItem, isLast && { borderBottomWidth: 0 }]} onPress={onPress}>
        <View style={styles.listItemIcon}>
            {icon}
        </View>
        <View style={styles.listItemContent}>
            <Text style={styles.listLabel}>{label}</Text>
            {subtitle && <Text style={styles.listSubtitle}>{subtitle}</Text>}
        </View>
        <Feather name="chevron-right" size={20} color="#bbb" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: '#f7fafd',
    },
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
        paddingTop: '10%',
    },
    scrollContent: {
        paddingBottom: 120,
        paddingTop: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 24,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    profileSection: {
        paddingVertical: 24,
        paddingHorizontal: 24,
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 20,
        marginBottom: 20,
        borderRadius: 20,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderTopWidth: 4,
        borderTopColor: Colors.primary,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 16,
    },
    profileStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#e2e8f0',
        marginHorizontal: 12,
    },
    profileStatusBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    profileImageContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 3,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    profileImagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center',
    },
    profilePhone: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 0,
        textAlign: 'center',
        fontWeight: '400',
    },
    inviteButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 25,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inviteIcon: {
        marginRight: 8,
    },
    inviteButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    settingsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    quickActionsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 20,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    settingsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 16,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    quickActionItem: {
        width: '48%',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f0ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickActionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'center',
    },
    userName: {
        fontWeight: 'bold',
        fontSize: 18,
        color: '#0f172a',
    },
    userEmail: {
        color: '#64748b',
        fontSize: 14,
        marginTop: 2,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderColor: '#f1f5f9',
    },
    listItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f0ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    listItemContent: {
        flex: 1,
    },
    listLabel: {
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '600',
        marginBottom: 2,
    },
    listSubtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '400',
    },
    fab: {
        position: 'absolute',
        right: 24,
        bottom: 32,
        backgroundColor: Colors.primary,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    logoutBtn: {
        backgroundColor: '#fff',
        borderColor: '#ef4444',
        borderWidth: 1.5,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 20,
        marginHorizontal: 16,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    logoutIcon: {
        marginRight: 8,
    },
    logoutBtnText: {
        color: '#ef4444',
        fontWeight: '600',
        fontSize: 16,
    },
});

export default Profile; 