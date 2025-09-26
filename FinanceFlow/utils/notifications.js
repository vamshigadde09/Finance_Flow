import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

export async function initializeNotifications() {

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
        console.log('[Push][client] API Base URL:', apiBaseUrl);
        console.log('[Push][client] Auth token preview:', authToken ? `${authToken.substring(0, 20)}...` : 'null');
        console.log('[Push][client] Notifications module available:', !!Notifications);
        console.log('[Push][client] Constants:', JSON.stringify({
            appOwnership: Constants.appOwnership,
            expoConfig: Constants.expoConfig ? 'present' : 'missing',
            easConfig: Constants.easConfig ? 'present' : 'missing'
        }, null, 2));

        // Test if Notifications module is working
        try {
            console.log('[Push][client] Testing Notifications module...');
            const permissions = await Notifications.getPermissionsAsync();
            console.log('[Push][client] Current permissions:', permissions);
        } catch (e) {
            console.warn('[Push][client] Notifications module test failed:', e?.message || e);
            return false;
        }

        // Ensure permissions are granted and channels are ready
        await initializeNotifications();

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

            // Try with hardcoded projectId from app.json as last resort
            console.warn('[Push][client] Trying with hardcoded projectId as fallback');
            try {
                const tokenResponse = await Notifications.getExpoPushTokenAsync({
                    projectId: 'cd92af63-a800-41c9-b6ac-87010cdd129d'
                });
                const pushToken = tokenResponse?.data;
                if (pushToken) {
                    console.log('[Push][client] got token with hardcoded projectId', `${pushToken.slice(0, 12)}...`);
                    return await saveTokenToServer(apiBaseUrl, authToken, pushToken);
                }
            } catch (e) {
                console.warn('[Push][client] Failed to get token with hardcoded projectId:', e?.message || e);
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
        console.log('[Push][client] Attempting to save token to:', `${apiBaseUrl}/api/v1/user/save-push-token`);
        console.log('[Push][client] Auth token preview:', authToken ? `${authToken.substring(0, 20)}...` : 'null');

        const res = await fetch(`${apiBaseUrl}/api/v1/user/save-push-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ token: pushToken }),
        });

        console.log('[Push][client] save-push-token response status:', res.status);
        console.log('[Push][client] response headers:', Object.fromEntries(res.headers.entries()));

        if (!res.ok) {
            const errorText = await res.text();
            console.warn('[Push][client] Server error response:', errorText);
            return false;
        }

        const responseData = await res.text();
        console.log('[Push][client] Server response:', responseData);
        return true;
    } catch (e) {
        console.warn('[Push][client] Network error saving token:', e?.message || e);
        console.warn('[Push][client] Error details:', e);
        return false;
    }
}