import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, StatusBar, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { checkUserGuideStatus } from './Guide/GuideUtils';
import { API_BASE_URL } from '../api';

const Register = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const navigation = useNavigation();

    const validateForm = () => {
        const newErrors = {};

        // First Name validation
        if (!firstName.trim()) {
            newErrors.firstName = 'First name is required';
        } else if (firstName.length < 2) {
            newErrors.firstName = 'First name must be at least 2 characters';
        }

        // Last Name validation
        if (!lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        } else if (lastName.length < 2) {
            newErrors.lastName = 'Last name must be at least 2 characters';
        }

        // Phone validation
        if (!phone) {
            newErrors.phone = 'Phone number is required';
        } else if (phone.length !== 10) {
            newErrors.phone = 'Phone number must be 10 digits';
        } else if (!/^[6-9]/.test(phone)) {
            newErrors.phone = 'Phone number must start with 6, 7, 8, or 9';
        }

        // Email validation
        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        // Confirm Password validation
        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePhoneChange = (text) => {
        // Remove any non-digit characters
        const digits = text.replace(/\D/g, '');
        // Take only the last 10 digits
        const formattedPhone = digits.slice(-10);
        setPhone(formattedPhone);
        // Clear phone error if input is valid
        if (formattedPhone.length === 10 && /^[6-9]/.test(formattedPhone)) {
            setErrors(prev => ({ ...prev, phone: null }));
        }
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const response = await axios.post(`${API_BASE_URL}/api/v1/user/register`, {
                firstName,
                lastName,
                phoneNumber: phone,
                email: email.toLowerCase(),
                password,
                userGuideCompleted: false
            });

            if (response.status === 201) {
                navigation.replace('Login');
                console.log("response.data", response.data);
            }
        } catch (error) {
            if (error.response) {
                // Handle validation errors from backend
                if (error.response.data.errors) {
                    const backendErrors = {};
                    error.response.data.errors.forEach(err => {
                        if (err.path === 'phoneNumber') {
                            backendErrors.phone = err.message;
                        } else {
                            backendErrors[err.path] = err.message;
                        }
                    });
                    setErrors(backendErrors);
                } else {
                    setErrors({ general: error.response.data.message || 'Registration failed' });
                }
            } else if (error.request) {
                setErrors({ general: 'Network error. Please check your connection.' });
            } else {
                setErrors({ general: 'An error occurred during registration' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#8b5cf6" />



            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    <View style={styles.welcomeSection}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person-add" size={32} color="#8b5cf6" />
                        </View>
                        <Text style={styles.title}>Welcome to Finance Flow</Text>
                        <Text style={styles.subtitle}>Create your account to start managing your finances</Text>
                    </View>

                    <View style={styles.nameRow}>
                        <View style={[styles.inputGroup, styles.nameInputGroup]}>
                            <Text style={styles.inputLabel}>First Name</Text>
                            <View style={[styles.inputContainer, errors.firstName && styles.inputError]}>
                                <Feather name="user" size={20} color="#8b5cf6" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="First name"
                                    placeholderTextColor="#9ca3af"
                                    value={firstName}
                                    onChangeText={(text) => {
                                        setFirstName(text);
                                        setErrors(prev => ({ ...prev, firstName: null }));
                                    }}
                                    autoCapitalize="words"
                                />
                            </View>
                            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                        </View>

                        <View style={[styles.inputGroup, styles.nameInputGroup]}>
                            <Text style={styles.inputLabel}>Last Name</Text>
                            <View style={[styles.inputContainer, errors.lastName && styles.inputError]}>
                                <Feather name="user" size={20} color="#8b5cf6" style={styles.icon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Last name"
                                    placeholderTextColor="#9ca3af"
                                    value={lastName}
                                    onChangeText={(text) => {
                                        setLastName(text);
                                        setErrors(prev => ({ ...prev, lastName: null }));
                                    }}
                                    autoCapitalize="words"
                                />
                            </View>
                            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                            <MaterialIcons name="phone" size={20} color="#8b5cf6" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 10-digit mobile number"
                                placeholderTextColor="#9ca3af"
                                value={phone}
                                onChangeText={handlePhoneChange}
                                keyboardType="phone-pad"
                                maxLength={10}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>
                    {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                            <MaterialIcons name="email" size={20} color="#8b5cf6" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email address"
                                placeholderTextColor="#9ca3af"
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    setErrors(prev => ({ ...prev, email: null }));
                                }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>
                    {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                            <Feather name="lock" size={20} color="#8b5cf6" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Create a strong password"
                                placeholderTextColor="#9ca3af"
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    setErrors(prev => ({ ...prev, password: null }));
                                }}
                                secureTextEntry={!isPasswordVisible}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                                <Feather name={isPasswordVisible ? 'eye' : 'eye-off'} size={20} color="#8b5cf6" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Confirm Password</Text>
                        <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                            <Feather name="lock" size={20} color="#8b5cf6" style={styles.icon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm your password"
                                placeholderTextColor="#9ca3af"
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    setErrors(prev => ({ ...prev, confirmPassword: null }));
                                }}
                                secureTextEntry={!isConfirmPasswordVisible}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
                                <Feather name={isConfirmPasswordVisible ? 'eye' : 'eye-off'} size={20} color="#8b5cf6" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

                    {errors.general && <Text style={styles.generalError}>{errors.general}</Text>}

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={isLoading ? ['#9ca3af', '#6b7280'] : ['#8b5cf6', '#7c3aed']}
                            style={styles.buttonGradient}
                        >
                            <View style={styles.buttonContent}>
                                {isLoading && <Ionicons name="hourglass-outline" size={20} color="#ffffff" style={styles.buttonIcon} />}
                                <Text style={styles.buttonText}>{isLoading ? 'Creating Account...' : 'Create Account'}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.linkContainer}>
                        <Text style={styles.linkText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                            <Text style={styles.link}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
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
    header: {
        paddingTop: 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
        flexGrow: 1,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingVertical: 32,
        paddingHorizontal: 24,
        marginTop: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.1)',
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    nameInputGroup: {
        flex: 1,
        marginBottom: 0,
        marginRight: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        height: 56,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
        backgroundColor: 'transparent',
    },
    inputError: {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
    },
    icon: {
        marginRight: 12,
    },
    button: {
        borderRadius: 16,
        marginTop: 24,
        marginBottom: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonGradient: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    buttonDisabled: {
        shadowOpacity: 0.1,
    },
    linkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    linkText: {
        color: '#6b7280',
        fontSize: 15,
    },
    link: {
        color: '#8b5cf6',
        fontWeight: 'bold',
        fontSize: 15,
        marginLeft: 4,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 13,
        marginTop: 6,
        marginLeft: 4,
        fontWeight: '500',
    },
    generalError: {
        color: '#ef4444',
        fontSize: 15,
        marginBottom: 16,
        textAlign: 'center',
        backgroundColor: '#fef2f2',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
        fontWeight: '500',
    },
});

export default Register;
