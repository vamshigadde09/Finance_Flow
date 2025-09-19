import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Animated, LayoutAnimation, Platform, UIManager, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import { API_BASE_URL } from '../../api';

// Skeleton Loading Components
const SkeletonBox = ({ width, height, style }) => {
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

        animateSkeleton();

        return () => {
            skeletonOpacity.stopAnimation();
        };
    }, [skeletonOpacity]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: Colors.skeleton,
                    borderRadius: 4,
                    opacity: skeletonOpacity,
                },
                style,
            ]}
        />
    );
};

const SummarySkeleton = () => (
    <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
                <SkeletonBox width={36} height={36} style={{ borderRadius: 18, marginRight: 10 }} />
                <View>
                    <SkeletonBox width={60} height={13} style={{ marginBottom: 4 }} />
                    <SkeletonBox width={80} height={18} />
                </View>
            </View>
            <View style={styles.summaryBox}>
                <SkeletonBox width={36} height={36} style={{ borderRadius: 18, marginRight: 10 }} />
                <View>
                    <SkeletonBox width={60} height={13} style={{ marginBottom: 4 }} />
                    <SkeletonBox width={80} height={18} />
                </View>
            </View>
        </View>
    </View>
);

const SearchSkeleton = () => (
    <View style={styles.searchContainer}>
        <View style={styles.searchInnerContainer}>
            <SkeletonBox width={20} height={20} style={{ marginRight: 6 }} />
            <SkeletonBox width="80%" height={20} />
        </View>
    </View>
);

const GroupCardSkeleton = () => (
    <View style={styles.groupCard}>
        <SkeletonBox width={40} height={40} style={{ borderRadius: 20, marginRight: 10 }} />
        <View style={{ flex: 1 }}>
            <SkeletonBox width="70%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonBox width="40%" height={12} style={{ marginBottom: 4 }} />
            <SkeletonBox width="50%" height={11} />
        </View>
        <SkeletonBox width={24} height={24} />
    </View>
);

