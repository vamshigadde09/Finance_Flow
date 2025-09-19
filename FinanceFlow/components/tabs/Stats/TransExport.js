import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TransExport = () => {
    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>Transaction Export</Text>
                <Text style={styles.subtitle}>Coming Soon</Text>
                <Text style={styles.description}>
                    Data extraction functionality will be available in the next update.
                </Text>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>📊</Text>
                </View>
            </View>
        </View>
    );
};

export default TransExport;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingTop: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 60,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        marginHorizontal: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8e44ad',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f3e5f5',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#8e44ad',
    },
    icon: {
        fontSize: 32,
    },
});