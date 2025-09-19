import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const Help = () => {
    const navigation = useNavigation();
    const [openIdx, setOpenIdx] = useState(null);
    const faqs = [
        {
            q: 'How do I create a group?',
            a: 'Go to Groups → tap the + button → enter a group name → add members → Create. You can invite later from the group screen as well.'
        },
        {
            q: 'How to set a primary bank?',
            a: 'Long‑press a bank card → Set as Primary → confirm. The primary account moves to the top and is used for default balances.'
        },
        {
            q: 'Report a problem',
            a: 'Email financeflowguru@gmail.com with screenshots and steps. We usually reply within 48 hours.'
        },
        {
            q: 'How do I add a bank account?',
            a: 'Profile → Bank Accounts → Add Bank Account. Fill bank name, type, balances and save. First account becomes primary automatically.'
        },
        {
            q: 'Export my data (CSV/JSON)?',
            a: 'Coming soon. For now, contact support at financeflowguru@gmail.com and we will share an export of your groups and transactions.'
        }
    ];
    return (
        <SafeAreaView style={styles.container}>
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
                            <Text style={styles.welcomeGreeting}>Help & Support</Text>
                            <Text style={styles.welcomeName}>Get help and support</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.welcomeDivider} />
            </View>



            {/* Content */}
            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Contact Card */}
                <View style={styles.contactCard}>
                    <LinearGradient
                        colors={['#f3e8ff', '#e9d5ff']}
                        style={styles.contactCardGradient}
                    >
                        <View style={styles.contactHeader}>
                            <Ionicons name="person-circle" size={32} color="#8b5cf6" />
                            <Text style={styles.contactTitle}>Contact Support</Text>
                        </View>
                        <View style={styles.contactInfo}>
                            <View style={styles.contactRow}>
                                <Ionicons name="person" size={20} color="#8b5cf6" />
                                <Text style={styles.contactText}>Vamshi Gadde</Text>
                            </View>
                            <View style={styles.contactRow}>
                                <Feather name="mail" size={20} color="#8b5cf6" />
                                <Text style={styles.contactText}>financeflowguru@gmail.com</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* FAQ Section */}
                <View style={styles.faqCard}>
                    <View style={styles.faqHeader}>
                        <Ionicons name="help-circle-outline" size={24} color="#8b5cf6" />
                        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
                    </View>
                    {faqs.map((item, idx) => (
                        <View key={idx} style={styles.faqItem}>
                            <TouchableOpacity
                                style={styles.faqQuestion}
                                activeOpacity={0.7}
                                onPress={() => setOpenIdx(openIdx === idx ? null : idx)}
                            >
                                <Text style={styles.faqQuestionText}>{item.q}</Text>
                                <Ionicons
                                    name={openIdx === idx ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color="#8b5cf6"
                                />
                            </TouchableOpacity>
                            {openIdx === idx && (
                                <View style={styles.faqAnswer}>
                                    <Text style={styles.faqAnswerText}>{item.a}</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Help;

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
    // Content Container
    contentContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    // Contact Card Styles
    contactCard: {
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    contactCardGradient: {
        padding: 20,
    },
    contactHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    contactTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 12,
    },
    contactInfo: {
        gap: 12,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    contactText: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '500',
    },
    // FAQ Card Styles
    faqCard: {
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
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    faqTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginLeft: 12,
    },
    faqItem: {
        marginBottom: 16,
    },
    faqQuestion: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    faqQuestionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginRight: 12,
    },
    faqAnswer: {
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f3e8ff',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#8b5cf6',
    },
    faqAnswerText: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
    },
});