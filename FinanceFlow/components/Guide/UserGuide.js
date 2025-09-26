import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    SafeAreaView,
    Animated,
    Image,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { markUserGuideCompleted } from "./GuideUtils";
import axios from "axios";
import { API_BASE_URL } from "../../api";

const { width, height } = Dimensions.get("window");

const UserGuide = ({ navigation }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const guideSteps = [
        {
            id: 1,
            title: "Welcome to Finance Flow",
            subtitle: "Your Smart Personal Finance Manager",
            description: "Finance Flow is your all-in-one solution for managing personal expenses, splitting bills with friends, and tracking your financial health. Whether you're planning a trip with friends or managing your daily expenses, we've got you covered with powerful features and intuitive design.",
            icon: "wallet",
            gradient: ["#667eea", "#764ba2"],
            image: "💳",
            features: [
                "Personal Expense Tracking",
                "Group Bill Splitting",
                "Bank Account Management",
                "Detailed Analytics & Reports",
                "Transaction History",
                "Settlement Tracking"
            ],
        },
        {
            id: 2,
            title: "Create & Manage Groups",
            subtitle: "Split Expenses with Friends",
            description: "Create groups for trips, shared expenses, or any occasion. Add members and split bills effortlessly.",
            icon: "people",
            gradient: ["#f093fb", "#f5576c"],
            image: require("./images/Groups.png"),
            features: ["Create Groups", "Add Members", "Split Bills", "Track Settlements"],
        },
        {
            id: 3,
            title: "Track Your Transactions",
            subtitle: "Monitor All Your Expenses",
            description: "Record personal expenses, group transactions, and view detailed analytics of your spending patterns.",
            icon: "analytics",
            gradient: ["#4facfe", "#00f2fe"],
            image: require("./images/Analytics.png"),
            features: ["Personal Expenses", "Group Transactions", "Analytics", "Export Data"],
        },
        {
            id: 4,
            title: "Manage Bank Accounts",
            subtitle: "Connect Your Financial Accounts",
            description: "Add multiple bank accounts, set primary accounts, and track balances across all your accounts.",
            icon: "business",
            gradient: ["#43e97b", "#38f9d7"],
            image: require("./images/Bank_Account.png"),
            features: ["Add Accounts", "Set Primary", "Track Balances", "Manage Limits"],
        },
        {
            id: 5,
            title: "You're All Set!",
            subtitle: "Start Your Financial Journey",
            description: "You now know the basics of Finance Flow. Start by adding your first bank account or creating a group!",
            icon: "checkmark-circle",
            gradient: ["#fa709a", "#fee140"],
            image: "🎉",
            features: ["Ready to Start", "Add Bank Account", "Create Group", "Track Expenses"],
        },
    ];

    const handleNext = () => {
        if (currentStep < guideSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFinish = async () => {
        try {
            // Get token from AsyncStorage
            const token = await AsyncStorage.getItem('token');

            if (token) {
                // Call backend API to update user guide completion
                await axios.put(`${API_BASE_URL}/api/v1/user/complete-user-guide`,
                    { userGuideCompleted: true },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );
            }

            // Mark as completed locally
            await markUserGuideCompleted();
            setIsVisible(false);
            navigation.replace("HomePage");
        } catch (error) {
            console.error("Error completing user guide:", error);
            // Still mark as completed locally even if API call fails
            await markUserGuideCompleted();
            setIsVisible(false);
            navigation.replace("HomePage");
        }
    };

    if (!isVisible) return null;

    const currentGuide = guideSteps[currentStep];
    const isLastStep = currentStep === guideSteps.length - 1;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={currentGuide.gradient[0]} />

            <LinearGradient
                colors={currentGuide.gradient}
                style={styles.gradientBackground}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.progressContainer}>
                        {guideSteps.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.progressDot,
                                    index <= currentStep && styles.progressDotActive
                                ]}
                            />
                        ))}
                    </View>
                    <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {typeof currentGuide.image !== 'string' ? (
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={true}
                    >
                        {/* Icon */}
                        <View style={styles.iconContainer}>
                            <View style={styles.iconWrapper}>
                                <Ionicons
                                    name={currentGuide.icon}
                                    size={50}
                                    color="#ffffff"
                                />
                            </View>
                        </View>

                        {/* Text */}
                        <View style={styles.textContainer}>
                            <Text style={styles.title}>{currentGuide.title}</Text>
                            <Text style={styles.subtitle}>{currentGuide.subtitle}</Text>
                            <Text style={styles.description}>{currentGuide.description}</Text>
                        </View>

                        {/* Features */}
                        <View style={styles.featuresContainer}>
                            {currentGuide.features.map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Image */}
                        <View style={styles.imageContainer}>
                            {typeof currentGuide.image === 'string' ? (
                                <Text style={styles.emoji}>{currentGuide.image}</Text>
                            ) : (
                                <Image
                                    source={currentGuide.image}
                                    style={styles.guideImage}
                                    resizeMode="contain"
                                />
                            )}
                        </View>
                    </ScrollView>
                ) : (
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        showsVerticalScrollIndicator={true}
                    >
                        {/* Icon */}
                        <View style={styles.iconContainer}>
                            <View style={styles.iconWrapper}>
                                <Ionicons
                                    name={currentGuide.icon}
                                    size={50}
                                    color="#ffffff"
                                />
                            </View>
                        </View>

                        {/* Text */}
                        <View style={styles.textContainer}>
                            <Text style={styles.title}>{currentGuide.title}</Text>
                            <Text style={styles.subtitle}>{currentGuide.subtitle}</Text>
                            <Text style={styles.description}>{currentGuide.description}</Text>
                        </View>

                        {/* Features */}
                        <View style={styles.featuresContainer}>
                            {currentGuide.features.map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                )}

                {/* Navigation */}
                <View style={styles.navigationContainer}>
                    <View style={styles.navigationButtons}>
                        {currentStep > 0 ? (
                            <TouchableOpacity
                                style={styles.previousButton}
                                onPress={handlePrevious}
                            >
                                <Ionicons name="chevron-back" size={24} color="#ffffff" />
                                <Text style={styles.previousButtonText}>Previous</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.spacer} />
                        )}

                        <TouchableOpacity
                            style={styles.nextButton}
                            onPress={handleNext}
                        >
                            <Text style={styles.nextButtonText}>
                                {isLastStep ? 'Get Started' : 'Next'}
                            </Text>
                            <Ionicons
                                name={isLastStep ? "checkmark" : "chevron-forward"}
                                size={20}
                                color="#ffffff"
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    gradientBackground: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: '10%',
        paddingBottom: 16,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 4,
    },
    progressDotActive: {
        backgroundColor: '#ffffff',
        width: 20,
    },
    skipButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    skipText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: '10%',
        paddingBottom: '100%',
        alignItems: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    iconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 24,
    },
    featuresContainer: {
        width: '100%',
        marginBottom: 30,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    featureText: {
        flex: 1,
        fontSize: 15,
        color: '#ffffff',
        fontWeight: '500',
        marginLeft: 12,
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    emoji: {
        fontSize: 80,
        textAlign: 'center',
    },
    guideImage: {
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        aspectRatio: 1,
        borderRadius: 100,
    },
    navigationContainer: {
        paddingHorizontal: 20,
        paddingBottom: '5%',
        paddingTop: '5%',
    },
    navigationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    spacer: {
        flex: 1,
    },
    previousButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    previousButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    nextButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
});

export default UserGuide;