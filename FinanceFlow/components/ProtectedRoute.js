import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axiosInstance from '../utils/axiosConfig';
import { API_BASE_URL } from '../api';
const ProtectedRoute = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    navigation.replace('Login');
                    return;
                }

                // Verify token by making a request to a protected endpoint
                try {
                    await axiosInstance.get(`${API_BASE_URL}/api/v1/user/user`);
                    setIsAuthenticated(true);
                } catch (error) {
                    // If token is invalid, clear storage and redirect to login
                    if (error.response?.status === 401) {
                        await AsyncStorage.removeItem('token');
                        await AsyncStorage.removeItem('userData');
                        navigation.replace('Login');
                        return;
                    }
                    // For other errors, we'll still consider the user authenticated
                    // as the token might be valid but the endpoint might be down
                    setIsAuthenticated(true);
                }
            } catch (error) {
                console.error('Auth check error:', error);
                navigation.replace('Login');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [navigation]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#06a6f7" />
            </View>
        );
    }

    return isAuthenticated ? children : null;
};

export default ProtectedRoute; 