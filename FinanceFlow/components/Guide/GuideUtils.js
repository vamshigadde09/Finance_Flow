import AsyncStorage from '@react-native-async-storage/async-storage';

export const checkUserGuideStatus = async () => {
    try {
        const guideCompleted = await AsyncStorage.getItem('userGuideCompleted');
        return guideCompleted === 'true';
    } catch (error) {
        console.error('Error checking user guide status:', error);
        return false;
    }
};

export const markUserGuideCompleted = async () => {
    try {
        await AsyncStorage.setItem('userGuideCompleted', 'true');
    } catch (error) {
        console.error('Error marking user guide as completed:', error);
    }
};

export const resetUserGuide = async () => {
    try {
        await AsyncStorage.removeItem('userGuideCompleted');
    } catch (error) {
        console.error('Error resetting user guide:', error);
    }
};
