import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, StatusBar, Share, Alert, Platform, PermissionsAndroid } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { captureRef as captureViewRef } from 'react-native-view-shot';
import TransactionDetailsScreen from './TransactionDetailsScreen';

const { width, height } = Dimensions.get('window');



const TransactionResultScreen = ({
    visible,
    type,
    title,
    subtitle,
    amount,
    transactionId,
    bankAccount,
    category,
    groupName,
    contactName,
    onClose,
    onViewDetails,
    onShare,
    onHome
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(height)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const iconScale = useRef(new Animated.Value(0)).current;
    const iconOpacity = useRef(new Animated.Value(0)).current;
    const textSlideAnim = useRef(new Animated.Value(30)).current;
    const textOpacityAnim = useRef(new Animated.Value(0)).current;
    const buttonSlideAnim = useRef(new Animated.Value(50)).current;
    const buttonOpacityAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;
    const [isProcessing, setIsProcessing] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const captureRef = useRef(null);



    useEffect(() => {
        if (visible) {
            // Reset animations
            fadeAnim.setValue(0);
            slideAnim.setValue(height);
            scaleAnim.setValue(0.8);
            iconScale.setValue(0);
            iconOpacity.setValue(0);
            textSlideAnim.setValue(30);
            textOpacityAnim.setValue(0);
            buttonSlideAnim.setValue(50);
            buttonOpacityAnim.setValue(0);
            glowAnim.setValue(0);
            rippleAnim.setValue(0);
            spinAnim.setValue(0);

            // Set processing state
            setIsProcessing(type === 'processing');

            // Entry animation sequence
            const entrySequence = Animated.sequence([
                // Background fade in
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                // Content slide up
                Animated.parallel([
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ]),
                // Icon animation
                Animated.parallel([
                    Animated.timing(iconScale, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(iconOpacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]),
                // Text reveal
                Animated.parallel([
                    Animated.timing(textSlideAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(textOpacityAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ]),
                // Buttons reveal
                Animated.parallel([
                    Animated.timing(buttonSlideAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(buttonOpacityAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ]),
            ]);

            entrySequence.start(() => {
                if (type === 'processing') {
                    // Start spinning animation for processing
                    Animated.loop(
                        Animated.timing(spinAnim, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                        })
                    ).start();
                } else if (type === 'success') {
                    // Stop processing and show success
                    setIsProcessing(false);

                    // Glow and ripple effects
                    Animated.parallel([
                        Animated.timing(glowAnim, {
                            toValue: 1,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(rippleAnim, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]).start();

                    // Pulsing animation
                    Animated.loop(
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
                            }),
                        ])
                    ).start();
                }
            });

            // Auto-close after 5 seconds for success/error states
            if (type === 'success' || type === 'error') {
                const timer = setTimeout(() => {
                    onClose();
                    // Navigate to home page
                    if (onHome) {
                        onHome();
                    }
                }, 20000);

                return () => clearTimeout(timer);
            }
        }
    }, [visible, type, onClose, onHome]);

    const getScreenConfig = () => {
        switch (type) {
            case 'success':
                return {
                    gradient: ['#8b5cf6', '#7c3aed'],
                    icon: 'checkmark-circle',
                    iconColor: '#FFFFFF',
                    glowColor: 'rgba(139, 92, 246, 0.3)',
                    backgroundColor: '#faf5ff',
                    textColor: '#6b21a8',
                };
            case 'error':
                return {
                    gradient: ['#ef4444', '#dc2626'],
                    icon: 'close-circle',
                    iconColor: '#FFFFFF',
                    glowColor: 'rgba(239, 68, 68, 0.3)',
                    backgroundColor: '#fef2f2',
                    textColor: '#991b1b',
                };
            case 'processing':
                return {
                    gradient: ['#8b5cf6', '#7c3aed'],
                    icon: 'sync',
                    iconColor: '#FFFFFF',
                    glowColor: 'rgba(139, 92, 246, 0.3)',
                    backgroundColor: '#faf5ff',
                    textColor: '#6b21a8',
                };
            default:
                return {
                    gradient: ['#8b5cf6', '#7c3aed'],
                    icon: 'information-circle',
                    iconColor: '#FFFFFF',
                    glowColor: 'rgba(139, 92, 246, 0.3)',
                    backgroundColor: '#faf5ff',
                    textColor: '#6b21a8',
                };
        }
    };

    const config = getScreenConfig();

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

    const getPermissionAndroid = async () => {
        try {
            // For Android 13+ (API 33+), we don't need WRITE_EXTERNAL_STORAGE for sharing
            return true;
        } catch (err) {
            Alert.alert('Error', 'Failed to request storage permission');
            return false;
        }
    };

    const handleViewDetails = () => {
        setShowDetails(true);
    };

    const handleShare = async () => {
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

            // Set capturing state to ensure proper rendering
            setIsCapturing(true);

            // Wait a bit for content to render and animations to complete
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Capture the compact view as an image
            console.log('Starting capture...');
            const uri = await captureViewRef(captureRef.current, {
                format: 'png',
                quality: 1.0,
                result: 'tmpfile',
            });

            // Reset capturing state
            setIsCapturing(false);

            console.log('Capture successful, URI:', uri);

            // Create a simple text message to accompany the image
            let shareMessage = `Transaction Receipt - ₹${amount?.toFixed(2)}
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

        } catch (error) {
            console.log('Sharing error:', error);
            console.log('Error message:', error.message);
            console.log('Error stack:', error.stack);

            // Reset capturing state on error
            setIsCapturing(false);

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

    const handleCloseDetails = () => {
        setShowDetails(false);
    };

    if (!visible) return null;

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4],
    });

    const rippleScale = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 3],
    });

    const rippleOpacity = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 0],
    });

    const spinRotation = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });



    return (
        <>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <StatusBar barStyle="light-content" backgroundColor={config.gradient[0]} />

                {/* Background */}
                <LinearGradient
                    colors={config.gradient}
                    style={styles.background}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Content */}
                <Animated.View
                    style={[
                        styles.content,
                        {
                            transform: [
                                { translateY: slideAnim },
                                { scale: scaleAnim },
                            ],
                        }
                    ]}
                >
                    {/* Close button - only show when not processing */}
                    {!isProcessing && (
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}

                    {/* Main content area */}
                    <View style={styles.mainContent}>
                        {/* Icon section */}
                        <View style={styles.iconSection}>
                            {/* Glow effect */}
                            <Animated.View
                                style={[
                                    styles.glowEffect,
                                    {
                                        backgroundColor: config.glowColor,
                                        opacity: glowOpacity,
                                    },
                                ]}
                            />

                            {/* Ripple effect for success */}
                            {type === 'success' && (
                                <Animated.View
                                    style={[
                                        styles.rippleEffect,
                                        {
                                            borderColor: config.iconColor,
                                            transform: [{ scale: rippleScale }],
                                            opacity: rippleOpacity,
                                        },
                                    ]}
                                />
                            )}

                            {/* Icon */}
                            <Animated.View
                                style={[
                                    styles.iconContainer,
                                    {
                                        transform: [
                                            { scale: iconScale },
                                            { scale: pulseAnim }
                                        ],
                                        opacity: iconOpacity,
                                    }
                                ]}
                            >
                                {isProcessing ? (
                                    <Animated.View style={[styles.spinnerContainer, {
                                        transform: [{
                                            rotate: spinRotation
                                        }]
                                    }]}>
                                        <Ionicons name="sync" size={48} color={config.iconColor} />
                                    </Animated.View>
                                ) : (
                                    <Ionicons name={config.icon} size={48} color={config.iconColor} />
                                )}
                            </Animated.View>
                        </View>

                        {/* Text content */}
                        <Animated.View
                            style={[
                                styles.textSection,
                                {
                                    transform: [{ translateY: textSlideAnim }],
                                    opacity: textOpacityAnim,
                                }
                            ]}
                        >
                            <Text style={styles.statusTitle}>{title}</Text>
                            <Text style={styles.statusSubtitle}>{subtitle}</Text>

                            {amount && (
                                <View style={styles.amountContainer}>
                                    <Text style={styles.amountLabel}>Amount</Text>
                                    <Text style={styles.amountValue}>₹{parseFloat(amount).toFixed(2)}</Text>
                                </View>
                            )}

                            {transactionId && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Transaction ID</Text>
                                    <Text style={styles.detailValue}>{transactionId}</Text>
                                </View>
                            )}

                            {bankAccount && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Bank Account</Text>
                                    <Text style={styles.detailValue}>{bankAccount}</Text>
                                </View>
                            )}

                            {category && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Category</Text>
                                    <Text style={styles.detailValue}>{category}</Text>
                                </View>
                            )}
                        </Animated.View>

                        {/* Action buttons - only show when not processing */}
                        {!isProcessing && (
                            <Animated.View
                                style={[
                                    styles.buttonSection,
                                    {
                                        transform: [{ translateY: buttonSlideAnim }],
                                        opacity: buttonOpacityAnim,
                                    }
                                ]}
                            >
                                {type === 'success' && (
                                    <>
                                        <TouchableOpacity style={styles.primaryButton} onPress={handleViewDetails}>
                                            <Ionicons name="document-text" size={20} color="#FFFFFF" />
                                            <Text style={styles.primaryButtonText}>View Details</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.secondaryButton}
                                            onPress={handleShare}
                                            disabled={shareLoading}
                                        >
                                            {shareLoading ? (
                                                <Ionicons name="hourglass-outline" size={20} color={config.textColor} />
                                            ) : (
                                                <Ionicons name="share-outline" size={20} color={config.textColor} />
                                            )}
                                            <Text style={styles.secondaryButtonText}>
                                                {shareLoading ? 'Sharing...' : 'Share Receipt'}
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}

                                <TouchableOpacity style={styles.homeButton} onPress={onHome}>
                                    <Ionicons name="home-outline" size={20} color={config.textColor} />
                                    <Text style={styles.homeButtonText}>Go to Home</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </View>
                </Animated.View>
            </Animated.View>

            {/* Static view for capture - hidden but captures with full colors */}
            <View
                ref={captureRef}
                style={[styles.captureView, { opacity: 0, position: 'absolute', top: -10000 }]}
            >
                <LinearGradient
                    colors={config.gradient}
                    style={styles.background}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.content}>
                    <View style={styles.mainContent}>
                        <View style={styles.iconSection}>
                            <View style={styles.iconContainer}>
                                <Ionicons name={config.icon} size={48} color={config.iconColor} />
                            </View>
                        </View>

                        <View style={styles.textSection}>
                            <Text style={styles.statusTitle}>{title}</Text>
                            <Text style={styles.statusSubtitle}>{subtitle}</Text>

                            {amount && (
                                <View style={styles.amountContainer}>
                                    <Text style={styles.amountLabel}>Amount</Text>
                                    <Text style={styles.amountValue}>₹{parseFloat(amount).toFixed(2)}</Text>
                                </View>
                            )}

                            {transactionId && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Transaction ID</Text>
                                    <Text style={styles.detailValue}>{transactionId}</Text>
                                </View>
                            )}

                            {bankAccount && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Bank Account</Text>
                                    <Text style={styles.detailValue}>{bankAccount}</Text>
                                </View>
                            )}

                            {category && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Category</Text>
                                    <Text style={styles.detailValue}>{category}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            {/* Transaction Details Screen */}
            <TransactionDetailsScreen
                visible={showDetails}
                transactionData={{
                    title,
                    amount,
                    category,
                    transactionId,
                    bankAccount,
                    status: type,
                    date: new Date(),
                    groupName,
                    contactName,
                }}
                onClose={handleCloseDetails}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
    },

    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 24,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10001,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
    },
    iconSection: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        position: 'relative',
    },
    glowEffect: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        zIndex: -1,
    },
    rippleEffect: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 3,
        zIndex: -2,
    },
    iconContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    spinnerContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    textSection: {
        alignItems: 'center',
        marginBottom: 40,
        width: '100%',
    },
    statusTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    statusSubtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.9,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
        letterSpacing: 0.2,
    },
    amountContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    amountLabel: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.8,
        marginBottom: 4,
        fontWeight: '500',
    },
    amountValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    detailLabel: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.8,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
        marginLeft: 16,
    },
    buttonSection: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
        letterSpacing: 0.3,
    },
    secondaryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    secondaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
        letterSpacing: 0.3,
    },
    homeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    homeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
        letterSpacing: 0.3,
    },
    captureView: {
        width: width,
        height: height,
        zIndex: -1,
    },
});

export default TransactionResultScreen; 