import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const APPS = [
    { key: 'gpay', label: 'Google Pay', color: '#1a73e8', icon: 'logo-google' },
    { key: 'phonepe', label: 'PhonePe', color: '#673ab7', icon: 'phone-portrait-outline' },
    { key: 'paytm', label: 'Paytm', color: '#00baf2', icon: 'card-outline' },
    { key: 'other', label: 'Other UPI App', color: '#64748b', icon: 'apps-outline' },
];

const Payment = () => {
    const navigation = useNavigation();
    const [defaultApp, setDefaultApp] = useState('gpay');

    const openWithFallback = async (schemeUrl, storeId) => {
        try {
            const can = await Linking.canOpenURL(schemeUrl);
            if (can) {
                await Linking.openURL(schemeUrl);
                return;
            }
        } catch (_e) { }
        const storeUrl = Platform.OS === 'android'
            ? `https://play.google.com/store/apps/details?id=${storeId}`
            : 'https://apps.apple.com';
        Linking.openURL(storeUrl);
    };

    const onOpenApp = (key) => {
        switch (key) {
            case 'gpay':
                return openWithFallback('tez://upi/pay', 'com.google.android.apps.nbu.paisa.user');
            case 'phonepe':
                return openWithFallback('phonepe://upi/pay', 'com.phonepe.app');
            case 'paytm':
                return openWithFallback('paytmmp://upi/pay', 'net.one97.paytm');
            case 'other':
            default:
                return Linking.openURL('upi://pay');
        }
    };
    return (
        <SafeAreaView style={styles.safeContainer}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={24} color="#334155" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleRow}>
                            <View style={styles.headerAccent} />
                            <Text style={styles.headerTitle}>Default Payment App</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Choose your default UPI app</Text>
                        {APPS.map(app => (
                            <TouchableOpacity
                                key={app.key}
                                style={styles.optionRow}
                                onPress={() => setDefaultApp(app.key)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.appIcon, { backgroundColor: `${app.color}22` }]}>
                                    <Ionicons name={app.icon} size={18} color={app.color} />
                                </View>
                                <Text style={styles.optionLabel}>{app.label}</Text>
                                <View style={[styles.radio, defaultApp === app.key && styles.radioActive]} />
                            </TouchableOpacity>
                        ))}
                        <Text style={styles.hint}>We’ll preselect this app when you initiate a payment.</Text>
                        <View style={styles.quickRow}>
                            {APPS.map(app => (
                                <TouchableOpacity
                                    key={`btn-${app.key}`}
                                    style={[styles.quickBtn, { borderColor: app.color }]}
                                    onPress={() => onOpenApp(app.key)}
                                >
                                    <Ionicons name={app.icon} size={16} color={app.color} />
                                    <Text style={[styles.quickBtnText, { color: app.color }]}>Open {app.label.split(' ')[0]}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

export default Payment;
const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: '#f7fafd',
    },
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
        paddingTop: '10%',
    },
    header: {
        paddingHorizontal: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 8,
        padding: 4,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerAccent: {
        width: 4,
        height: 20,
        backgroundColor: '#06a6f7',
        borderRadius: 2,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0f172a',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e6f4fd',
        shadowColor: '#06a6f7',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 10,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eef6ff',
    },
    appIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    optionLabel: {
        flex: 1,
        color: '#0f172a',
        fontWeight: '600',
        marginLeft: 12,
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#cfe9fb',
        backgroundColor: '#fff',
    },
    radioActive: {
        borderColor: '#06a6f7',
        backgroundColor: '#06a6f7',
    },
    hint: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 10,
    },
    quickRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
    },
    quickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1.5,
        backgroundColor: '#fff',
    },
    quickBtnText: {
        fontWeight: '700',
    },
});