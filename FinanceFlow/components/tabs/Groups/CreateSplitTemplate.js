import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, StatusBar, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../../api';

const CATEGORIES = [
    "Housing",
    "Groceries",
    "Dining",
    "Transport",
    "Travel",
    "Entertainment",
    "Coffee", "Health", "Work", "Utilities", "Gifts", "Other"];
const SPLIT_TYPES = [
    { key: 'even', label: 'Split Equally' },
    { key: 'custom', label: 'Custom Split' }
];

const CreateSplitTemplate = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const groupId = route.params?.groupData?._id;
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [amount, setAmount] = useState("");
    const [splitType, setSplitType] = useState("even");
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showSplitTypeDropdown, setShowSplitTypeDropdown] = useState(false);
    const [description, setDescription] = useState("");
    const [note, setNote] = useState("");
    const members = route.params?.members || [];
    const [selectedMembers, setSelectedMembers] = useState(members.map(m => m._id));
    const [newTemplate, setNewTemplate] = useState({
        name: "",
        description: "",
        category: "Other",
        notes: "",
        splitType: "even",
        group: groupId,
        isDefault: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const toggleMember = (id) => {
        setSelectedMembers(prev =>
            prev.includes(id)
                ? prev.filter(mid => mid !== id)
                : [...prev, id]
        );
    };

    const handleCreateTemplate = useCallback(async () => {
        try {
            // Gather all form values
            const payload = {
                name: title,
                description,
                amount: amount ? parseFloat(amount) : 0,
                category: category || "Other",
                notes: note,
                splitType,
                group: groupId,
                isDefault: false,
                splitBetween: selectedMembers
            };


            if (!title.trim()) {
                Alert.alert("Error", "Template name is required");
                return;
            }
            if (!payload.group) {
                Alert.alert("Error", "Group is required");
                return;
            }
            if (!payload.splitBetween || payload.splitBetween.length === 0) {
                Alert.alert("Error", "Select at least one group member");
                return;
            }

            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                navigation.navigate("Login");
                return;
            }

            const response = await axios.post(
                `${API_BASE_URL}/api/v1/templates/create-template`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setShowSuccessModal(true);
                // Reset form after a short delay
                setTimeout(() => {
                    setNewTemplate({
                        name: "",
                        description: "",
                        category: "Other",
                        notes: "",
                        splitType: "even",
                        group: groupId,
                        isDefault: false,
                    });
                    setTitle("");
                    setDescription("");
                    setAmount("");
                    setCategory("");
                    setNote("");
                    setSplitType("even");
                    setSelectedMembers(members.map(m => m._id));
                    setShowSuccessModal(false);
                    navigation.goBack();
                }, 2000);
            }
        } catch (error) {
            console.error("Template creation error:", error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to create template";
            Alert.alert("Error", errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [title, description, amount, category, note, splitType, groupId, selectedMembers, members]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Enhanced Header with Gradient */}
            <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={24} color="#8b5cf6" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={styles.headerIconContainer}>
                            <Ionicons name="add-circle" size={20} color="#8b5cf6" />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Create Template</Text>
                            <Text style={styles.headerSubtitle}>New split template</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.formContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.formSection}>
                    <Text style={styles.label}>Template Title</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Monthly Dinner, Weekend Groceries"
                        value={title}
                        onChangeText={setTitle}
                        placeholderTextColor="#9ca3af"
                    />
                    <Text style={styles.inputHint}>Give your template a clear, descriptive name.</Text>
                </View>

                <View style={styles.formSection}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Category</Text>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            >
                                <Text style={{ color: category ? '#1f2937' : '#9ca3af', fontWeight: '500' }}>
                                    {category || 'Select category'}
                                </Text>
                                <Ionicons name="chevron-down" size={18} color="#8b5cf6" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.label}>Amount</Text>
                            <View style={styles.amountRow}>
                                <Text style={styles.amountPrefix}>₹</Text>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="0.00"
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.formSection}>
                    <Text style={styles.label}>Split Type</Text>
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => setShowSplitTypeDropdown(!showSplitTypeDropdown)}
                    >
                        <Text style={{ color: '#1f2937', fontWeight: '500' }}>{SPLIT_TYPES.find(st => st.key === splitType)?.label || 'Select split type'}</Text>
                        <Ionicons name="chevron-down" size={18} color="#8b5cf6" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                </View>

                {/* Split Type Dropdown Modal */}
                <Modal
                    visible={showSplitTypeDropdown}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowSplitTypeDropdown(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowSplitTypeDropdown(false)}
                    >
                        <View style={styles.modalDropdown}>
                            {SPLIT_TYPES.map(st => (
                                <TouchableOpacity
                                    key={st.key}
                                    style={styles.modalDropdownItem}
                                    onPress={() => {
                                        setSplitType(st.key);
                                        setShowSplitTypeDropdown(false);
                                    }}
                                >
                                    <Text style={styles.modalDropdownItemText}>{st.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Category Dropdown Modal */}
                <Modal
                    visible={showCategoryDropdown}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowCategoryDropdown(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowCategoryDropdown(false)}
                    >
                        <View style={styles.modalDropdown}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={styles.modalDropdownItem}
                                    onPress={() => {
                                        setCategory(cat);
                                        setShowCategoryDropdown(false);
                                    }}
                                >
                                    <Text style={styles.modalDropdownItemText}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Description Field */}
                <View style={styles.formSection}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={styles.textarea}
                        placeholder="Add a description (optional)"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Note Field */}
                <View style={styles.formSection}>
                    <Text style={styles.label}>Note</Text>
                    <TextInput
                        style={styles.textarea}
                        placeholder="Add a note (optional)"
                        value={note}
                        onChangeText={setNote}
                        multiline
                        numberOfLines={2}
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Group Members Section */}
                <View style={styles.formSection}>
                    <Text style={styles.label}>Group Members</Text>
                    <View style={styles.membersContainer}>
                        {members.map(member => (
                            <TouchableOpacity
                                key={member._id}
                                style={styles.memberRow}
                                activeOpacity={0.8}
                                onPress={() => toggleMember(member._id)}
                            >
                                <View style={selectedMembers.includes(member._id) ? styles.checkboxSelected : styles.checkboxUnselected}>
                                    {selectedMembers.includes(member._id) && (
                                        <Ionicons name="checkmark" size={18} color="#fff" style={{ alignSelf: 'center' }} />
                                    )}
                                </View>
                                <Text style={styles.memberName}>{member.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreateTemplate}>
                    <Text style={styles.saveBtnText}>Save Template</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successModal}>
                        <View style={styles.successIconContainer}>
                            <Ionicons name="checkmark-circle" size={80} color="#10b981" />
                        </View>
                        <Text style={styles.successTitle}>Success!</Text>
                        <Text style={styles.successMessage}>Template created successfully</Text>
                        <View style={styles.successDetails}>
                            <Text style={styles.successDetailText}>Your template has been saved and is ready to use</Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
    },
    headerGradient: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backButton: {
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
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
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    headerTextContainer: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1f2937',
        letterSpacing: 0.5,
        marginBottom: 6,
        lineHeight: 26,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#8b5cf6',
        fontWeight: '600',
        letterSpacing: 0.3,
        backgroundColor: '#f3e8ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e9d5ff',
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    formContainer: {
        paddingBottom: 40,
    },
    formSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    label: {
        fontWeight: '700',
        fontSize: 15,
        marginBottom: 8,
        color: '#1f2937',
        letterSpacing: 0.3,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        fontSize: 16,
        marginBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    inputHint: {
        color: '#6b7280',
        fontSize: 13,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        justifyContent: 'space-between',
        marginBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalDropdown: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 40,
        maxHeight: 300,
        minWidth: 250,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    modalDropdownItem: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        backgroundColor: '#fff',
    },
    modalDropdownItemText: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '500',
        textAlign: 'center',
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    amountPrefix: {
        fontSize: 18,
        color: '#6b7280',
        marginRight: 8,
        fontWeight: '600',
    },
    amountInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 16,
        color: '#1f2937',
        fontWeight: '500',
    },
    textarea: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 16,
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    membersContainer: {
        marginTop: 8,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    checkboxSelected: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
    },
    checkboxUnselected: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#d1d5db',
    },
    memberName: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '600',
    },
    saveBtn: {
        backgroundColor: '#8b5cf6',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
        letterSpacing: 0.3,
    },
    successModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successModal: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 32,
        marginHorizontal: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 12,
        minWidth: 280,
        maxWidth: 320,
    },
    successIconContainer: {
        marginBottom: 20,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1f2937',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    successMessage: {
        fontSize: 16,
        fontWeight: '600',
        color: '#10b981',
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    successDetails: {
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    successDetailText: {
        fontSize: 14,
        color: '#065f46',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 20,
    },
});

export default CreateSplitTemplate;