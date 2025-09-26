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
        console.log('[Push][client] registerPushToken start');
        console.log('[Push][client] Constants:', JSON.stringify({
            appOwnership: Constants.appOwnership,
            expoConfig: Constants.expoConfig ? 'present' : 'missing',
            easConfig: Constants.easConfig ? 'present' : 'missing'
        }, null, 2));

        // Ensure permissions are granted and channels are ready
        await initializeNotifications();
        const Notifications = await getNotifications();

        // Try multiple ways to get projectId
        let projectId = Constants?.expoConfig?.extra?.eas?.projectId ||
            Constants?.easConfig?.projectId ||
            Constants?.expoConfig?.extra?.projectId;

        console.log('[Push][client] projectId:', projectId);

        if (!projectId) {
            console.warn('[Push][client] Missing projectId in Constants, trying without it');
            // Try without projectId - sometimes it works in production builds
            try {
                const tokenResponse = await Notifications.getExpoPushTokenAsync();
                const pushToken = tokenResponse?.data;
                if (pushToken) {
                    console.log('[Push][client] got token without projectId', `${pushToken.slice(0, 12)}...`);
                    return await saveTokenToServer(apiBaseUrl, authToken, pushToken);
                }
            } catch (e) {
                console.warn('[Push][client] Failed to get token without projectId:', e?.message || e);
            }
            return false;
        }

        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        const pushToken = tokenResponse?.data;
        if (!pushToken) {
            console.warn('[Push][client] No push token returned');
            return false;
        }
        console.log('[Push][client] got token', `${pushToken.slice(0, 12)}...`);

        return await saveTokenToServer(apiBaseUrl, authToken, pushToken);
    } catch (e) {
        console.warn('Failed to register push token:', e?.message || e);
        return false;
    }
}

async function saveTokenToServer(apiBaseUrl, authToken, pushToken) {
    try {
        const res = await fetch(`${apiBaseUrl}/api/v1/user/save-push-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ token: pushToken }),
        });

        console.log('[Push][client] save-push-token response', res.status);

        if (!res.ok) {
            const errorText = await res.text();
            console.warn('[Push][client] Server error:', errorText);
            return false;
        }

        return true;
    } catch (e) {
        console.warn('[Push][client] Network error saving token:', e?.message || e);
        return false;
    }
}