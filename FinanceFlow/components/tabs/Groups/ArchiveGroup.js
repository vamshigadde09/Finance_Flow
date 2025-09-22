import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Alert,
    Animated,
    Vibration,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { API_BASE_URL } from '../../../api';
import Colors from '../../../constants/Colors';

const ArchiveGroup = ({ navigation }) => {
    const [archivedGroups, setArchivedGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [skeletonAnim] = useState(new Animated.Value(0));
    const [restoreModalVisible, setRestoreModalVisible] = useState(false);
    const [groupToRestore, setGroupToRestore] = useState(null);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchArchivedGroups();
        startSkeletonAnimation();
    }, []);

    const startSkeletonAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(skeletonAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(skeletonAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const fetchArchivedGroups = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                setErrorMessage("User session expired. Please login again.");
                setErrorModalVisible(true);
                navigation.navigate("Login");
                return;
            }

            const user = JSON.parse(userData);
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/splits/archived-groups`,
                {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                }
            );

            if (response.data.success) {
                setArchivedGroups(response.data.archivedGroups || []);
            } else {
                setErrorMessage(response.data.message || "Failed to fetch archived groups");
                setErrorModalVisible(true);
            }
        } catch (error) {
            console.error("Error fetching archived groups:", error);
            setErrorMessage(error.response?.data?.message || "Failed to fetch archived groups. Please try again.");
            setErrorModalVisible(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const restoreGroup = async (groupId, groupName) => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                setErrorMessage("User session expired. Please login again.");
                setErrorModalVisible(true);
                navigation.navigate("Login");
                return;
            }

            const user = JSON.parse(userData);

            setGroupToRestore({ groupId, groupName, user });
            setRestoreModalVisible(true);
        } catch (error) {
            console.error("Error in restoreGroup:", error);
            setErrorMessage("An unexpected error occurred. Please try again.");
            setErrorModalVisible(true);
        }
    };

    const performRestoreGroup = async () => {
        if (!groupToRestore) return;

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/v1/splits/restore-group`,
                { groupId: groupToRestore.groupId },
                {
                    headers: {
                        Authorization: `Bearer ${groupToRestore.user.token}`,
                    },
                }
            );

            if (response.data.success) {
                // Remove the group from archived list
                setArchivedGroups(prevGroups =>
                    prevGroups.filter(group => group._id !== groupToRestore.groupId)
                );
                // Close modal
                setRestoreModalVisible(false);
                setGroupToRestore(null);
            } else {
                setErrorMessage(response.data.message || "Failed to restore group");
                setErrorModalVisible(true);
            }
        } catch (error) {
            console.error("Error restoring group:", error);
            setErrorMessage(error.response?.data?.message || "Failed to restore group. Please try again.");
            setErrorModalVisible(true);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchArchivedGroups();
    };

    const SkeletonGroupItem = () => (
        <View style={styles.skeletonGroupCard}>
            <Animated.View
                style={[
                    styles.skeletonIcon,
                    {
                        opacity: skeletonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 0.7],
                        })
                    }
                ]}
            />
            <View style={styles.skeletonContent}>
                <Animated.View
                    style={[
                        styles.skeletonName,
                        {
                            opacity: skeletonAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 0.7],
                            })
                        }
                    ]}
                />
                <Animated.View
                    style={[
                        styles.skeletonDetails,
                        {
                            opacity: skeletonAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 0.7],
                            })
                        }
                    ]}
                />
            </View>
        </View>
    );

    const renderGroupItem = ({ item }) => (
        <View style={styles.groupCard}>
            <View style={styles.groupIconContainer}>
                <MaterialIcons name="archive" size={32} color={Colors.textTertiary} />
            </View>
            <View style={styles.groupContent}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupDetails}>{item.memberCount} members</Text>
                <Text style={styles.groupDate}>
                    Archived {new Date(item.archivedAt || item.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.restoreButton}
                onPress={() => {
                    Vibration.vibrate(50);
                    restoreGroup(item._id, item.name);
                }}
                activeOpacity={0.7}
            >
                <Ionicons name="refresh" size={20} color={Colors.primary} />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Archived Groups</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.skeletonContainer}>
                    {[1, 2, 3, 4, 5].map((index) => (
                        <SkeletonGroupItem key={index} />
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Archived Groups</Text>
                <View style={styles.placeholder} />
            </View>

            <FlatList
                data={archivedGroups}
                renderItem={renderGroupItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="archive" size={64} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>No Archived Groups</Text>
                            <Text style={styles.emptySubtitle}>
                                Groups you archive will appear here. You can restore them anytime.
                            </Text>
                        </View>
                    )
                }
            />

            {/* Restore Confirmation Modal */}
            <Modal
                visible={restoreModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setRestoreModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconContainer}>
                                <Ionicons name="refresh" size={32} color="#22c55e" />
                            </View>
                            <Text style={styles.modalTitle}>Restore Group</Text>
                        </View>

                        <View style={styles.modalContent}>
                            <Text style={styles.modalText}>
                                Are you sure you want to restore "{groupToRestore?.groupName}"?
                            </Text>
                            <Text style={styles.modalSubtext}>
                                This group will be visible in your groups list again.
                            </Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => {
                                    setRestoreModalVisible(false);
                                    setGroupToRestore(null);
                                }}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalRestoreButton}
                                onPress={performRestoreGroup}
                            >
                                <Text style={styles.modalRestoreText}>Restore</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Error Modal */}
            <Modal
                visible={errorModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setErrorModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={[styles.modalIconContainer, { backgroundColor: '#fee2e2' }]}>
                                <Ionicons name="alert-circle" size={32} color="#ef4444" />
                            </View>
                            <Text style={styles.modalTitle}>Error</Text>
                        </View>

                        <View style={styles.modalContent}>
                            <Text style={styles.modalText}>
                                {errorMessage}
                            </Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalRestoreButton, { backgroundColor: '#ef4444' }]}
                                onPress={() => {
                                    setErrorModalVisible(false);
                                    setErrorMessage('');
                                }}
                            >
                                <Text style={styles.modalRestoreText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default ArchiveGroup;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.backgroundPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Colors.backgroundSecondary,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.textPrimary,
        letterSpacing: 0.5,
    },
    placeholder: {
        width: 40,
    },
    listContainer: {
        padding: 20,
        flexGrow: 1,
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundSecondary,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    groupIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    groupContent: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    groupDetails: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    groupDate: {
        fontSize: 12,
        color: Colors.textTertiary,
    },
    restoreButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    emptySubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 40,
    },
    // Skeleton Loading Styles
    skeletonContainer: {
        flex: 1,
        padding: 20,
    },
    skeletonGroupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundSecondary,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    skeletonIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.border,
        marginRight: 16,
    },
    skeletonContent: {
        flex: 1,
    },
    skeletonName: {
        height: 16,
        backgroundColor: Colors.border,
        borderRadius: 8,
        marginBottom: 8,
        width: '60%',
    },
    skeletonDetails: {
        height: 14,
        backgroundColor: Colors.border,
        borderRadius: 7,
        width: '40%',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    modalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
    },
    modalContent: {
        marginBottom: 24,
    },
    modalText: {
        fontSize: 16,
        color: '#64748b',
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 12,
    },
    modalSubtext: {
        fontSize: 14,
        color: '#94a3b8',
        lineHeight: 20,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    modalCancelText: {
        color: '#64748b',
        fontSize: 16,
        fontWeight: '600',
    },
    modalRestoreButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#22c55e',
    },
    modalRestoreText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});