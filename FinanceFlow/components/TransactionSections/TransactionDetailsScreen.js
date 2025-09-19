import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    Dimensions,
    Share,
    Alert,
    StatusBar,
    Platform,
    PermissionsAndroid
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { captureRef as captureViewRef } from 'react-native-view-shot';


const TransactionDetailsScreen = ({
    visible,
    transactionData,
    onClose
}) => {
    const [shareLoading, setShareLoading] = useState(false);
    const viewRef = useRef(null);
    const captureRef = useRef(null);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCategoryIcon = (category) => {
        const icons = {
            'Housing': <FontAwesome5 name="home" size={22} color="#8b5cf6" />,
            'Groceries': <MaterialIcons name="local-grocery-store" size={22} color="#8b5cf6" />,
            'Dining': <MaterialIcons name="restaurant" size={22} color="#8b5cf6" />,
            'Transport': <MaterialIcons name="directions-car" size={22} color="#8b5cf6" />,
            'Travel': <FontAwesome5 name="plane" size={22} color="#8b5cf6" />,
            'Entertainment': <MaterialIcons name="movie" size={22} color="#8b5cf6" />,
            'Coffee': <MaterialIcons name="local-cafe" size={22} color="#8b5cf6" />,
            'Health': <MaterialIcons name="local-hospital" size={22} color="#8b5cf6" />,
            'Work': <MaterialIcons name="work" size={22} color="#8b5cf6" />,
            'Utilities': <MaterialIcons name="flash-on" size={22} color="#8b5cf6" />,
            'Gifts': <MaterialIcons name="card-giftcard" size={22} color="#8b5cf6" />,
            'Other': <MaterialIcons name="more" size={22} color="#8b5cf6" />
        };
        return icons[category] || icons['Other'];
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
            case 'completed':
                return '#2e7d32';
            case 'pending':
                return '#F59E0B';
            case 'failed':
            case 'error':
                return '#c62828';
            default:
                return '#6B7280';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
            case 'completed':
                return 'checkmark-circle';
            case 'pending':
                return 'time';
            case 'failed':
            case 'error':
                return 'close-circle';
            default:
                return 'help-circle';
        }
    };

    const getPermissionAndroid = async () => {
        try {
            // For Android 13+ (API 33+), we don't need WRITE_EXTERNAL_STORAGE for sharing
            // Let's try to proceed without permission first
            return true;

            // Uncomment below if you want to still check permissions on older Android versions
            /*
            // First check if permission is already granted
            const hasPermission = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            );
            
            if (hasPermission) {
                return true;
            }

            // If not granted, request permission
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                {
                    title: 'Storage Permission Required',
                    message: 'FinanceFlow needs access to your storage to save and share transaction receipt images. This allows you to share beautiful receipt images with others.',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'Allow',
                }
            );
            
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                return true;
            } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
                Alert.alert(
                    'Permission Denied', 
                    'Storage permission is required to share transaction receipt images. You can enable it in your device settings.',
                    [
                        { text: 'OK', style: 'default' }
                    ]
                );
                return false;
            } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                Alert.alert(
                    'Permission Blocked', 
                    'Storage permission has been permanently denied. Please enable it manually in your device settings to share images.',
                    [
                        { text: 'OK', style: 'default' }
                    ]
                );
                return false;
            }
            
            return false;
            */
        } catch (err) {
            Alert.alert('Error', 'Failed to request storage permission');
            return false;
        }
    };


    const handleShare = async () => {
        if (!transactionData) {
            return;
        }

        setShareLoading(true);

        try {
            // Check permissions for Android
            if (Platform.OS === 'android') {
                const hasPermission = await getPermissionAndroid();

                if (!hasPermission) {
                    setShareLoading(false);
                    return;
                }
            }

            if (!captureRef.current) {
                Alert.alert('Error', 'Cannot capture image - capture reference is not available');
                return;
            }

            console.log('CaptureRef available:', !!captureRef.current);
            console.log('CaptureRef type:', typeof captureRef.current);

            // Wait a bit for content to render
            await new Promise(resolve => setTimeout(resolve, 300));

            // Capture the compact view as an image
            console.log('Starting capture...');
            const uri = await captureViewRef(captureRef.current, {
                format: 'png',
                quality: 0.8,
                result: 'tmpfile',
            });

            console.log('Capture successful, URI:', uri);

            // Create a simple text message to accompany the image
            let shareMessage = `Transaction Receipt - ₹${transactionData.amount?.toFixed(2)}
Generated by FinanceFlow`;

            // Share the captured image using Expo Sharing
            // Check if sharing is available
            console.log('Checking sharing availability...');
            const isAvailable = await Sharing.isAvailableAsync();
            console.log('Sharing available:', isAvailable);

            if (!isAvailable) {
                Alert.alert('Error', 'Sharing is not available on this device');
                return;
            }

            console.log('Starting share with URI:', uri);
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Share Transaction Receipt',
            });

            console.log('Share completed successfully');
            const shareResult = { action: 'sharedAction' };


        } catch (error) {
            console.log('Sharing error:', error);
            console.log('Error message:', error.message);
            console.log('Error stack:', error.stack);

            // Provide more specific error messages
            if (error.message && error.message.includes('permission')) {
                Alert.alert(
                    'Permission Error',
                    'Storage permission is required to share images. Please grant permission and try again.',
                    [{ text: 'OK', style: 'default' }]
                );
            } else if (error.message && error.message.includes('capture')) {
                Alert.alert(
                    'Capture Error',
                    'Failed to capture the transaction details. Please try again.',
                    [{ text: 'OK', style: 'default' }]
                );
            } else {
                Alert.alert(
                    'Sharing Error',
                    `Failed to share transaction details: ${error.message}`,
                    [{ text: 'OK', style: 'default' }]
                );
            }
        } finally {
            setShareLoading(false);
        }
    };

    if (!visible || !transactionData) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header - Matching FiltersView style */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                    <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transaction Details</Text>
                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShare}
                    disabled={shareLoading}
                >
                    {shareLoading ? (
                        <Ionicons name="hourglass-outline" size={24} color="#8b5cf6" />
                    ) : (
                        <Ionicons name="share-outline" size={24} color="#8b5cf6" />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={viewRef}
                style={styles.container}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Amount Card - Enhanced styling */}
                <View style={styles.amountCard}>
                    <Text style={styles.amountLabel}>Transaction Amount</Text>
                    <Text style={styles.amountValue}>₹{transactionData.amount?.toFixed(2)}</Text>
                    <View style={styles.statusContainer}>
                        <Ionicons
                            name={getStatusIcon(transactionData.status || 'success')}
                            size={16}
                            color={getStatusColor(transactionData.status || 'success')}
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(transactionData.status || 'success') }]}>
                            {transactionData.status === 'success' ? 'Completed' : transactionData.status || 'Completed'}
                        </Text>
                    </View>
                </View>

                {/* Transaction Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transaction Information</Text>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="document-text-outline" size={18} color="#8b5cf6" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Title</Text>
                            <Text style={styles.infoValue}>{transactionData.title}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            {getCategoryIcon(transactionData.category)}
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Category</Text>
                            <Text style={styles.infoValue}>{transactionData.category}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="card-outline" size={18} color="#6C63FF" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Bank Account</Text>
                            <Text style={styles.infoValue}>{transactionData.bankAccount}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="finger-print-outline" size={18} color="#8b5cf6" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Transaction ID</Text>
                            <Text style={styles.infoValue}>{transactionData.transactionId}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="time-outline" size={18} color="#8b5cf6" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Date & Time</Text>
                            <Text style={styles.infoValue}>{formatDate(transactionData.date || new Date())}</Text>
                        </View>
                    </View>
                </View>

                {/* Additional Details */}
                {(transactionData.groupName || transactionData.contactName || transactionData.paidBy || (transactionData.members && transactionData.members.length > 0)) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Additional Details</Text>

                        {transactionData.groupName && (
                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="people-outline" size={22} color="#8b5cf6" />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Group</Text>
                                    <Text style={styles.infoValue}>{transactionData.groupName}</Text>
                                </View>
                            </View>
                        )}

                        {transactionData.contactName && (
                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="person-outline" size={22} color="#8b5cf6" />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Contact</Text>
                                    <Text style={styles.infoValue}>{transactionData.contactName}</Text>
                                </View>
                            </View>
                        )}

                        {transactionData.paidBy && (
                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="card-outline" size={22} color="#8b5cf6" />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Paid By</Text>
                                    <Text style={styles.infoValue}>{transactionData.paidBy}</Text>
                                </View>
                            </View>
                        )}

                        {transactionData.members && transactionData.members.length > 0 && (
                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="people-circle-outline" size={22} color="#8b5cf6" />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Members</Text>
                                    <Text style={styles.infoValue}>{transactionData.members.join(', ')}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleShare}
                    >
                        <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Share Receipt</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Hidden compact view for image capture */}
            <View
                ref={captureRef}
                style={styles.compactCaptureView}
                pointerEvents="none"
            >
                {/* Compact Amount Card */}
                <View style={styles.compactAmountCard}>
                    <Text style={styles.compactAmountLabel}>Transaction Amount</Text>
                    <Text style={styles.compactAmountValue}>₹{transactionData.amount?.toFixed(2)}</Text>
                    <View style={styles.compactStatusContainer}>
                        <Ionicons
                            name={getStatusIcon(transactionData.status || 'success')}
                            size={12}
                            color={getStatusColor(transactionData.status || 'success')}
                        />
                        <Text style={[styles.compactStatusText, { color: getStatusColor(transactionData.status || 'success') }]}>
                            {transactionData.status === 'success' ? 'Completed' : transactionData.status || 'Completed'}
                        </Text>
                    </View>
                </View>

                {/* Compact Transaction Info */}
                <View style={styles.compactSection}>
                    <Text style={styles.compactSectionTitle}>Transaction Information</Text>

                    <View style={styles.compactInfoRow}>
                        <View style={styles.compactInfoIcon}>
                            <Ionicons name="document-text-outline" size={14} color="#8b5cf6" />
                        </View>
                        <View style={styles.compactInfoContent}>
                            <Text style={styles.compactInfoLabel}>Title</Text>
                            <Text style={styles.compactInfoValue}>{transactionData.title}</Text>
                        </View>
                    </View>

                    <View style={styles.compactInfoRow}>
                        <View style={styles.compactInfoIcon}>
                            {getCategoryIcon(transactionData.category)}
                        </View>
                        <View style={styles.compactInfoContent}>
                            <Text style={styles.compactInfoLabel}>Category</Text>
                            <Text style={styles.compactInfoValue}>{transactionData.category}</Text>
                        </View>
                    </View>

                    <View style={styles.compactInfoRow}>
                        <View style={styles.compactInfoIcon}>
                            <Ionicons name="card-outline" size={14} color="#6C63FF" />
                        </View>
                        <View style={styles.compactInfoContent}>
                            <Text style={styles.compactInfoLabel}>Bank Account</Text>
                            <Text style={styles.compactInfoValue}>{transactionData.bankAccount}</Text>
                        </View>
                    </View>

                    <View style={styles.compactInfoRow}>
                        <View style={styles.compactInfoIcon}>
                            <Ionicons name="finger-print-outline" size={14} color="#8b5cf6" />
                        </View>
                        <View style={styles.compactInfoContent}>
                            <Text style={styles.compactInfoLabel}>Transaction ID</Text>
                            <Text style={styles.compactInfoValue}>{transactionData.transactionId}</Text>
                        </View>
                    </View>

                    <View style={styles.compactInfoRow}>
                        <View style={styles.compactInfoIcon}>
                            <Ionicons name="time-outline" size={14} color="#8b5cf6" />
                        </View>
                        <View style={styles.compactInfoContent}>
                            <Text style={styles.compactInfoLabel}>Date & Time</Text>
                            <Text style={styles.compactInfoValue}>{formatDate(transactionData.date || new Date())}</Text>
                        </View>
                    </View>
                </View>

                {/* Compact Additional Details */}
                {(transactionData.groupName || transactionData.contactName || transactionData.paidBy || (transactionData.members && transactionData.members.length > 0)) && (
                    <View style={styles.compactSection}>
                        <Text style={styles.compactSectionTitle}>Additional Details</Text>

                        {transactionData.groupName && (
                            <View style={styles.compactInfoRow}>
                                <View style={styles.compactInfoIcon}>
                                    <Ionicons name="people-outline" size={14} color="#8b5cf6" />
                                </View>
                                <View style={styles.compactInfoContent}>
                                    <Text style={styles.compactInfoLabel}>Group</Text>
                                    <Text style={styles.compactInfoValue}>{transactionData.groupName}</Text>
                                </View>
                            </View>
                        )}

                        {transactionData.contactName && (
                            <View style={styles.compactInfoRow}>
                                <View style={styles.compactInfoIcon}>
                                    <Ionicons name="person-outline" size={14} color="#8b5cf6" />
                                </View>
                                <View style={styles.compactInfoContent}>
                                    <Text style={styles.compactInfoLabel}>Contact</Text>
                                    <Text style={styles.compactInfoValue}>{transactionData.contactName}</Text>
                                </View>
                            </View>
                        )}

                        {transactionData.paidBy && (
                            <View style={styles.compactInfoRow}>
                                <View style={styles.compactInfoIcon}>
                                    <Ionicons name="card-outline" size={14} color="#8b5cf6" />
                                </View>
                                <View style={styles.compactInfoContent}>
                                    <Text style={styles.compactInfoLabel}>Paid By</Text>
                                    <Text style={styles.compactInfoValue}>{transactionData.paidBy}</Text>
                                </View>
                            </View>
                        )}

                        {transactionData.members && transactionData.members.length > 0 && (
                            <View style={styles.compactInfoRow}>
                                <View style={styles.compactInfoIcon}>
                                    <Ionicons name="people-circle-outline" size={14} color="#8b5cf6" />
                                </View>
                                <View style={styles.compactInfoContent}>
                                    <Text style={styles.compactInfoLabel}>Members</Text>
                                    <Text style={styles.compactInfoValue}>{transactionData.members.join(', ')}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: '#f7fafd',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        padding: 8,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.5,
    },
    shareButton: {
        padding: 8,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
        padding: 16,
    },
    amountCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#8b5cf6',
    },
    amountLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    amountValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: 12,
        letterSpacing: 1,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 6,
        letterSpacing: 0.3,
    },
    section: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
        borderLeftWidth: 3,
        borderLeftColor: '#8b5cf6',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 3,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.2,
    },
    actionSection: {
        paddingBottom: 40,
        paddingTop: 20,
    },
    actionButton: {
        backgroundColor: '#8b5cf6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 10,
        letterSpacing: 0.5,
    },
    // Compact styles for image capture
    compactCaptureView: {
        position: 'absolute',
        top: -1000,
        left: -1000,
        width: 400,
        backgroundColor: '#f7fafd',
        padding: 12,
    },
    compactAmountCard: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderLeftWidth: 3,
        borderLeftColor: '#8b5cf6',
    },
    compactAmountLabel: {
        fontSize: 10,
        color: '#6b7280',
        marginBottom: 4,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    compactAmountValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    compactStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    compactStatusText: {
        fontSize: 10,
        fontWeight: '700',
        marginLeft: 4,
        letterSpacing: 0.2,
    },
    compactSection: {
        backgroundColor: '#ffffff',
        borderRadius: 6,
        padding: 8,
        marginBottom: 8,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderLeftWidth: 2,
        borderLeftColor: '#8b5cf6',
    },
    compactSectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    compactInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        backgroundColor: '#f9fafb',
        borderRadius: 4,
        padding: 6,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    compactInfoIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#8b5cf6',
    },
    compactInfoContent: {
        flex: 1,
    },
    compactInfoLabel: {
        fontSize: 9,
        color: '#6b7280',
        marginBottom: 2,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    compactInfoValue: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.1,
    },
});

export default TransactionDetailsScreen; 