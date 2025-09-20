import { View, Text, StyleSheet } from 'react-native';

export default function GroupsScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Groups</Text>
            <Text style={styles.subtitle}>Manage your split groups</Text>
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
