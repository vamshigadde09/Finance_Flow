import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    Alert,
    Image,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Animated,
    SafeAreaView
} from "react-native";
import * as Contacts from "expo-contacts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../../api';

const AllContacts = ({ navigation }) => {
    const [allContacts, setAllContacts] = useState([]);
    const [registeredContacts, setRegisteredContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [pulseAnim] = useState(new Animated.Value(1));

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all device contacts
                const { status } = await Contacts.requestPermissionsAsync();
                if (status === "granted") {
                    const { data } = await Contacts.getContactsAsync({
                        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
                    });

                    const sortedContacts = data.sort((a, b) =>
                        (a.name || "").localeCompare(b.name || "")
                    );
                    setAllContacts(sortedContacts);
                } else {
                    Alert.alert("Permission Denied", "Please enable contacts permission.");
                }

                // Fetch registered users
                await fetchRegisteredUsers();
            } catch (error) {
                console.error("Error fetching data:", error);
                Alert.alert("Error", "Failed to load contacts");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            // When searching, show all contacts that match the search
            const filtered = allContacts.filter(contact =>
            (contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contact.phoneNumbers?.[0]?.number?.includes(searchQuery))
            );
            setFilteredContacts(filtered);
        } else {
            // When not searching, show only registered contacts
            const registeredOnly = allContacts.filter(contact =>
                isRegisteredContact(contact)
            );
            setFilteredContacts(registeredOnly);
        }
    }, [searchQuery, allContacts, registeredContacts]);

    useEffect(() => {
        const pulseAnimation = Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.2,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
        ]);

        Animated.loop(pulseAnimation).start();
    }, []);

    const fetchRegisteredUsers = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                Alert.alert("Session Expired", "Please login again");
                navigation.navigate("Login");
                return;
            }

            const user = JSON.parse(userData);
            const response = await axios.get(`${API_BASE_URL}/api/v1/user/usersdata`, {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            });

            // Normalize registered users' phone numbers to include +91 prefix
            const registeredPhoneNumbers = response.data.users.map(user => {
                const normalizedNumber = user.phoneNumber.replace(/\D/g, "");
                const last10 = normalizedNumber.slice(-10);
                return `+91${last10}`;
            });
            setRegisteredContacts(registeredPhoneNumbers);

            // Set initial filtered contacts to registered only
            const registeredOnly = allContacts.filter(contact =>
                isRegisteredContact(contact)
            );
            setFilteredContacts(registeredOnly);
        } catch (error) {
            console.error("Error fetching registered users:", {
                url: error.config?.url,
                status: error.response?.status,
                serverResponse: error.response?.data,
            });
            Alert.alert("Error", "Could not fetch registered users");
        }
    };

    const isRegisteredContact = (contact) => {
        if (!contact.phoneNumbers?.[0]?.number) return false;

        // Convert contact number to the same format as in DB (+911234567890)
        const digits = contact.phoneNumbers[0].number.replace(/\D/g, "");
        const last10 = digits.slice(-10);
        const normalizedContactNumber = `+91${last10}`;

        // Check if this number exists in the registered contacts
        return registeredContacts.includes(normalizedContactNumber);
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.contactItem}
            onPress={() => navigation.navigate("ContactTransactionChat", { contact: item })}
            activeOpacity={0.7}
        >
            <View style={styles.contactContent}>
                {item.imageAvailable && item.image ? (
                    <Image source={{ uri: item.image.uri }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                        </Text>
                    </View>
                )}

                <View style={styles.contactInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{item.name || "Unnamed"}</Text>
                        {isRegisteredContact(item) && (
                            <View style={styles.statusContainer}>
                                <Animated.View
                                    style={[
                                        styles.statusDot,
                                        { transform: [{ scale: pulseAnim }] }
                                    ]}
                                />
                                <Text style={styles.statusText}>Active</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.phone}>
                        {item.phoneNumbers?.[0]?.number || "No number"}
                    </Text>
                </View>

                <View style={styles.contactActions}>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <View style={styles.loadingContent}>
                    <View style={styles.loadingIcon}>
                        <Ionicons name="people-outline" size={48} color="#8b5cf6" />
                    </View>
                    <ActivityIndicator size="large" color="#8b5cf6" style={styles.loadingSpinner} />
                    <Text style={styles.loadingText}>Loading contacts...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Enhanced Header with Gradient */}
            <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={24} color="#8b5cf6" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={styles.headerIconContainer}>
                            <Ionicons name="people" size={20} color="#8b5cf6" />
                        </View>
                        <Text style={styles.headerTitle}>Contacts</Text>
                    </View>
                    {/* <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="ellipsis-vertical" size={24} color="#8b5cf6" />
                    </TouchableOpacity> */}
                </View>
            </LinearGradient>

            <View style={styles.content}>
                <View style={styles.searchContainer}>
                    <View style={styles.searchIcon}>
                        <Ionicons name="search" size={20} color="#8b5cf6" />
                    </View>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search contacts..."
                        placeholderTextColor="#9ca3af"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={() => setSearchQuery('')}
                        >
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={filteredContacts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Ionicons
                                    name={searchQuery ? "search-outline" : "people-outline"}
                                    size={48}
                                    color="#9ca3af"
                                />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {searchQuery ? "No matching contacts" : "No registered contacts"}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery
                                    ? "Try adjusting your search terms"
                                    : "Only contacts using this app are shown here"
                                }
                            </Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
}

export default AllContacts;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#f7fafd',
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    loadingSpinner: {
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    headerGradient: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingTop: 50,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backButton: {
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    headerContent: {
        flex: 1,
        marginLeft: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1f2937',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#8b5cf6',
        marginTop: 0,
        fontWeight: '700',
        letterSpacing: 0.3,
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignSelf: 'flex-start',
    },
    menuButton: {
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    clearButton: {
        padding: 4,
    },
    listContainer: {
        paddingBottom: 20,
    },
    contactItem: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    contactContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#8b5cf6',
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#8b5cf6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    contactInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: 0.3,
        flex: 1,
    },
    phone: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0f2fe',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#8b5cf6',
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        color: '#8b5cf6',
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    contactActions: {
        marginLeft: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
        letterSpacing: 0.3,
    },
});