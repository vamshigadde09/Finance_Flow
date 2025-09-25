import { Platform } from 'react-native';
import Constants from 'expo-constants';

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

export async function registerPushToken(apiBaseUrl, authToken) {
    try {
        // Ensure permissions are granted and channels are ready
        await initializeNotifications();
        const Notifications = await getNotifications();
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        const pushToken = tokenResponse?.data;
        if (!pushToken) return false;

        await fetch(`${apiBaseUrl}/api/v1/users/save-push-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ token: pushToken }),
        });
        return true;
    } catch (e) {
        console.warn('Failed to register push token:', e?.message || e);
        return false;
    }
}