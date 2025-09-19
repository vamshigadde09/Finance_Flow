import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { resetUserGuide } from './GuideUtils';

const ResetGuide = () => {
    const handleReset = async () => {
        try {
            await resetUserGuide();
            Alert.alert('Success', 'User guide has been reset. Restart the app to see the guide again.');
        } catch (error) {
            Alert.alert('Error', 'Failed to reset user guide');
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.button} onPress={handleReset}>
                <Text style={styles.buttonText}>Reset User Guide</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    button: {
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ResetGuide;
