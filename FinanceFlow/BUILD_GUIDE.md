# Finance Flow - App Building & Export Guide

## 🚀 Prerequisites

1. **Expo CLI** (if not installed):
   ```bash
   npm install -g @expo/cli
   ```

2. **EAS CLI** (for building):
   ```bash
   npm install -g eas-cli
   ```

3. **Expo Account**: Sign up at [expo.dev](https://expo.dev)

## 📱 Development & Testing

### 1. Start Development Server
```bash
cd FinanceFlow
npx expo start
```

### 2. Test on Expo Go App
- Install Expo Go on your phone from App Store/Google Play
- Scan the QR code from the terminal
- Your app will load on your device

### 3. Test API Connection
- Open the app and go to the Home tab
- Use the "Test Basic Connection" button to verify backend connectivity
- Use the "Test Login Endpoint" button to test authentication

## 🏗️ Building for Production

### Option 1: EAS Build (Recommended)

#### 1. Login to Expo
```bash
eas login
```

#### 2. Configure EAS
```bash
eas build:configure
```

#### 3. Build for Android
```bash
eas build --platform android
```

#### 4. Build for iOS
```bash
eas build --platform ios
```

#### 5. Build for both platforms
```bash
eas build --platform all
```

### Option 2: Local Build

#### For Android:
```bash
# Generate APK
npx expo run:android --variant release

# Generate AAB (for Play Store)
npx expo run:android --variant release --app-bundle
```

#### For iOS:
```bash
npx expo run:ios --configuration Release
```

## 📦 Export Options

### 1. Export for Web
```bash
npx expo export --platform web
```

### 2. Export Static Files
```bash
npx expo export
```

### 3. Prebuild (for native development)
```bash
npx expo prebuild
```

## 🎯 Platform-Specific Builds

### Android APK/AAB
- **APK**: For direct installation and testing
- **AAB**: For Google Play Store submission
- **Location**: `android/app/build/outputs/`

### iOS IPA
- **IPA**: For App Store submission or TestFlight
- **Requirements**: macOS, Xcode, Apple Developer Account
- **Location**: Generated in Xcode

## 🔧 Configuration Files

### 1. EAS Build Configuration (`eas.json`)
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

### 2. App Configuration (`app.json`)
- Update version numbers
- Configure app icons and splash screens
- Set up deep linking schemes

## 📋 Pre-Build Checklist

### ✅ Code & Configuration
- [ ] API endpoints point to production backend
- [ ] Environment variables are set
- [ ] App version is updated
- [ ] App icons and splash screens are ready
- [ ] All dependencies are installed

### ✅ Testing
- [ ] API connection works
- [ ] All features work on Expo Go
- [ ] No console errors
- [ ] Performance is acceptable

### ✅ Assets
- [ ] App icons (all sizes)
- [ ] Splash screen
- [ ] Any custom fonts or images

## 🚀 Deployment Steps

### 1. Final Testing
```bash
# Test on Expo Go first
npx expo start
```

### 2. Build for Production
```bash
# Using EAS (recommended)
eas build --platform all --profile production
```

### 3. Download & Install
- Download the built app from EAS dashboard
- Install on test devices
- Test thoroughly

### 4. Submit to Stores

#### Google Play Store:
1. Generate AAB file: `eas build --platform android --profile production`
2. Upload to Google Play Console
3. Fill store listing details
4. Submit for review

#### Apple App Store:
1. Generate IPA file: `eas build --platform ios --profile production`
2. Upload to App Store Connect
3. Fill store listing details
4. Submit for review

## 🔍 Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check `eas.json` configuration
   - Verify all dependencies are compatible
   - Check for TypeScript errors

2. **API Connection Issues**:
   - Verify backend URL is correct
   - Check CORS settings on backend
   - Test API endpoints manually

3. **App Crashes**:
   - Check console logs
   - Test on different devices
   - Verify all native dependencies

### Debug Commands:
```bash
# Check for issues
npx expo doctor

# Clear cache
npx expo start --clear

# Check dependencies
npm audit
```

## 📱 Testing on Real Devices

### 1. Development Build
```bash
eas build --profile development --platform android
```

### 2. Install on Device
- Download APK from EAS dashboard
- Install on Android device
- Test all features

## 🌐 Web Deployment

### 1. Build for Web
```bash
npx expo export --platform web
```

### 2. Deploy to Vercel/Netlify
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 📊 Monitoring & Analytics

### 1. Add Crash Reporting
```bash
npm install @sentry/react-native
```

### 2. Add Analytics
```bash
npm install @react-native-firebase/analytics
```

## 🔐 Security Checklist

- [ ] API keys are not hardcoded
- [ ] Sensitive data is encrypted
- [ ] HTTPS is used for all API calls
- [ ] User authentication is secure
- [ ] App permissions are minimal

## 📞 Support

- **Expo Docs**: [docs.expo.dev](https://docs.expo.dev)
- **EAS Build**: [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction)
- **React Native**: [reactnative.dev](https://reactnative.dev)

---

## Quick Commands Reference

```bash
# Development
npx expo start

# Build (EAS)
eas build --platform all

# Build (Local)
npx expo run:android --variant release
npx expo run:ios --configuration Release

# Export
npx expo export --platform web

# Prebuild
npx expo prebuild
```
