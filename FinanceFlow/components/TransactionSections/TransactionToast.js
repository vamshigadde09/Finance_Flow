import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Confetti particle component
const ConfettiParticle = ({ color, size, delay, duration, startX, startY }) => {
    const translateY = useRef(new Animated.Value(startY)).current;
    const translateX = useRef(new Animated.Value(startX)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animations = [
            Animated.timing(scale, {
                toValue: 1,
                duration: 200,
                delay: delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: startY - 200 - Math.random() * 100,
                duration: duration,
                delay: delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateX, {
                toValue: startX + (Math.random() - 0.5) * 100,
                duration: duration,
                delay: delay,
                useNativeDriver: true,
            }),
            Animated.timing(rotate, {
                toValue: 1,
                duration: duration,
                delay: delay,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                delay: delay + duration - 300,
                useNativeDriver: true,
            }),
        ];

        Animated.parallel(animations).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.confettiParticle,
                {
                    backgroundColor: color,
                    width: size,
                    height: size,
                    transform: [
                        { translateY },
                        { translateX },
                        {
                            rotate: rotate.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                            }),
                        },
                        { scale },
                    ],
                    opacity,
                },
            ]}
        />
    );
};

const TransactionToast = ({
    visible,
    type,
    title,
    subtitle,
    footer,
    onHide,
    transactionType = 'transaction',
    amount = null
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;
    const checkmarkOpacity = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const textSlideAnim = useRef(new Animated.Value(20)).current;
    const textOpacityAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;

    // Confetti colors for success animation
    const confettiColors = ['#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff', '#faf5ff', '#ffffff'];
    const [showConfetti, setShowConfetti] = React.useState(false);

    useEffect(() => {
        if (visible) {
            // Reset animations
            fadeAnim.setValue(0);
            slideAnim.setValue(-100);
            scaleAnim.setValue(0.8);
            checkmarkScale.setValue(0);
            checkmarkOpacity.setValue(0);
            progressAnim.setValue(0);
            textSlideAnim.setValue(20);
            textOpacityAnim.setValue(0);
            glowAnim.setValue(0);
            rippleAnim.setValue(0);

            // Entry animation sequence
            const entrySequence = Animated.sequence([
                // Initial slide and fade in
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ]),
                // Bounce effect
                Animated.sequence([
                    Animated.timing(bounceAnim, {
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceAnim, {
                        toValue: 0,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                ]),
            ]);

            entrySequence.start();

            // Type-specific animations
            if (type === 'success') {
                // Success-specific animations
                const successSequence = Animated.sequence([
                    // Initial delay
                    Animated.delay(300),
                    // Checkmark animation
                    Animated.parallel([
                        Animated.timing(checkmarkScale, {
                            toValue: 1,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                        Animated.timing(checkmarkOpacity, {
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
                    // Glow effect
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    // Ripple effect
                    Animated.timing(rippleAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ]);

                successSequence.start(() => {
                    // Trigger confetti after success animation
                    setShowConfetti(true);
                });

                // Pulsing ring animation
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(pulseAnim, {
                            toValue: 1.1,
                            duration: 1200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(pulseAnim, {
                            toValue: 1,
                            duration: 1200,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();

            } else if (type === 'processing') {
                // Processing animation
                Animated.loop(
                    Animated.timing(progressAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    })
                ).start();

                // Text reveal for processing
                Animated.parallel([
                    Animated.timing(textSlideAnim, {
                        toValue: 0,
                        duration: 400,
                        delay: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(textOpacityAnim, {
                        toValue: 1,
                        duration: 400,
                        delay: 200,
                        useNativeDriver: true,
                    }),
                ]).start();

            } else if (type === 'error') {
                // Error shake animation
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
                ]).start();

                // Text reveal for error
                Animated.parallel([
                    Animated.timing(textSlideAnim, {
                        toValue: 0,
                        duration: 400,
                        delay: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(textOpacityAnim, {
                        toValue: 1,
                        duration: 400,
                        delay: 200,
                        useNativeDriver: true,
                    }),
                ]).start();
            }

            // Auto-hide timer
            const timer = setTimeout(() => {
                hideToast();
            }, type === 'processing' ? 5000 : type === 'success' ? 5000 : 5000);

            return () => clearTimeout(timer);
        }
    }, [visible, type]);

    const hideToast = () => {
        setShowConfetti(false);
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onHide();
        });
    };

    const getToastConfig = () => {
        switch (type) {
            case 'processing':
                return {
                    gradient: ['#8b5cf6', '#7c3aed'],
                    icon: 'sync',
                    iconColor: '#FFFFFF',
                    borderColor: '#8b5cf6',
                    glowColor: 'rgba(139, 92, 246, 0.3)',
                };
            case 'success':
                return {
                    gradient: ['#8b5cf6', '#7c3aed'],
                    icon: 'checkmark-circle',
                    iconColor: '#FFFFFF',
                    borderColor: '#8b5cf6',
                    glowColor: 'rgba(139, 92, 246, 0.4)',
                };
            case 'error':
                return {
                    gradient: ['#ef4444', '#dc2626'],
                    icon: 'close-circle',
                    iconColor: '#FFFFFF',
                    borderColor: '#ef4444',
                    glowColor: 'rgba(239, 68, 68, 0.3)',
                };
            default:
                return {
                    gradient: ['#8b5cf6', '#7c3aed'],
                    icon: 'information-circle',
                    iconColor: '#FFFFFF',
                    borderColor: '#8b5cf6',
                    glowColor: 'rgba(139, 92, 246, 0.3)',
                };
        }
    };

    const config = getToastConfig();

    if (!visible) return null;

    const transformStyle = {
        transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
            { translateX: shakeAnim },
            {
                translateY: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                })
            },
        ],
    };

    const iconScale = pulseAnim.interpolate({
        inputRange: [1, 1.1],
        outputRange: [1, 1.1],
    });

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.6],
    });

    const rippleScale = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 2],
    });

    const rippleOpacity = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 0],
    });

    return (
        <View style={styles.overlay}>
            {/* Confetti for success */}
            {showConfetti && type === 'success' && (
                <View style={styles.confettiContainer}>
                    {Array.from({ length: 20 }).map((_, index) => (
                        <ConfettiParticle
                            key={index}
                            color={confettiColors[index % confettiColors.length]}
                            size={Math.random() * 8 + 4}
                            delay={index * 50}
                            duration={2000 + Math.random() * 1000}
                            startX={width / 2 + (Math.random() - 0.5) * 100}
                            startY={height * 0.3}
                        />
                    ))}
                </View>
            )}

            <Animated.View style={[styles.container, { opacity: fadeAnim }, transformStyle]}>
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

                <LinearGradient
                    colors={config.gradient}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            {type === 'processing' ? (
                                <Animated.View style={[styles.spinnerContainer, {
                                    transform: [{
                                        rotate: progressAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '360deg'],
                                        })
                                    }]
                                }]}>
                                    <Ionicons name="sync" size={24} color={config.iconColor} />
                                </Animated.View>
                            ) : (
                                <Animated.View style={[styles.iconWrapper, { transform: [{ scale: iconScale }] }]}>
                                    <Ionicons name={config.icon} size={28} color={config.iconColor} />
                                    {type === 'success' && (
                                        <Animated.View
                                            style={[
                                                styles.pulseRing,
                                                {
                                                    borderColor: config.iconColor,
                                                    transform: [{ scale: checkmarkScale }],
                                                    opacity: checkmarkOpacity,
                                                }
                                            ]}
                                        />
                                    )}
                                </Animated.View>
                            )}
                        </View>

                        <Animated.View
                            style={[
                                styles.textContainer,
                                {
                                    transform: [{ translateY: textSlideAnim }],
                                    opacity: textOpacityAnim,
                                }
                            ]}
                        >
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.subtitle}>{subtitle}</Text>
                            {footer && <Text style={styles.footer}>{footer}</Text>}
                        </Animated.View>
                    </View>
                </LinearGradient>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        pointerEvents: 'none',
    },
    confettiContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
    },
    confettiParticle: {
        position: 'absolute',
        borderRadius: 2,
    },
    container: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        borderRadius: 24,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 16,
    },
    glowEffect: {
        position: 'absolute',
        top: -12,
        left: -12,
        right: -12,
        bottom: -12,
        borderRadius: 36,
        zIndex: -1,
    },
    rippleEffect: {
        position: 'absolute',
        top: -24,
        left: -24,
        right: -24,
        bottom: -24,
        borderRadius: 48,
        borderWidth: 3,
        zIndex: -2,
    },
    gradient: {
        borderRadius: 24,
        padding: 28,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 24,
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 52,
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: 52,
        height: 52,
    },
    spinnerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 52,
    },
    pulseRing: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 3,
        opacity: 0.4,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.95,
        lineHeight: 24,
        letterSpacing: 0.3,
    },
    footer: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.85,
        marginTop: 8,
        fontStyle: 'italic',
        letterSpacing: 0.2,
    },
});

export default TransactionToast; 