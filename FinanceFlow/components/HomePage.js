import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Home from './tabs/Home';
import Groups from './tabs/Groups';
import Stats from './tabs/Stats';
import Profile from './tabs/Profile';

const Tab = createBottomTabNavigator();

// Placeholder component for the Add tab (hidden)
const AddPlaceholder = () => null;

function CustomTabBar({ state, descriptors, navigation }) {
    return (
        <View style={styles.tabBarContainer}>
            <View style={styles.tabBarBackground}>
                {state.routes.map((route, index) => {
                    if (route.name === 'Add') {
                        // Render the + button instead of a tab
                        return (
                            <TouchableOpacity
                                key="plus-button"
                                style={styles.plusButtonContainer}
                                onPress={() => navigation.navigate('TransactionScreen')}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#8b5cf6', '#7c3aed']}
                                    style={styles.plusButton}
                                >
                                    <Ionicons name="add" size={30} color="#fff" />
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    }

                    const { options } = descriptors[route.key];
                    const label = options.tabBarLabel ?? options.title ?? route.name;
                    const isFocused = state.index === index;

                    let icon;
                    if (route.name === 'Home') {
                        icon = <Ionicons name={isFocused ? 'home' : 'home-outline'} size={24} color={isFocused ? '#8b5cf6' : '#9ca3af'} />;
                    } else if (route.name === 'Groups') {
                        icon = <MaterialIcons name="groups" size={24} color={isFocused ? '#8b5cf6' : '#9ca3af'} />;
                    } else if (route.name === 'Stats') {
                        icon = <Feather name={isFocused ? 'bar-chart-2' : 'bar-chart'} size={24} color={isFocused ? '#8b5cf6' : '#9ca3af'} />;
                    } else if (route.name === 'Profile') {
                        icon = <Feather name="user" size={24} color={isFocused ? '#8b5cf6' : '#9ca3af'} />;
                    }

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={options.tabBarTestID}
                            onPress={() => {
                                const event = navigation.emit({
                                    type: 'tabPress',
                                    target: route.key,
                                    canPreventDefault: true,
                                });
                                if (!isFocused && !event.defaultPrevented) {
                                    navigation.navigate(route.name);
                                }
                            }}
                            style={[styles.tabButton, isFocused && styles.activeTabButton]}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                                {icon}
                            </View>
                            <Text style={[styles.tabLabel, isFocused && styles.activeTabLabel]}>{label}</Text>
                            {isFocused && <View style={styles.activeIndicator} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const HomePage = () => {
    return (
        <Tab.Navigator
            initialRouteName="Home"
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen name="Home" component={Home} />
            <Tab.Screen name="Groups" component={Groups} />
            {/* Placeholder for the + button */}
            <Tab.Screen name="Add" component={AddPlaceholder} options={{ tabBarButton: () => null }} />
            <Tab.Screen name="Stats" component={Stats} />
            <Tab.Screen name="Profile" component={Profile} />
        </Tab.Navigator>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    tabBarContainer: {
        height: Platform.OS === 'ios' ? 90 : 80,
        backgroundColor: 'transparent',
        justifyContent: 'center',
    },
    tabBarBackground: {
        flexDirection: 'row',
        height: 80,
        backgroundColor: '#ffffff',
        marginHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingBottom: 4,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.12)',
        overflow: 'visible',
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        minHeight: 55,
    },
    activeTabButton: {
        marginHorizontal: 4,
        paddingVertical: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    activeIconContainer: {
        backgroundColor: 'rgba(139, 92, 246, 0.25)',
        borderRadius: 20,  // keep this, since iconContainer is already 40x40
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 5,
    },
    tabLabel: {
        fontSize: 11,
        color: '#9ca3af',
        fontWeight: '500',
        textAlign: 'center',
    },
    activeTabLabel: {
        color: '#8b5cf6',
        fontWeight: '700',
        fontSize: 12,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 2,
        left: '50%',
        marginLeft: -12,
        width: 24,
        height: 3,
        backgroundColor: '#8b5cf6',
        borderRadius: 2,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    plusButtonContainer: {
        position: 'relative',
        top: Platform.OS === 'android' ? -28 : -30,
        zIndex: 10,
        width: 70,
        alignItems: 'center',
    },
    plusButton: {
        width: 62,
        height: 62,
        borderRadius: 31,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
        borderWidth: 3,
        borderColor: '#ffffff',
    },
});

export default HomePage;