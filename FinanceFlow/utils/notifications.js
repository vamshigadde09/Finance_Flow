import { Platform } from 'react-native';
import { API_BASE_URL } from '../api';

let NotificationsModule = null;
async function getNotifications() {
    if (!NotificationsModule) {
        NotificationsModule = await import('expo-notifications');
    }
    return NotificationsModule;
}

export async function initializeNotifications() {
    const Notifications = await getNotifications();

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: 'default',
            vibrationPattern: [100, 50, 100],
            enableVibrate: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            showBadge: true,
        });
        await Notifications.setNotificationChannelAsync('settlements', {
            name: 'Settlements',
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: 'default',
            vibrationPattern: [100, 50, 100],
            enableVibrate: true,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            showBadge: true,
        });
    }

    const settings = await Notifications.getPermissionsAsync();
    let status = settings.status;
    if (status !== 'granted') {
        const ask = await Notifications.requestPermissionsAsync();
        status = ask.status;
    }
    try {
        const tokenResp = await Notifications.getExpoPushTokenAsync();
        const expoPushToken = tokenResp?.data;
        if (expoPushToken) {
            // Persist to backend
            await fetch(`${API_BASE_URL}/api/v1/users/push-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(global.__AUTH_TOKEN__ ? { 'Authorization': `Bearer ${global.__AUTH_TOKEN__}` } : {})
                },
                body: JSON.stringify({ expoPushToken })
            }).catch(() => { });
        }
    } catch (e) {
        // Ignore in Expo Go / token failures
    }
    return status === 'granted';
}

export async function sendTestNotification() {
    const Notifications = await getNotifications();
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'FinanceFlow Test',
            body: 'This is a test notification.',
            data: { source: 'profile-test' },
        },
        trigger: null,
    });
}

export async function sendLocalNotification(title, body, data = {}, channelId = 'settlements') {
    const Notifications = await getNotifications();
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data,
            channelId,
        },
        trigger: null,
    });
}