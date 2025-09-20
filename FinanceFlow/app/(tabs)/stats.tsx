import { View, Text, StyleSheet } from 'react-native';

export default function StatsScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Statistics</Text>
            <Text style={styles.subtitle}>View your financial analytics</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});
