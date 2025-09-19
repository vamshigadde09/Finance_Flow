import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Dimensions } from 'react-native';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../../../../api';
const { width } = Dimensions.get('window');
const itemSize = (width - 40) / 4; // 4 items per row with padding

const Contact = () => {
    const navigation = useNavigation();
    const [contacts, setContacts] = useState([]);
    const [registeredContacts, setRegisteredContacts] = useState([]);
    const [isLoading, setIsLoading] = useState({ contacts: true });

    const fetchRegisteredUsers = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                navigation.navigate("Login");
                return [];
            }

            const user = JSON.parse(userData);
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/user/usersdata`,
                {
                    headers: { Authorization: `Bearer ${user.token}` },
                }
            );

            const registeredPhoneNumbers = response.data.users.map(
                (user) => user.phoneNumber
            );
            setRegisteredContacts(registeredPhoneNumbers);
            return registeredPhoneNumbers;
        } catch (error) {
            console.error("Error fetching registered users:", error);
            return [];
        }
    };

    const fetchAndFilterContacts = async (registeredNumbers) => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Denied", "Please enable contacts permission.");
                return;
            }

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
            });

            const filteredContacts = data
                .filter((contact) => isContactRegistered(contact, registeredNumbers))
                .slice(0, 8);

            setContacts(filteredContacts);
        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            setIsLoading({ contacts: false });
        }
    };

    const isContactRegistered = (contact, registeredNumbers) => {
        if (!contact.phoneNumbers?.[0]?.number) return false;

        const digits = contact.phoneNumbers[0].number.replace(/\D/g, "");
        const last10 = digits.slice(-10);
        const normalizedNumber = `+91${last10}`;

        return registeredNumbers.includes(normalizedNumber);
    };

    useEffect(() => {
        const loadContacts = async () => {
            const registeredNumbers = await fetchRegisteredUsers();
            await fetchAndFilterContacts(registeredNumbers);
        };
        loadContacts();
    }, []);

    const renderItem = (contact, index) => {
        if (contact.isMoreButton) {
            return (
                <TouchableOpacity
                    key={`more-${index}`}
                    onPress={() => navigation.navigate("AllContactsScreen")}
                    style={styles.contactCard}
                >
                    <View style={styles.addContactCircle}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>+</Text>
                        </View>
                        <Text style={styles.contactName} numberOfLines={1}>
                            More
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                key={index}
                style={styles.contactCard}
                onPress={() => {

                    navigation.navigate("TransactionChatScreen", { contact });
                }}
            >
                {contact.imageAvailable && contact.image ? (
                    <Image
                        source={{ uri: contact.image.uri }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {contact.firstName
                                ? contact.firstName.charAt(0).toUpperCase()
                                : "?"}
                        </Text>
                    </View>
                )}
                <Text style={styles.contactName} numberOfLines={1}>
                    {contact.firstName || "Unnamed"}
                </Text>
            </TouchableOpacity>
        );
    };

    if (isLoading.contacts) {
        return (
            <View style={styles.contactsSkeleton}>
                {[...Array(8)].map((_, i) => (
                    <View key={i} style={styles.contactSkeleton} />
                ))}
            </View>
        );
    }

    const visibleContacts = contacts.slice(0, 7);
    const displayItems = [...visibleContacts];
    if (displayItems.length < 8) {
        displayItems.push({ isMoreButton: true });
    }

    const firstRow = displayItems.slice(0, 4);
    const secondRow = displayItems.slice(4, 8);

    return (
        <View style={styles.contactsContainer}>
            <View style={styles.contactsRow}>
                {firstRow.map(renderItem)}
            </View>
            <View style={styles.contactsRow}>
                {secondRow.map(renderItem)}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    contactsContainer: {
        paddingHorizontal: 10,
        paddingTop: 10,
    },
    contactsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },
    contactCard: {
        alignItems: "center",
        width: itemSize,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 5,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#ccc",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 5,
    },
    avatarText: {
        fontSize: 24,
        color: "#fff",
        fontWeight: "bold",
    },
    contactName: {
        fontSize: 12,
        textAlign: "center",
        maxWidth: itemSize,
    },
    addContactCircle: {
        alignItems: "center",
    },
    contactsSkeleton: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        padding: 10,
    },
    contactSkeleton: {
        width: itemSize,
        height: 90,
        backgroundColor: "#eee",
        borderRadius: 10,
        marginBottom: 15,
    },
});

export default Contact; 