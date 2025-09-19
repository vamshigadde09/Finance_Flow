import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Linking,
    Platform,
    StatusBar,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Import packages with fallback handling
let Contacts, ImagePicker, Location, Notifications, FileSystem;

try {
    Contacts = require('expo-contacts');
} catch (e) {
    console.log('expo-contacts not available');
}

try {
    ImagePicker = require('expo-image-picker');
} catch (e) {
    console.log('expo-image-picker not available');
}

// try {
//     Location = require('expo-location');
// } catch (e) {
//     console.log('expo-location not available');
// }

// try {
//     Notifications = require('expo-notifications');
// } catch (e) {
//     console.log('expo-notifications not available');
// }

try {
    FileSystem = require('expo-file-system');
} catch (e) {
    console.log('expo-file-system not available');
}

const Permission = ({ navigation }) => {
    const [permissions, setPermissions] = useState({
        contacts: 'unknown',
        camera: 'unknown',
        photoLibrary: 'unknown',
        location: 'unknown',
        notifications: 'unknown',
        storage: 'unknown'
    });

    const [loading, setLoading] = useState({});

    const permissionList = [
        {
            key: 'contacts',
            title: 'Contacts Access',
            description: 'Access your contacts to easily split bills and send money to friends',
            icon: 'people-outline',
            color: '#8b5cf6',
            required: true
        },
        {
            key: 'camera',
            title: 'Camera Access',
            description: 'Take photos of receipts and documents for expense tracking',
            icon: 'camera-outline',
            color: '#10b981',
            required: true
        },
        {
            key: 'photoLibrary',
            title: 'Photo Library Access',
            description: 'Select photos from your gallery for receipts and documents',
            icon: 'images-outline',
            color: '#f59e0b',
            required: true
        },
        // {
        //     key: 'location',
        //     title: 'Location Access',
        //     description: 'Add location data to transactions for better expense tracking',
        //     icon: 'location-outline',
        //     color: '#ef4444',
        //     required: false
        // },
        // {
        //     key: 'notifications',
        //     title: 'Push Notifications',
        //     description: 'Receive reminders for bill payments and transaction updates',
        //     icon: 'notifications-outline',
        //     color: '#3b82f6',
        //     required: false
        // },
        // {
        //     key: 'storage',
        //     title: 'Storage Access',
        //     description: 'Store transaction data and backup your financial information',
        //     icon: 'folder-outline',
        //     color: '#6b7280',
        //     required: true
        // }
    ];

    useEffect(() => {
        checkAllPermissions();
    }, []);

    const checkAllPermissions = async () => {
        try {
            const newPermissions = { ...permissions };

            // Check contacts permission
            if (Contacts && Contacts.getPermissionsAsync) {
                try {
                    const contactsStatus = await Contacts.getPermissionsAsync();
                    newPermissions.contacts = contactsStatus.status;
                } catch (error) {
                    newPermissions.contacts = 'denied';
                }
            } else {
                newPermissions.contacts = 'not_available';
            }

            // Check camera permission
            if (ImagePicker && ImagePicker.getCameraPermissionsAsync) {
                try {
                    const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
                    newPermissions.camera = cameraStatus.status;
                } catch (error) {
                    newPermissions.camera = 'denied';
                }
            } else {
                newPermissions.camera = 'not_available';
            }

            // Check photo library permission
            if (ImagePicker && ImagePicker.getMediaLibraryPermissionsAsync) {
                try {
                    const photoStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
                    newPermissions.photoLibrary = photoStatus.status;
                } catch (error) {
                    newPermissions.photoLibrary = 'denied';
                }
            } else {
                newPermissions.photoLibrary = 'not_available';
            }

            // Check location permission
            if (Location && Location.getForegroundPermissionsAsync) {
                try {
                    const locationStatus = await Location.getForegroundPermissionsAsync();
                    newPermissions.location = locationStatus.status;
                } catch (error) {
                    newPermissions.location = 'denied';
                }
            } else {
                newPermissions.location = 'not_available';
            }

            // Check notification permission
            if (Notifications && Notifications.getPermissionsAsync) {
                try {
                    const notificationStatus = await Notifications.getPermissionsAsync();
                    newPermissions.notifications = notificationStatus.status;
                } catch (error) {
                    newPermissions.notifications = 'denied';
                }
            } else {
                newPermissions.notifications = 'not_available';
            }

            // Check storage permission (FileSystem access)
            if (FileSystem && FileSystem.documentDirectory) {
                try {
                    const testDir = FileSystem.documentDirectory;
                    if (testDir) {
                        newPermissions.storage = 'granted';
                    } else {
                        newPermissions.storage = 'denied';
                    }
                } catch (error) {
                    newPermissions.storage = 'denied';
                }
            } else {
                newPermissions.storage = 'not_available';
            }

            setPermissions(newPermissions);
        } catch (error) {
            console.error('Error checking permissions:', error);
        }
    };

    const requestPermission = async (permissionType) => {
        setLoading(prev => ({ ...prev, [permissionType]: true }));

        try {
            let result = { status: 'denied' };

            switch (permissionType) {
                case 'contacts':
                    if (Contacts && Contacts.requestPermissionsAsync) {
                        result = await Contacts.requestPermissionsAsync();
                    } else {
                        Alert.alert('Not Available', 'Contacts permission is not available on this device.');
                        result = { status: 'not_available' };
                    }
                    break;
                case 'camera':
                    if (ImagePicker && ImagePicker.requestCameraPermissionsAsync) {
                        result = await ImagePicker.requestCameraPermissionsAsync();
                    } else {
                        Alert.alert('Not Available', 'Camera permission is not available on this device.');
                        result = { status: 'not_available' };
                    }
                    break;
                case 'photoLibrary':
                    if (ImagePicker && ImagePicker.requestMediaLibraryPermissionsAsync) {
                        result = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    } else {
                        Alert.alert('Not Available', 'Photo library permission is not available on this device.');
                        result = { status: 'not_available' };
                    }
                    break;
                case 'location':
                    if (Location && Location.requestForegroundPermissionsAsync) {
                        result = await Location.requestForegroundPermissionsAsync();
                    } else {
                        Alert.alert('Not Available', 'Location permission is not available on this device.');
                        result = { status: 'not_available' };
                    }
                    break;
                case 'notifications':
                    if (Notifications && Notifications.requestPermissionsAsync) {
                        result = await Notifications.requestPermissionsAsync({
                            ios: {
                                allowAlert: true,
                                allowBadge: true,
                                allowSound: true,
                            },
                        });
                    } else {
                        Alert.alert('Not Available', 'Notification permission is not available on this device.');
                        result = { status: 'not_available' };
                    }
                    break;
                case 'storage':
                    if (FileSystem && FileSystem.documentDirectory) {
                        try {
                            const testDir = FileSystem.documentDirectory;
                            if (testDir) {
                                result = { status: 'granted' };
                            } else {
                                result = { status: 'denied' };
                            }
                        } catch (error) {
                            result = { status: 'denied' };
                        }
                    } else {
                        Alert.alert('Not Available', 'Storage access is not available on this device.');
                        result = { status: 'not_available' };
                    }
                    break;
                default:
                    break;
            }

            setPermissions(prev => ({
                ...prev,
                [permissionType]: result.status
            }));

            if (result.status === 'denied') {
                Alert.alert(
                    'Permission Required',
                    'This permission is required for the app to function properly. Please enable it in your device settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.error(`Error requesting ${permissionType} permission:`, error);
            Alert.alert('Error', 'Failed to request permission. Please try again.');
        } finally {
            setLoading(prev => ({ ...prev, [permissionType]: false }));
        }
    };

    const getPermissionStatus = (status) => {
        switch (status) {
            case 'granted':
                return { text: 'Granted', color: '#10b981', icon: 'checkmark-circle' };
            case 'denied':
                return { text: 'Denied', color: '#ef4444', icon: 'close-circle' };
            case 'undetermined':
                return { text: 'Not Asked', color: '#6b7280', icon: 'help-circle' };
            case 'not_available':
                return { text: 'Not Available', color: '#9ca3af', icon: 'ban' };
            default:
                return { text: 'Unknown', color: '#6b7280', icon: 'help-circle' };
        }
    };

    const getRequiredPermissionsCount = () => {
        const requiredPermissions = permissionList.filter(p => p.required);
        const grantedRequired = requiredPermissions.filter(p => permissions[p.key] === 'granted');
        return `${grantedRequired.length}/${requiredPermissions.length}`;
    };

    const isAllRequiredGranted = () => {
        const requiredPermissions = permissionList.filter(p => p.required);
        return requiredPermissions.every(p => permissions[p.key] === 'granted');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Dashboard Header */}
            <View style={styles.welcomeSection}>
                <View style={styles.welcomeHeader}>
                    <View style={styles.welcomeLeft}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="chevron-back" size={24} color="#1e293b" />
                        </TouchableOpacity>
                        <View style={styles.welcomeText}>
                            <Text style={styles.welcomeGreeting}>Permissions</Text>
                            <Text style={styles.welcomeName}>Manage app permissions</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.welcomeDivider} />
            </View>




            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Progress Card */}
                <View style={styles.progressCard}>
                    <LinearGradient
                        colors={['#f3e8ff', '#e9d5ff']}
                        style={styles.progressCardGradient}
                    >
                        <View style={styles.progressHeader}>
                            <Ionicons name="shield-checkmark-outline" size={28} color="#8b5cf6" />
                            <Text style={styles.progressTitle}>Permission Status</Text>
                        </View>
                        <Text style={styles.progressDescription}>
                            {isAllRequiredGranted()
                                ? 'All required permissions are granted. Your app is fully functional!'
                                : 'Grant the required permissions below to use all app features.'
                            }
                        </Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${(getRequiredPermissionsCount().split('/')[0] / getRequiredPermissionsCount().split('/')[1]) * 100}%` }
                                ]}
                            />
                        </View>
                    </LinearGradient>
                </View>

                {/* Permission List */}
                <View style={styles.permissionList}>
                    {permissionList.map((permission) => {
                        const status = getPermissionStatus(permissions[permission.key]);
                        const isGranted = permissions[permission.key] === 'granted';
                        const isLoading = loading[permission.key];

                        return (
                            <View key={permission.key} style={styles.permissionItem}>
                                <View style={styles.permissionHeader}>
                                    <View style={[styles.permissionIcon, { backgroundColor: `${permission.color}15` }]}>
                                        <Ionicons
                                            name={permission.icon}
                                            size={24}
                                            color={permission.color}
                                        />
                                    </View>
                                    <View style={styles.permissionInfo}>
                                        <View style={styles.permissionTitleRow}>
                                            <Text style={styles.permissionTitle}>{permission.title}</Text>
                                            {permission.required && (
                                                <View style={styles.requiredBadge}>
                                                    <Text style={styles.requiredText}>Required</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.permissionDescription}>{permission.description}</Text>
                                    </View>
                                </View>

                                <View style={styles.permissionFooter}>
                                    <View style={styles.statusContainer}>
                                        <Ionicons
                                            name={status.icon}
                                            size={16}
                                            color={status.color}
                                        />
                                        <Text style={[styles.statusText, { color: status.color }]}>
                                            {status.text}
                                        </Text>
                                    </View>

                                    {!isGranted && (
                                        <TouchableOpacity
                                            style={[
                                                styles.requestButton,
                                                { backgroundColor: permission.color }
                                            ]}
                                            onPress={() => requestPermission(permission.key)}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Text style={styles.requestButtonText}>Requesting...</Text>
                                            ) : (
                                                <Text style={styles.requestButtonText}>Grant</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Help Section */}
                <View style={styles.helpSection}>
                    <View style={styles.helpHeader}>
                        <Ionicons name="help-circle-outline" size={20} color="#6b7280" />
                        <Text style={styles.helpTitle}>Need Help?</Text>
                    </View>
                    <Text style={styles.helpText}>
                        If you're having trouble granting permissions, you can manually enable them in your device settings.
                    </Text>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => Linking.openSettings()}
                    >
                        <Ionicons name="settings-outline" size={16} color="#8b5cf6" />
                        <Text style={styles.settingsButtonText}>Open Settings</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    // Dashboard Header Styles
    welcomeSection: {
        backgroundColor: '#ffffff',
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
    welcomeText: {
        marginLeft: 12,
    },
    welcomeGreeting: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 2,
    },
    welcomeName: {
        fontSize: 14,
        color: '#64748b',
    },
    welcomeDivider: {
        height: 1,
        backgroundColor: '#1e293b',
        marginTop: 16,
        marginHorizontal: 0,
        opacity: 0.1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryCards: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        padding: 20,
        backdropFilter: 'blur(10px)',
    },
    summaryCardContent: {
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginTop: 8,
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    progressCard: {
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    progressCardGradient: {
        padding: 20,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 12,
    },
    progressDescription: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 16,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#8b5cf6',
        borderRadius: 4,
    },
    permissionList: {
        marginBottom: 20,
    },
    permissionItem: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    permissionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    permissionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    permissionInfo: {
        flex: 1,
    },
    permissionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    permissionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.3,
        flex: 1,
    },
    requiredBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f59e0b',
    },
    requiredText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#d97706',
        letterSpacing: 0.5,
    },
    permissionDescription: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    permissionFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
        letterSpacing: 0.3,
    },
    requestButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    requestButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    helpSection: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    helpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    helpTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 8,
        letterSpacing: 0.3,
    },
    helpText: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 16,
    },
    settingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    settingsButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8b5cf6',
        marginLeft: 6,
        letterSpacing: 0.3,
    },
});

export default Permission;