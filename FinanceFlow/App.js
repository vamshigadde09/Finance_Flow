import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from "react";
import { StyleSheet } from 'react-native';
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';

import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import HomePage from './components/HomePage';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/tabs/Homepage/dashbord';
import SplitGroups from './components/tabs/Groups/SplitGroups';
import ArchiveGroup from './components/tabs/Groups/ArchiveGroup';
import Stats from './components/tabs/Stats';
import Profile from './components/tabs/Profile';
import CreateSplitGroup from './components/tabs/Groups/CreateSplitGroup';
import SplitTransactions from './components/tabs/Groups/SplitTransactions';
import Splitviewtrans from './components/tabs/Groups/Splitviewtrans';
import BankAccount from './components/tabs/Profile/BankAccount';
import Privacy from './components/tabs/Profile/Privacy';
import CreateSplitTemplate from './components/tabs/Groups/CreateSplitTemplate';
import ViewSplitTemplate from './components/tabs/Groups/viewsplitTemplate';
import Contact from './components/tabs/Homepage/contacts/contact';
import AllContacts from './components/tabs/Homepage/contacts/AllContacts';
import ContactTransactionChat from './components/tabs/Homepage/contacts/ContactTransactionChat';
import ContactTran from './components/tabs/Homepage/contacts/ContactTran';
import TransactionScreen from './components/TransactionScreen';
import AllViewTrans from './components/tabs/Homepage/VIew_Trans/AllViewTans';
import FiltersView from './components/tabs/Stats/FiltersView';
import Help from './components/tabs/Profile/Help';
import Payment from './components/tabs/Profile/payment';
import TransExport from './components/tabs/Stats/TransExport';
import permission from './components/tabs/Profile/permission';
import { UserGuide } from './components/Guide';
import { checkUserGuideStatus } from './components/Guide/GuideUtils';
import { registerPushToken } from './utils/notifications';
import { API_BASE_URL } from './api';
const Stack = createNativeStackNavigator();

// Filter noisy expo-notifications warning (SDK 53+ in Expo Go)
const originalWarn = console.warn;
console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('expo-notifications')) return;
    originalWarn(...args);
};

const ProtectedScreen = (ScreenComponent) => {
    return (props) => (
        <ProtectedRoute>
            <ScreenComponent {...props} />
        </ProtectedRoute>
    );
};

const PublicScreen = (ScreenComponent) => {
    return (props) => (
        <PublicRoute>
            <ScreenComponent {...props} />
        </PublicRoute>
    );
};

export default function App() {
    const [initialRoute, setInitialRoute] = useState('Login');
    const [isLoading, setIsLoading] = useState(true);
    const [showUserGuide, setShowUserGuide] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    try {
                        const success = await registerPushToken(API_BASE_URL, token);
                        if (!success) {
                            console.warn('registerPushToken on app start failed, will retry later');
                        }
                    } catch (e) {
                        console.warn('registerPushToken on app start failed:', e?.message || e);
                    }
                    // Check if user guide has been completed
                    const guideCompleted = await checkUserGuideStatus();
                    if (!guideCompleted) {
                        setShowUserGuide(true);
                        setInitialRoute('UserGuide');
                    } else {
                        setInitialRoute('HomePage');
                    }
                }
            } catch (error) {
                console.error('Error checking auth:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (isLoading) {
        return null; // Or a loading screen if you prefer
    }

    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator
                    initialRouteName={initialRoute}
                    screenOptions={{ headerShown: false }}
                >
                    <Stack.Screen
                        name="UserGuide"
                        component={UserGuide}
                    />
                    <Stack.Screen
                        name="HomePage"
                        component={ProtectedScreen(HomePage)}
                    />
                    <Stack.Screen
                        name="Login"
                        component={PublicScreen(Login)}
                    />
                    <Stack.Screen
                        name="Register"
                        component={PublicScreen(Register)}
                    />
                    <Stack.Screen
                        name="Dashboard"
                        component={ProtectedScreen(Dashboard)}
                    />
                    <Stack.Screen
                        name="SplitGroups"
                        component={ProtectedScreen(SplitGroups)}
                    />
                    <Stack.Screen
                        name="Stats"
                        component={ProtectedScreen(Stats)}
                    />
                    <Stack.Screen
                        name="ArchiveGroup"
                        component={ProtectedScreen(ArchiveGroup)}
                    />
                    <Stack.Screen
                        name="Profile"
                        component={ProtectedScreen(Profile)}
                    />
                    <Stack.Screen
                        name="CreateSplitGroup"
                        component={ProtectedScreen(CreateSplitGroup)}
                    />
                    <Stack.Screen
                        name="SplitTransactions"
                        component={ProtectedScreen(SplitTransactions)}
                    />
                    <Stack.Screen
                        name="BankAccount"
                        component={ProtectedScreen(BankAccount)}
                    />
                    <Stack.Screen
                        name="Privacy"
                        component={ProtectedScreen(Privacy)}
                    />
                    <Stack.Screen
                        name="Help"
                        component={ProtectedScreen(Help)}
                    />
                    <Stack.Screen
                        name="Payment"
                        component={ProtectedScreen(Payment)}
                    />
                    <Stack.Screen
                        name="permission"
                        component={ProtectedScreen(permission)}
                    />
                    <Stack.Screen
                        name="Splitviewtrans"
                        component={ProtectedScreen(Splitviewtrans)}
                    />
                    <Stack.Screen
                        name="CreateSplitTemplate"
                        component={ProtectedScreen(CreateSplitTemplate)}
                    />
                    <Stack.Screen
                        name="ViewSplitTemplate"
                        component={ProtectedScreen(ViewSplitTemplate)}
                    />
                    <Stack.Screen
                        name="Contact"
                        component={ProtectedScreen(Contact)}
                    />
                    <Stack.Screen
                        name="AllContacts"
                        component={ProtectedScreen(AllContacts)}
                    />
                    <Stack.Screen
                        name="ContactTransactionChat"
                        component={ProtectedScreen(ContactTransactionChat)}
                    />
                    <Stack.Screen
                        name="ContactTran"
                        component={ProtectedScreen(ContactTran)}
                    />
                    <Stack.Screen
                        name="TransactionScreen"
                        component={ProtectedScreen(TransactionScreen)}
                    />
                    <Stack.Screen
                        name="AllViewTrans"
                        component={ProtectedScreen(AllViewTrans)}
                    />
                    <Stack.Screen
                        name="FiltersView"
                        component={ProtectedScreen(FiltersView)}
                    />
                    <Stack.Screen
                        name="TransExport"
                        component={ProtectedScreen(TransExport)}
                    />
                </Stack.Navigator>
            </NavigationContainer>
            <StatusBar style="auto" />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
}); 