import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    Button,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Modal
} from "react-native";
import * as Contacts from "expo-contacts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../api';

const CreateSplitGroup = () => {
    const [contacts, setContacts] = useState([]);
    const [filteredContacts, setFilteredContacts] = useState([]);
    const [selected, setSelected] = useState([]);
    const [groupName, setGroupName] = useState("");
    const [searchText, setSearchText] = useState("");
    const [registeredContacts, setRegisteredContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [skeletonAnim] = useState(new Animated.Value(0));
    const [successModal, setSuccessModal] = useState({ visible: false, addedMembers: [] });

    const navigation = useNavigation();
    const route = useRoute();

    // Get group data from route params (if adding members to existing group)
    const existingGroup = route.params?.groupData;
    const existingMembers = route.params?.members || [];
    const isAddingMembers = !!existingGroup;

    // Initialize group name when adding members to existing group
    useEffect(() => {
        if (isAddingMembers && existingGroup) {
            setGroupName(existingGroup.name);

            // 2. Show present registered and present in group
            console.log("=== EXISTING GROUP MEMBERS ===");
            console.log("Group name:", existingGroup.name);
            console.log("Total existing members:", existingMembers.length);
            console.log("Existing members:", existingMembers.map(member => ({
                name: member.name,
                phoneNumber: member.phoneNumber,
                _id: member._id
            })));

            // Check if phone numbers are properly received
            const membersWithPhoneNumbers = existingMembers.filter(member => member.phoneNumber);
            console.log("Members with phone numbers:", membersWithPhoneNumbers.length);
            console.log("Members without phone numbers:", existingMembers.length - membersWithPhoneNumbers.length);
        }
    }, [isAddingMembers, existingGroup, existingMembers]);


    // Skeleton animation effect
    useEffect(() => {
        const startSkeletonAnimation = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(skeletonAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(skeletonAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        if (isLoading) {
            startSkeletonAnimation();
        }
    }, [isLoading, skeletonAnim]);

    useEffect(() => {
        const loadContacts = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Request contacts permission
                const { status } = await Contacts.requestPermissionsAsync();
                if (status !== "granted") {
                    throw new Error("Contacts permission not granted");
                }

                // Get contacts
                const { data } = await Contacts.getContactsAsync({
                    fields: [
                        Contacts.Fields.PhoneNumbers,
                        Contacts.Fields.Name,
                        Contacts.Fields.Image,
                        Contacts.Fields.ImageAvailable
                    ],
                });

                // Filter valid contacts
                const validContacts = data.filter(
                    (c) => c.phoneNumbers && c.phoneNumbers.length > 0 && c.name
                );

                // Process contacts to ensure image data is properly structured
                let processedContacts = validContacts.map(contact => ({
                    ...contact,
                    imageAvailable: contact.imageAvailable || false,
                    image: contact.imageAvailable ? {
                        uri: contact.image.uri
                    } : null
                }));

                // If adding members to existing group, filter out existing members
                if (isAddingMembers && existingMembers.length > 0) {
                    const existingMemberPhones = existingMembers.map(member =>
                        member.phoneNumber?.replace(/\D/g, "").slice(-10)
                    );

                    console.log("=== FILTERING OUT EXISTING MEMBERS ===");
                    console.log("Existing member phone numbers (last 10 digits):", existingMemberPhones);
                    console.log("Contacts before filtering:", processedContacts.length);

                    processedContacts = processedContacts.filter(contact => {
                        if (!contact.phoneNumbers?.[0]?.number) return true;
                        const contactPhone = contact.phoneNumbers[0].number.replace(/\D/g, "").slice(-10);
                        const isExisting = existingMemberPhones.includes(contactPhone);
                        if (isExisting) {
                            console.log(`Filtering out existing member: ${contact.name} (${contactPhone})`);
                        }
                        return !isExisting;
                    });

                    console.log("Contacts after filtering:", processedContacts.length);
                }

                setContacts(processedContacts);
                await fetchAllUsers();

                // 3. Show what members is seen by user (after filtering)
                console.log("=== CONTACTS SEEN BY USER ===");
                console.log("Total contacts after filtering:", processedContacts.length);

            } catch (err) {
                console.error("Error loading contacts:", err);
                setError(err.message || "Failed to load contacts");
            } finally {
                setIsLoading(false);
            }
        };

        loadContacts();
    }, []);

    const fetchAllUsers = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                throw new Error("User session expired");
            }

            const user = JSON.parse(userData);
            const response = await axios.get(`${API_BASE_URL}/api/v1/user/usersdata`, {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            });

            // Extract phone numbers from all users
            const userPhoneNumbers = response.data.users.map(
                (user) => user.phoneNumber
            );

            // 1. Print all registered phone numbers that user can see
            console.log("=== ALL REGISTERED PHONE NUMBERS ===");
            console.log("Total registered users:", userPhoneNumbers.length);
            console.log("Registered phone numbers:", userPhoneNumbers);

            setRegisteredContacts(userPhoneNumbers);
        } catch (error) {
            console.error("Error fetching users:", {
                url: error.config?.url,
                status: error.response?.status,
                message: error.message,
            });

            if (error.response?.status === 401) {
                Alert.alert("Session Expired", "Please login again", [
                    { text: "OK", onPress: () => navigation.navigate("Login") }
                ]);
            } else {
                setError("Could not fetch registered users");
            }
        }
    };

    const displayContacts = useMemo(() => {
        return contacts
            .filter(c => c.name && c.phoneNumbers?.[0]?.number)
            .map(c => {
                const digits = c.phoneNumbers[0].number.replace(/\D/g, "").slice(-10);
                return {
                    ...c,
                    normalized: digits,
                    normalizedWithPrefix: `+91${digits}`
                };
            })
            .filter(c =>
                registeredContacts.includes(c.normalized) ||
                registeredContacts.includes(c.normalizedWithPrefix)
            );
    }, [contacts, registeredContacts]);


    const getDisplayContacts = () => {
        const displayContacts = contacts.filter((contact) => {
            if (!contact.phoneNumbers?.[0]?.number) return false;

            const digits = contact.phoneNumbers[0].number.replace(/\D/g, "");
            const last10 = digits.slice(-10);

            // Check if contact is registered
            return registeredContacts.includes(last10) ||
                registeredContacts.includes(`+91${last10}`);
        });

        console.log("=== DISPLAY CONTACTS (REGISTERED ONLY) ===");
        console.log("Total display contacts:", displayContacts.length);
        console.log("Display contacts:", displayContacts.map(contact => ({
            name: contact.name,
            phoneNumber: contact.phoneNumbers?.[0]?.number,
            id: contact.id
        })));

        return displayContacts;
    };

    const handleCreateGroup = async () => {
        try {
            setIsLoading(true);

            const userData = await AsyncStorage.getItem("userData");
            if (!userData) {
                throw new Error("User session expired");
            }

            const user = JSON.parse(userData);
            if (!user?._id) {
                throw new Error("Invalid user data");
            }

            if (selected.length === 0) {
                throw new Error("No contacts selected");
            }

            if (!isAddingMembers && !groupName.trim()) {
                throw new Error("Group name required");
            }

            if (isAddingMembers) {
                // Adding members to existing group
                // Since we filtered out existing members from the contact list,
                // all selected contacts are new members
                if (selected.length === 0) {
                    Alert.alert("Info", "Please select contacts to add to the group.");
                    setIsLoading(false);
                    return;
                }

                // Get contact details for selected members
                const newMemberContacts = contacts.filter(contact =>
                    selected.some(selectedContact => selectedContact.id === contact.id)
                );

                const response = await axios.post(
                    `${API_BASE_URL}/api/v1/splits/add-members`,
                    {
                        groupId: existingGroup._id,
                        newMembers: newMemberContacts.map(contact => ({
                            name: contact.name,
                            phoneNumber: contact.phoneNumbers[0].number.replace(/\D/g, "").slice(-10),
                            avatar: contact.imageAvailable && contact.image ? contact.image.uri : null
                        }))
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${user.token}`,
                        },
                    }
                );

                if (response.data.success) {
                    setSuccessModal({
                        visible: true,
                        addedMembers: newMemberContacts.map(contact => ({
                            name: contact.name,
                            phoneNumber: contact.phoneNumbers[0].number,
                            avatar: contact.imageAvailable && contact.image ? contact.image.uri : null
                        }))
                    });
                } else {
                    throw new Error(response.data.message || "Failed to add members");
                }
            } else {
                // Creating new group
                // Prepare phone numbers
                const phoneNumbers = selected
                    .map((contact) => {
                        if (!contact.phoneNumbers?.[0]?.number) return null;
                        const digits = contact.phoneNumbers[0].number.replace(/\D/g, "");
                        const last10 = digits.slice(-10);
                        return last10.length === 10 ? last10 : null;
                    })
                    .filter(Boolean);

                const response = await axios.post(
                    `${API_BASE_URL}/api/v1/splits/create-group`,
                    {
                        name: groupName,
                        phoneNumbers,
                        createdBy: user._id,
                        members: selected.map(contact => ({
                            name: contact.name,
                            phoneNumber: contact.phoneNumbers[0].number.replace(/\D/g, "").slice(-10),
                            avatar: contact.imageAvailable && contact.image ? contact.image.uri : null
                        }))
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${user.token}`,
                        },
                    }
                );

                if (response.data.success) {
                    Alert.alert("Success", "Group created successfully!", [
                        {
                            text: "OK",
                            onPress: () => navigation.goBack()
                        }
                    ]);
                } else {
                    throw new Error(response.data.message || "Failed to create group");
                }
            }
        } catch (error) {
            console.error("Error:", error);
            Alert.alert(
                "Error",
                error.response?.data?.message || error.message || "Operation failed"
            );
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelect = useCallback((contact) => {
        setSelected(prev =>
            prev.some(c => c.id === contact.id)
                ? prev.filter(c => c.id !== contact.id)
                : [...prev, contact]
        );
    }, []);


    const handleSearch = (text) => {
        setSearchText(text);
        const lower = text.toLowerCase();
        const filtered = getDisplayContacts().filter((c) =>
            c.name.toLowerCase().includes(lower)
        );
        setFilteredContacts(filtered);
    };

    const renderContactItem = useCallback(({ item }) => {
        const isSelected = selected.some(c => c.id === item.id);

        return (
            <TouchableOpacity
                onPress={() => toggleSelect(item)}
                style={[
                    styles.contactItem,
                    isSelected && styles.selectedContact,
                ]}
            >
                <View style={styles.contactInfo}>
                    {item.imageAvailable && item.image ? (
                        <Image
                            source={{ uri: item.image.uri }}
                            style={styles.contactAvatar}
                        />
                    ) : (
                        <View style={styles.contactAvatarPlaceholder}>
                            <Text style={styles.contactAvatarText}>
                                {item.name?.charAt(0)?.toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.contactDetails}>
                        <Text style={styles.contactName}>{item.name}</Text>
                        <Text style={styles.contactNumber}>{item.phoneNumbers?.[0]?.number || "N/A"}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [selected]);

    const renderSelectedContact = (contact) => (
        <View key={contact.id} style={styles.selectedItem}>
            <Text style={styles.selectedText}>
                {contact.name?.split(" ")[0] || "N/A"}
            </Text>
        </View>
    );

    // Skeleton loading component
    const SkeletonContactItem = () => (
        <View style={styles.skeletonContactItem}>
            <Animated.View
                style={[
                    styles.skeletonAvatar,
                    {
                        opacity: skeletonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 0.7],
                        }),
                    }
                ]}
            />
            <View style={styles.skeletonContactDetails}>
                <Animated.View
                    style={[
                        styles.skeletonName,
                        {
                            opacity: skeletonAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 0.7],
                            }),
                        }
                    ]}
                />
                <Animated.View
                    style={[
                        styles.skeletonNumber,
                        {
                            opacity: skeletonAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 0.7],
                            }),
                        }
                    ]}
                />
            </View>
        </View>
    );

    const SkeletonLoading = () => (
        <View style={styles.skeletonContainer}>
            <Animated.View
                style={[
                    styles.skeletonGroupName,
                    {
                        opacity: skeletonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 0.7],
                        }),
                    }
                ]}
            />
            <Animated.View
                style={[
                    styles.skeletonSearchBar,
                    {
                        opacity: skeletonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 0.7],
                        }),
                    }
                ]}
            />
            <View style={styles.skeletonContactsList}>
                {[1, 2, 3, 4, 5, 6].map((index) => (
                    <SkeletonContactItem key={index} />
                ))}
            </View>
        </View>
    );

    if (error) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Button
                        title="Try Again"
                        onPress={() => {
                            setError(null);
                            setIsLoading(true);
                            fetchAllUsers();
                        }}
                    />
                </View>
            </SafeAreaView>
        );
    }

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <SkeletonLoading />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.header}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isAddingMembers ? `Add Members to ${existingGroup?.name || 'Group'}` : 'Create Split Group'}
                </Text>
                <View style={styles.headerSpacer} />
            </LinearGradient>

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.container}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                        <TextInput
                            placeholder="Search Contacts"
                            value={searchText}
                            onChangeText={handleSearch}
                            style={styles.searchInput}
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    {selected.length > 0 && (
                        <View style={styles.selectedSection}>
                            <Text style={styles.selectedSectionTitle}>Selected ({selected.length})</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.selectedBar}
                                contentContainerStyle={styles.selectedBarContent}
                            >
                                {selected.map(renderSelectedContact)}
                            </ScrollView>
                        </View>
                    )}

                    <FlatList
                        data={searchText ? filteredContacts : getDisplayContacts()}
                        keyExtractor={(item) => item.id}
                        renderItem={renderContactItem}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    {isAddingMembers ?
                                        "No new contacts available to add to this group" :
                                        "No contacts found"
                                    }
                                </Text>
                            </View>
                        }
                    />

                </View>

                <View style={styles.bottomSheet}>
                    {!isAddingMembers && (
                        <View style={styles.groupInputContainer}>
                            <Ionicons name="people" size={20} color="#8b5cf6" style={styles.groupInputIcon} />
                            <TextInput
                                placeholder="Enter group name"
                                value={groupName}
                                onChangeText={setGroupName}
                                style={styles.groupInput}
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                    )}


                    <TouchableOpacity
                        style={[
                            styles.createButton,
                            ((!isAddingMembers && !groupName) || selected.length === 0 || isLoading) && styles.createButtonDisabled
                        ]}
                        onPress={handleCreateGroup}
                        disabled={((!isAddingMembers && !groupName) || selected.length === 0 || isLoading)}
                    >
                        <LinearGradient
                            colors={((!isAddingMembers && !groupName) || selected.length === 0 || isLoading) ? ['#9ca3af', '#6b7280'] : ['#8b5cf6', '#7c3aed']}
                            style={styles.createButtonGradient}
                        >
                            <Ionicons name="add-circle" size={20} color="#fff" />
                            <Text style={styles.createButtonText}>
                                {isAddingMembers ? `Add Members (${selected.length})` : `Create Group (${selected.length})`}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Success Modal */}
            <Modal
                visible={successModal.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setSuccessModal({ visible: false, addedMembers: [] })}
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successModalContainer}>
                        <View style={styles.successModalHeader}>
                            <View style={styles.successModalIconContainer}>
                                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                            </View>
                            <Text style={styles.successModalTitle}>Members Added Successfully!</Text>
                            <Text style={styles.successModalSubtitle}>
                                {successModal.addedMembers.length} member{successModal.addedMembers.length !== 1 ? 's' : ''} added to "{groupName}"
                            </Text>
                        </View>

                        <View style={styles.successModalContent}>
                            <Text style={styles.successModalMembersTitle}>Added Members:</Text>
                            <ScrollView
                                style={styles.successModalMembersList}
                                showsVerticalScrollIndicator={false}
                            >
                                {successModal.addedMembers.map((member, index) => (
                                    <View key={index} style={styles.successModalMemberItem}>
                                        <View style={styles.successModalMemberAvatar}>
                                            {member.avatar ? (
                                                <Image source={{ uri: member.avatar }} style={styles.successModalMemberImage} />
                                            ) : (
                                                <Ionicons name="person" size={20} color="#8b5cf6" />
                                            )}
                                        </View>
                                        <View style={styles.successModalMemberInfo}>
                                            <Text style={styles.successModalMemberName}>{member.name}</Text>
                                            <Text style={styles.successModalMemberPhone}>{member.phoneNumber}</Text>
                                        </View>
                                        <View style={styles.successModalMemberCheck}>
                                            <Ionicons name="checkmark" size={16} color="#10b981" />
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.successModalButtons}>
                            <TouchableOpacity
                                style={styles.successModalButton}
                                onPress={() => {
                                    setSuccessModal({ visible: false, addedMembers: [] });
                                    navigation.goBack();
                                }}
                            >
                                <Text style={styles.successModalButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
    },
    headerSpacer: {
        width: 40,
    },
    container: {
        flex: 1,
        padding: 20,
        paddingBottom: 0,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
        paddingHorizontal: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: '#1f2937',
    },
    selectedSection: {
        marginBottom: 20,
    },
    selectedSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    selectedBar: {
        marginBottom: 0,
    },
    selectedBarContent: {
        paddingVertical: 4,
    },
    selectedItem: {
        backgroundColor: '#8b5cf6',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    selectedText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    contactInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    contactAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 16,
    },
    contactAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#8b5cf6',
        marginRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    contactAvatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    contactDetails: {
        flex: 1,
    },
    contactItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    selectedContact: {
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        borderColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    contactNumber: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    bottomSheet: {
        backgroundColor: '#fff',
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        minHeight: 120,
    },
    groupInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        marginBottom: 20,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
    },
    groupInputIcon: {
        marginRight: 12,
    },
    groupInput: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: '#1f2937',
    },
    createButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    createButtonDisabled: {
        shadowOpacity: 0.1,
        elevation: 2,
    },
    createButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '500',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8fafc',
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
        fontWeight: '500',
    },
    // Skeleton Loading Styles
    skeletonContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8fafc',
    },
    skeletonGroupName: {
        height: 50,
        backgroundColor: '#e5e7eb',
        borderRadius: 12,
        marginBottom: 20,
    },
    skeletonSearchBar: {
        height: 45,
        backgroundColor: '#e5e7eb',
        borderRadius: 12,
        marginBottom: 20,
    },
    skeletonContactsList: {
        flex: 1,
    },
    skeletonContactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    skeletonAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#e5e7eb',
        marginRight: 16,
    },
    skeletonContactDetails: {
        flex: 1,
    },
    skeletonName: {
        height: 16,
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
        marginBottom: 8,
        width: '60%',
    },
    skeletonNumber: {
        height: 14,
        backgroundColor: '#e5e7eb',
        borderRadius: 7,
        width: '40%',
    },
    // Success Modal Styles
    successModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successModalContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    successModalHeader: {
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
    },
    successModalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    successModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    successModalSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    successModalContent: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        flex: 1,
    },
    successModalMembersTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    successModalMembersList: {
        maxHeight: 200,
    },
    successModalMemberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    successModalMemberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    successModalMemberImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    successModalMemberInfo: {
        flex: 1,
    },
    successModalMemberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    successModalMemberPhone: {
        fontSize: 14,
        color: '#6b7280',
    },
    successModalMemberCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successModalButtons: {
        padding: 24,
        paddingTop: 16,
    },
    successModalButton: {
        backgroundColor: '#10b981',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successModalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
});

export default CreateSplitGroup;