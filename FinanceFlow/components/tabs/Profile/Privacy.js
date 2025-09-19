import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const Privacy = () => {
    const [twoFA, setTwoFA] = useState(false);
    const [hideBalance, setHideBalance] = useState(false);

    const navigation = useNavigation();
    return (
        <SafeAreaView style={styles.container}>
            {/* Dashboard Header */}
            <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.dashboardHeader}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Privacy & Security</Text>
                    <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryCards}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryCardContent}>
                            <Ionicons name="shield-checkmark" size={24} color="#4ade80" />
                            <Text style={styles.summaryValue}>{twoFA ? 'ON' : 'OFF'}</Text>
                            <Text style={styles.summaryLabel}>2FA Status</Text>
                        </View>
                    </View>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryCardContent}>
                            <Ionicons name="eye-off" size={24} color="#f59e0b" />
                            <Text style={styles.summaryValue}>{hideBalance ? 'ON' : 'OFF'}</Text>
                            <Text style={styles.summaryLabel}>Hide Balance</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>


            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Security Card */}
                <View style={styles.securityCard}>
                    <LinearGradient
                        colors={['#f3e8ff', '#e9d5ff']}
                        style={styles.securityCardGradient}
                    >
                        <View style={styles.securityHeader}>
                            <Ionicons name="shield-checkmark" size={32} color="#8b5cf6" />
                            <Text style={styles.securityTitle}>Account Protection</Text>
                        </View>
                        <Text style={styles.securityDescription}>
                            Secure your account with 2‑factor authentication and privacy controls.
                        </Text>
                    </LinearGradient>
                </View>

                {/* Security Settings */}
                {/* <View style={styles.settingsCard}>
                    <View style={styles.settingsHeader}>
                        <Ionicons name="settings-outline" size={24} color="#8b5cf6" />
                        <Text style={styles.settingsTitle}>Security Settings</Text>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <View style={styles.settingIcon}>
                                <Feather name="shield" size={20} color="#8b5cf6" />
                            </View>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Two‑factor authentication</Text>
                                <Text style={styles.settingDescription}>Add an extra layer of security</Text>
                            </View>
                        </View>
                        <Switch
                            value={twoFA}
                            onValueChange={setTwoFA}
                            trackColor={{ false: '#e5e7eb', true: '#8b5cf6' }}
                            thumbColor={twoFA ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                    <View style={styles.settingDivider} />

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <View style={styles.settingIcon}>
                                <Ionicons name="eye-off-outline" size={20} color="#8b5cf6" />
                            </View>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Hide balances on home</Text>
                                <Text style={styles.settingDescription}>Keep your balances private</Text>
                            </View>
                        </View>
                        <Switch
                            value={hideBalance}
                            onValueChange={setHideBalance}
                            trackColor={{ false: '#e5e7eb', true: '#8b5cf6' }}
                            thumbColor={hideBalance ? '#fff' : '#f4f3f4'}
                        />
                    </View>
                </View> */}

                {/* Data Management */}
                {/* <View style={styles.dataCard}>
                    <View style={styles.dataHeader}>
                        <Ionicons name="folder-outline" size={24} color="#8b5cf6" />
                        <Text style={styles.dataTitle}>Data & Permissions</Text>
                    </View>

                    <TouchableOpacity style={styles.dataItem}>
                        <View style={styles.dataItemLeft}>
                            <Ionicons name="key-outline" size={20} color="#8b5cf6" />
                            <Text style={styles.dataItemText}>Manage permissions</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#64748b" />
                    </TouchableOpacity>

                    <View style={styles.dataDivider} />

                    <TouchableOpacity style={styles.dataItem}>
                        <View style={styles.dataItemLeft}>
                            <Ionicons name="download-outline" size={20} color="#8b5cf6" />
                            <Text style={styles.dataItemText}>Download my data</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#64748b" />
                    </TouchableOpacity>

                    <View style={styles.dataDivider} />

                    <TouchableOpacity style={styles.dataItem}>
                        <View style={styles.dataItemLeft}>
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            <Text style={[styles.dataItemText, { color: '#ef4444' }]}>Delete account</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#64748b" />
                    </TouchableOpacity>
                </View> */}

                {/* About Privacy */}
                <View style={styles.aboutCard}>
                    <View style={styles.aboutHeader}>
                        <Ionicons name="information-circle-outline" size={24} color="#8b5cf6" />
                        <Text style={styles.aboutTitle}>About Privacy</Text>
                    </View>
                    <Text style={styles.aboutText}>
                        We use your data only to provide core features like syncing groups and transactions. You can
                        export or delete your data anytime.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Privacy;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    // Dashboard Header Styles
    dashboardHeader: {
        paddingTop: 20,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    // Content Container
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    // Security Card Styles
    securityCard: {
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    securityCardGradient: {
        padding: 20,
    },
    securityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    securityTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 12,
    },
    securityDescription: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    // Settings Card Styles
    settingsCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    settingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    settingsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 12,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    settingInfo: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 14,
        color: '#6b7280',
    },
    settingDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 8,
    },
    // Data Card Styles
    dataCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    dataHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dataTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 12,
    },
    dataItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    dataItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dataItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1f2937',
        marginLeft: 12,
    },
    dataDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 8,
    },
    // About Card Styles
    aboutCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    aboutHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    aboutTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 12,
    },
    aboutText: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
});

