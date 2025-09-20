import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function NotFoundScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>404</Text>
            <Text style={styles.subtitle}>Page not found</Text>
            <Link href="/" asChild>
                <Text style={styles.link}>Go to home screen</Text>
            </Link>
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
        fontSize: 64,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    link: {
        color: '#007AFF',
        fontSize: 16,
        textDecorationLine: 'underline',
    },
});