const SplitGroups = () => {
    const navigation = useNavigation();
    const [search, setSearch] = useState('');
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState({ owe: 0, owed: 0 });
    const [showCreateText, setShowCreateText] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'youOwe', 'youreOwed'
    const [groupBalances, setGroupBalances] = useState({}); // Store balances for each group
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;


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
                setGroups(response.data.groups);
                calculateSummary();

                // Fetch balances for all groups
                const balances = {};
                for (const group of response.data.groups) {
                    try {
                        const balance = await checkGroupBalance(group._id);
                        balances[group._id] = balance;
                    } catch (error) {
                        console.error(`Error fetching balance for group ${group._id}:`, error);
                        balances[group._id] = { youOwe: 0, youreOwed: 0 };
                    }
                }
                setGroupBalances(balances);
            } else {
                setGroups([]);
                setError("No groups found");
            }
        } catch (error) {
            console.error("Error fetching groups:", {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

            if (error.response?.status === 401) {
                navigation.navigate("Login");
            } else {
                setError(error.response?.data?.message || "Failed to fetch groups");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const calculateSummary = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                throw new Error("User session expired");
            }

            const user = JSON.parse(userData);

            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/get-total-balances`,
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                }
            );


            if (response.data.success) {
                const newSummary = {
                    owe: parseFloat(response.data.totals.youOwe),
                    owed: parseFloat(response.data.totals.owedToYou)
                };
                setSummary(newSummary);
            }
        } catch (error) {
            console.error("Error calculating summary:", error);
            setSummary({ owe: 0, owed: 0 });
        }
    };

    // Function to check if user owes or is owed money in a specific group
    const checkGroupBalance = async (groupId) => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) return { youOwe: 0, youreOwed: 0 };

            const user = JSON.parse(userData);

            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/get-group-balances`,
                {
                    params: { groupId },
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                }
            );

            if (response.data.success && response.data.balances?.members) {
                const currentUserBalance = response.data.balances.members.find(
                    m => m.member._id === user._id
                );

                if (!currentUserBalance) return { youOwe: 0, youreOwed: 0 };

                // Calculate net amounts
                const netAmounts = {};

                // Add what others owe you
                Object.entries(currentUserBalance.owedBy || {}).forEach(([userId, amount]) => {
                    netAmounts[userId] = (netAmounts[userId] || 0) + amount;
                });

                // Subtract what you owe others
                Object.entries(currentUserBalance.owesTo || {}).forEach(([userId, amount]) => {
                    netAmounts[userId] = (netAmounts[userId] || 0) - amount;
                });

                // Calculate total you owe (negative net amounts)
                const totalYouOwe = Object.values(netAmounts)
                    .filter(amount => amount < 0)
                    .reduce((sum, amount) => sum + Math.abs(amount), 0);

                // Calculate total others owe you (positive net amounts)
                const totalOwesYou = Object.values(netAmounts)
                    .filter(amount => amount > 0)
                    .reduce((sum, amount) => sum + amount, 0);

                return { youOwe: totalYouOwe, youreOwed: totalOwesYou };
            }
        } catch (error) {
            console.error("Error checking group balance:", error);
        }
        return { youOwe: 0, youreOwed: 0 };
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchGroups();
    };

    useEffect(() => {
        fetchGroups();
        calculateSummary();
        const unsubscribe = navigation.addListener("focus", () => {
            fetchGroups();
            calculateSummary();
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        // Reset animations when component mounts
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
        rotateAnim.setValue(0);
        slideAnim.setValue(0);
        pulseAnim.setValue(1);
        setShowCreateText(true);

        // Start pulse animation immediately
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                })
            ])
        );
        pulseAnimation.start();

        // Start main animation after 3 seconds
        const timer = setTimeout(() => {
            LayoutAnimation.configureNext({
                duration: 400,
                create: { type: 'spring', springDamping: 0.6 },
                update: { type: 'spring', springDamping: 0.6 },
                delete: { type: 'easeIn', property: 'opacity' }
            });

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 0.85,
                    friction: 6,
                    tension: 50,
                    useNativeDriver: true,
                }),
                Animated.spring(rotateAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: -20,
                    duration: 500,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setShowCreateText(false);
                // Reset animations after text is hidden
                Animated.parallel([
                    Animated.spring(scaleAnim, {
                        toValue: 1,
                        friction: 8,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.spring(rotateAnim, {
                        toValue: 0,
                        friction: 8,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    })
                ]).start();
            });
        }, 3000);

        return () => {
            clearTimeout(timer);
            pulseAnimation.stop();
            // Clean up animations
            fadeAnim.stopAnimation();
            scaleAnim.stopAnimation();
            rotateAnim.stopAnimation();
            slideAnim.stopAnimation();
            pulseAnim.stopAnimation();
        };
    }, []);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    // Filter groups based on search and balance criteria
    const filteredGroups = groups
        .filter((group) => {
            // Apply search filter first
            const matchesSearch = group.name.toLowerCase().includes(search.toLowerCase());

            if (!matchesSearch) return false;

            // If no active filter, show all groups
            if (activeFilter === 'all') return true;

            // Check group balance for filtering using stored balances
            const balance = groupBalances[group._id] || { youOwe: 0, youreOwed: 0 };

            if (activeFilter === 'youOwe') {
                return balance.youOwe > 0;
            } else if (activeFilter === 'youreOwed') {
                return balance.youreOwed > 0;
            }

            return true;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));



    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Groups</Text>
                    {activeFilter !== 'all' && (
                        <Text style={styles.headerFilterText}>
                            {filteredGroups.length} group{filteredGroups.length !== 1 ? 's' : ''}
                            {activeFilter === 'youOwe' ? ' (you owe)' : ' (you\'re owed)'}
                        </Text>
                    )}
                </View>
            </View>

            {/* Summary Section */}
            {loading ? (
                <SummarySkeleton />
            ) : (
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}>
                        <TouchableOpacity
                            style={[
                                styles.summaryBox,
                                activeFilter === 'youOwe' && styles.activeSummaryBox
                            ]}
                            onPress={() => setActiveFilter(activeFilter === 'youOwe' ? 'all' : 'youOwe')}
                        >
                            <View style={[
                                styles.summaryIconContainer,
                                activeFilter === 'youOwe' && styles.activeSummaryIconContainer
                            ]}>
                                <Ionicons
                                    name="arrow-up"
                                    size={20}
                                    color={activeFilter === 'youOwe' ? '#fff' : Colors.error}
                                />
                            </View>
                            <View>
                                <Text style={[
                                    styles.summaryLabel,
                                    activeFilter === 'youOwe' && styles.activeSummaryLabel
                                ]}>
                                    You owe
                                </Text>
                                <Text style={[
                                    styles.summaryOwe,
                                    activeFilter === 'youOwe' && styles.activeSummaryAmount
                                ]}>
                                    ₹{summary.owe.toFixed(2)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.summaryBox,
                                activeFilter === 'youreOwed' && styles.activeSummaryBox
                            ]}
                            onPress={() => setActiveFilter(activeFilter === 'youreOwed' ? 'all' : 'youreOwed')}
                        >
                            <View style={[
                                styles.summaryIconContainer,
                                { backgroundColor: activeFilter === 'youreOwed' ? Colors.success : '#dcfce7' }
                            ]}>
                                <Ionicons
                                    name="arrow-down"
                                    size={20}
                                    color={activeFilter === 'youreOwed' ? '#fff' : Colors.success}
                                />
                            </View>
                            <View>
                                <Text style={[
                                    styles.summaryLabel,
                                    activeFilter === 'youreOwed' && styles.activeSummaryLabel
                                ]}>
                                    You're owed
                                </Text>
                                <Text style={[
                                    styles.summaryOwed,
                                    activeFilter === 'youreOwed' && styles.activeSummaryAmount
                                ]}>
                                    ₹{summary.owed.toFixed(2)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                    {activeFilter !== 'all' && (
                        <TouchableOpacity
                            style={styles.clearFilterButton}
                            onPress={() => setActiveFilter('all')}
                        >
                            <Ionicons name="close-circle" size={16} color="#8b5cf6" />
                            <Text style={styles.clearFilterText}>Clear filter</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Search Bar */}
            {loading ? (
                <SearchSkeleton />
            ) : (
                <View style={styles.searchContainer}>
                    <View style={styles.searchInnerContainer}>
                        <Ionicons name="search" size={20} color={Colors.primary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search groups..."
                            placeholderTextColor={Colors.textTertiary}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </View>
            )}

            {/* Groups List */}
            <FlatList
                data={loading ? Array(6).fill({}) : filteredGroups}
                keyExtractor={(item, index) => loading ? `skeleton-${index}` : item._id}
                contentContainerStyle={{ paddingTop: 8, paddingBottom: 100, paddingHorizontal: 12 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                renderItem={({ item, index }) => (
                    loading ? (
                        <GroupCardSkeleton key={`skeleton-${index}`} />
                    ) : (
                        <TouchableOpacity
                            style={styles.groupCard}
                            onPress={() => {
                                navigation.navigate('SplitGroups', {
                                    groupData: {
                                        ...item,
                                        members: item.members.map(member => ({
                                            ...member,
                                            avatar: member.avatar || null
                                        }))
                                    }
                                });
                            }}
                        >
                            <View style={styles.groupIconContainer}>
                                <MaterialIcons name="groups" size={32} color={Colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.groupName}>{item.name}</Text>
                                <Text style={styles.groupDetails}>{item.memberCount} members</Text>
                                <Text style={styles.groupDate}>
                                    Created {new Date(item.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color={Colors.textTertiary} />
                        </TouchableOpacity>
                    )
                )}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color={Colors.border} />
                            <Text style={styles.emptyText}>No groups found</Text>
                            <Text style={styles.emptySubtext}>
                                Create your first group to start splitting expenses
                            </Text>
                        </View>
                    )
                }
            />

            {/* Floating + Button */}
            <View style={styles.fabContainer}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <TouchableOpacity
                        style={[styles.fab, showCreateText ? styles.fabExpanded : styles.fabCollapsed]}
                        onPress={() => navigation.navigate('CreateSplitGroup')}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add" size={24} color={Colors.textInverse} />
                        {showCreateText && (
                            <Animated.Text style={[styles.fabText, { opacity: fadeAnim }]}>
                                Create Group
                            </Animated.Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: '10%',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Colors.backgroundSecondary,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerContent: {
        flexDirection: 'column',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: 0.5,
    },
    headerFilterText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#8b5cf6',
        marginTop: 2,
        letterSpacing: 0.3,
    },
    summaryContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 12,
    },
    summaryBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    summaryIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fef3f2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryLabel: {
        color: '#64748b',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    summaryOwe: {
        color: '#ef4444',
        fontWeight: '800',
        fontSize: 20,
        letterSpacing: 0.5,
    },
    summaryOwed: {
        color: '#22c55e',
        fontWeight: '800',
        fontSize: 20,
        letterSpacing: 0.5,
    },
    activeSummaryBox: {
        backgroundColor: '#8b5cf6',
        borderColor: '#8b5cf6',
        borderWidth: 2,
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    activeSummaryIconContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderWidth: 1,
    },
    activeSummaryLabel: {
        color: '#ffffff',
    },
    activeSummaryAmount: {
        color: '#ffffff',
    },
    clearFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    clearFilterText: {
        color: '#8b5cf6',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
        letterSpacing: 0.3,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#222',
        marginTop: 10,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchInnerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 16,
        height: 48,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 12,
        color: '#8b5cf6',
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 15,
        color: Colors.textPrimary,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    groupIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f0ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    groupDetails: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 3,
    },
    groupDate: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    oweText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: 'bold',
    },
    owedText: {
        color: '#22c55e',
        fontSize: 14,
        fontWeight: 'bold',
    },
    settleButton: {
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 14,
        marginLeft: 10,
    },
    settleButtonText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 14,
    },
    collectButton: {
        backgroundColor: '#d1fae5',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 14,
        marginLeft: 10,
    },
    collectButtonText: {
        color: '#22c55e',
        fontWeight: 'bold',
        fontSize: 14,
    },
    fabContainer: {
        position: 'absolute',
        right: 20,
        bottom: 28,
    },
    fab: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 12,
        flexDirection: 'row',
        paddingHorizontal: 20,
    },
    fabExpanded: {
        width: 160,
    },
    fabCollapsed: {
        width: 56,
        paddingHorizontal: 0,
    },
    fabText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginLeft: 10,
        letterSpacing: 0.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 24,
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '600',
    },
    retryButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 18,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '500',
    },
});

export default SplitGroups; 