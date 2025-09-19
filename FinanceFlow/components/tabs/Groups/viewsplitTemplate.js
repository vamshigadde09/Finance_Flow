import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../../../api';
const ViewSplitTemplate = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [templates, setTemplates] = useState([]);
    const groupId = route.params?.groupData?._id;
    const selectedTemplateId = route.params?.template?._id;

    // console.log("\n=== TEMPLATE VIEW DEBUG ===");
    // console.log("Route Params:", {
    //     groupId,
    //     templateId: selectedTemplateId,
    //     groupName: route.params?.groupData?.name
    // });

    const fetchTemplateDetails = useCallback(async () => {
        try {
            // console.log("\nFetching template details...");
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem("token");
            if (!token) {
                console.error("No authentication token found");
                navigation.navigate("Login");
                return;
            }

            // console.log("Making API request to fetch templates...");
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/templates/get-group-templates/${groupId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                // console.log("API Response received:", {
                //     templatesCount: response.data.templates?.length,
                //     groupDetails: response.data.groupDetails
                // });

                const fetchedTemplates = response.data.templates || [];
                setTemplates(fetchedTemplates);

                if (selectedTemplateId) {
                    const currentTemplate = fetchedTemplates.find(t => t._id === selectedTemplateId);
                    if (currentTemplate) {
                        // console.log("Found matching template:", {
                        //     id: currentTemplate._id,
                        //     name: currentTemplate.name,
                        //     category: currentTemplate.category,
                        //     amount: currentTemplate.amount
                        //});
                    } else {
                        // console.error("Selected template not found in response");
                    }
                }
            } else {
                // console.error("API request failed:", response.data.message);
                setError(response.data.message || "Failed to load template details");
            }
        } catch (err) {
            //console.error("Template fetch error:", {
            //     message: err.message,
            //     response: err.response?.data
            //  });
            setError(err.response?.data?.message || "Failed to load template details");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [groupId, navigation, selectedTemplateId]);

    const onRefresh = useCallback(() => {
        //  console.log("Manual refresh triggered");
        setRefreshing(true);
        fetchTemplateDetails();
    }, [fetchTemplateDetails]);

    useFocusEffect(
        useCallback(() => {
            //console.log("Screen focused - fetching templates");
            fetchTemplateDetails();
        }, [fetchTemplateDetails])
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f9fb', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#00aaff" />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f9fb', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'red', fontSize: 16 }}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={fetchTemplateDetails}
                >
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

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
                            <Ionicons name="document-text" size={20} color="#8b5cf6" />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Templates</Text>
                            <Text style={styles.headerSubtitle}>
                                {templates.length} template{templates.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.createButtonHeader}
                        onPress={() => navigation.navigate('CreateSplitTemplate', {
                            groupData: route.params?.groupData,
                            members: route.params?.members
                        })}
                    >
                        <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.createButtonHeaderText}>Create</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#8b5cf6']}
                        tintColor="#8b5cf6"
                    />
                }
            >
                {templates.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No templates found</Text>
                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={() => navigation.navigate('CreateSplitTemplate', {
                                groupData: route.params?.groupData,
                                members: route.params?.members
                            })}
                        >
                            <Text style={styles.createButtonText}>Create Template</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    templates.map((template) => (
                        <TouchableOpacity
                            key={template._id}
                            style={styles.card}
                            onPress={() => {
                                //console.log("Template selected:", template);
                                //console.log("Group data:", route.params?.groupData);
                                //console.log("Members:", route.params?.members);

                                // Ensure all template data is properly formatted
                                const templateData = {
                                    _id: template._id,
                                    name: template.name || '',
                                    amount: template.amount || 0,
                                    category: template.category || '',
                                    description: template.description || '',
                                    notes: template.notes || '',
                                    tags: template.tags || [],
                                    splitType: template.splitType || 'even',
                                    customAmounts: template.customAmounts || [],
                                    transactionType: template.transactionType || 'expense',
                                    selectedMembers: template.splitBetween || []
                                };

                                // console.log("Passing template data:", templateData);

                                navigation.navigate('SplitTransactions', {
                                    template: templateData,
                                    groupData: route.params?.groupData,
                                    members: route.params?.members,
                                    selectedMembers: template.splitBetween || [],
                                    groupName: route.params?.groupData?.name,
                                    groupId: route.params?.groupData?._id
                                });
                            }}
                        >
                            <View style={styles.templateHeader}>
                                <View style={styles.templateIconContainer}>
                                    <Ionicons name="document-text-outline" size={22} color="#8b5cf6" />
                                </View>
                                <Text style={styles.templateTitle}>{template.name}</Text>
                            </View>
                            {template.description && (
                                <Text style={styles.description}>{template.description}</Text>
                            )}
                            <View style={styles.categoryContainer}>
                                <Text style={styles.category}>{template.category}</Text>
                            </View>
                            <View style={styles.rowBetween}>
                                <View style={styles.splitTypeContainer}>
                                    <Ionicons name="git-branch-outline" size={15} color="#8b5cf6" />
                                    <Text style={styles.splitType}>
                                        {template.splitType === 'even' ? 'Equal Split' : 'Custom Split'}
                                    </Text>
                                </View>
                                <Text style={styles.amount}>₹{parseFloat(template.amount).toFixed(2)}</Text>
                            </View>
                            {template.notes && (
                                <View style={styles.notesContainer}>
                                    <Text style={styles.notesLabel}>Notes:</Text>
                                    <Text style={styles.notes}>{template.notes}</Text>
                                </View>
                            )}
                            <View style={styles.footer}>
                                <Text style={styles.createdBy}>Created by {template.createdBy.name}</Text>
                                <Text style={styles.date}>{new Date(template.createdAt).toLocaleDateString()}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7fafd',
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
    scrollContent: {
        paddingBottom: 32,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        marginHorizontal: 20,
        marginVertical: 12,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderLeftWidth: 4,
        borderLeftColor: '#8b5cf6',
    },
    templateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    templateIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f3e8ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#e9d5ff',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    templateTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1f2937',
        letterSpacing: 0.3,
        flex: 1,
    },
    categoryContainer: {
        backgroundColor: '#f3e8ff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignSelf: 'flex-start',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e9d5ff',
    },
    category: {
        color: '#8b5cf6',
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 0.3,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    splitTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    splitType: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    amount: {
        color: '#1f2937',
        fontWeight: '800',
        fontSize: 18,
        letterSpacing: 0.3,
    },
    direction: {
        color: '#444',
        fontSize: 14,
        fontWeight: '500',
    },
    notesContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    notesLabel: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    notes: {
        color: '#444',
        fontSize: 14,
    },
    footer: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    createdBy: {
        color: '#666',
        fontSize: 13,
    },
    date: {
        color: '#888',
        fontSize: 12,
        marginTop: 4,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#00aaff',
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    description: {
        color: '#666',
        fontSize: 14,
        marginBottom: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 40
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20
    },
    createButton: {
        backgroundColor: '#00aaff',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    },
    createButtonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    createButtonHeaderText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 0.3,
    },
    createButton: {
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});

export default ViewSplitTemplate;
