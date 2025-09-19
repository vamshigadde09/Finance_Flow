import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabView } from 'react-native-tab-view';
import ContactsSection from './TransactionSections/ContactsSection';
import SplitSection from './TransactionSections/SplitSection';
import PersonalSection from './TransactionSections/PersonalSection';
import TransactionResultScreen from './TransactionSections/TransactionResultScreen';

const initialLayout = { width: Dimensions.get('window').width };

const TransactionScreen = ({ navigation }) => {
    // Shared state
    const [contact, setContact] = useState(null);
    const [splitWith, setSplitWith] = useState([]);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [receipt, setReceipt] = useState(null);



    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'personal', title: 'Personal' },
        { key: 'Contacts', title: 'Contacts' },
        { key: 'split', title: 'Split' },
    ]);

    // Transaction Result Screen State
    const [showResultScreen, setShowResultScreen] = useState(false);
    const [resultType, setResultType] = useState('success');
    const [resultData, setResultData] = useState({});

    // Callback functions for child sections
    const showTransactionResult = (type, data) => {
        setResultType(type);
        setResultData(data);
        setShowResultScreen(true);
    };

    const renderScene = ({ route }) => {
        switch (route.key) {
            case 'personal':
                return (
                    <PersonalSection
                        title={title}
                        setTitle={setTitle}
                        amount={amount}
                        setAmount={setAmount}
                        category={category}
                        setCategory={setCategory}
                        description={description}
                        setDescription={setDescription}
                        receipt={receipt}
                        setReceipt={setReceipt}
                        onShowResult={showTransactionResult}
                        navigation={navigation}
                    />
                );
            case 'Contacts':
                return (
                    <ContactsSection
                        contact={contact}
                        setContact={setContact}
                        title={title}
                        setTitle={setTitle}
                        amount={amount}
                        setAmount={setAmount}
                        category={category}
                        setCategory={setCategory}
                        description={description}
                        setDescription={setDescription}
                        receipt={receipt}
                        setReceipt={setReceipt}
                        onShowResult={showTransactionResult}
                        navigation={navigation}
                    />
                );
            case 'split':
                return (
                    <SplitSection
                        splitWith={splitWith}
                        setSplitWith={setSplitWith}
                        title={title}
                        setTitle={setTitle}
                        amount={amount}
                        setAmount={setAmount}
                        category={category}
                        setCategory={setCategory}
                        description={description}
                        setDescription={setDescription}
                        receipt={receipt}
                        setReceipt={setReceipt}
                        onShowResult={showTransactionResult}
                        navigation={navigation}
                    />
                );
            default:
                return null;
        }
    };

    // Custom pill-shaped tab bar
    const renderTabBar = (props) => (
        <View style={styles.tabBarContainer}>
            <View style={styles.tabBarPill}>
                {props.navigationState.routes.map((route, i) => {
                    const focused = props.navigationState.index === i;
                    return (
                        <TouchableOpacity
                            key={route.key}
                            style={[styles.tabItem, focused && styles.tabItemActive]}
                            onPress={() => props.jumpTo(route.key)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, focused ? styles.tabTextActive : styles.tabTextInactive]}>
                                {route.title}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <View style={styles.root}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#222" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Transaction</Text>
            </View>
            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={initialLayout}
                renderTabBar={renderTabBar}
                style={{ backgroundColor: '#f7f7fa' }}
            />

            {/* Transaction Result Screen */}
            <TransactionResultScreen
                visible={showResultScreen}
                type={resultType}
                title={resultData.title}
                subtitle={resultData.subtitle}
                amount={resultData.amount}
                transactionId={resultData.transactionId}
                bankAccount={resultData.bankAccount}
                category={resultData.category}
                groupName={resultData.groupName}
                contactName={resultData.contactName}
                onClose={() => setShowResultScreen(false)}
                onViewDetails={() => {
                    setShowResultScreen(false);
                    // Navigate to transaction details
                }}
                onShare={() => {
                    // Share transaction details
                    console.log('Sharing transaction details');
                }}
                onHome={() => {
                    setShowResultScreen(false);
                    navigation.navigate('HomePage');
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f7f7fa' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: '10%',
        paddingBottom: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ececec',
    },
    backBtn: { marginRight: 10, padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#222' },
    tabBarContainer: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 8,
        backgroundColor: '#f7f7fa',
    },
    tabBarPill: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 24,
        padding: 4,
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 18,
        marginHorizontal: 4,
    },
    tabItemActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        borderRadius: 18,
    },
    tabText: {
        fontWeight: '600',
        fontSize: 16,
        letterSpacing: 0.1,
    },
    tabTextActive: {
        color: '#222',
    },
    tabTextInactive: {
        color: '#888',
    },
});

export default TransactionScreen;

