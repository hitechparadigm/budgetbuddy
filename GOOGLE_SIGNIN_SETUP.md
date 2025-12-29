# Google Sign-In Setup Guide

This guide explains how to set up Google Sign-In for BudgetBuddy on web, iOS, and Android.

## Current Status

✅ **Web**: Configured and working
- Client ID: `25096939086-7mii5nkunrtkui0fibv0d5k93mtinrhk.apps.googleusercontent.com`
- Client Secret: `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`

⏳ **iOS**: Needs platform-specific client ID
⏳ **Android**: Needs platform-specific client ID

## Setup Instructions

### For Development (Recommended)

Use Expo's credential management system:

```bash
cd packages/mobile
npx eas credentials
```

This will:
1. Guide you through creating credentials for iOS and Android
2. Automatically handle SHA-1 fingerprints
3. Store credentials securely
4. Generate the necessary environment variables

### For Production

#### Step 1: Get Platform-Specific Client IDs

**For iOS:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to APIs & Services → Credentials
4. Click "Create Credentials" → OAuth 2.0 Client ID
5. Select "iOS" as the application type
6. Enter Bundle ID: `com.budgetbuddy.mobile`
7. Copy the generated Client ID

**For Android:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to APIs & Services → Credentials
4. Click "Create Credentials" → OAuth 2.0 Client ID
5. Select "Android" as the application type
6. Enter Package name: `com.budgetbuddy.mobile`
7. Get SHA-1 fingerprint:
   - Option A: Run `npx eas credentials` (recommended)
   - Option B: Use keytool if Java is installed:
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
8. Copy the generated Client ID

#### Step 2: Set Environment Variables

Create a `.env.local` file in `packages/mobile/`:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=25096939086-7mii5nkunrtkui0fibv0d5k93mtinrhk.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET=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
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id-here
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id-here
```

#### Step 3: Store in AWS Secrets Manager (Production)

For production deployments:

```bash
aws secretsmanager create-secret \
  --name budgetbuddy/google-oauth \
  --secret-string '{
    "web_client_id": "...",
    "web_client_secret": "...",
    "ios_client_id": "...",
    "android_client_id": "..."
  }'
```

Then update the config to read from Secrets Manager.

## Testing

### Web
```bash
npm run web
```
Click "Sign in with Google" button

### iOS
```bash
npm run ios
```
Or use Expo Go app

### Android
```bash
npm run android
```
Or use Expo Go app

## Troubleshooting

### "Google Sign-In failed" on mobile
- Ensure you're using the correct platform-specific client ID
- Check that the package name/bundle ID matches in Google Cloud Console
- Verify SHA-1 fingerprint is correct for Android

### "Redirect URI mismatch" error
- Make sure the redirect URI in Google Cloud Console matches what Expo generates
- For Expo, this is typically: `https://auth.expo.io/@username/projectname`

### keytool not found
- Java is not installed on your system
- Use `npx eas credentials` instead (recommended)
- Or install Java from [java.com](https://www.java.com)

## Security Notes

⚠️ **IMPORTANT**: Never commit credentials to version control!

- `.env.local` should be in `.gitignore`
- Use environment variables for all sensitive data
- Store production credentials in AWS Secrets Manager
- Rotate credentials regularly

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Expo Auth Session Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [EAS Credentials Documentation](https://docs.expo.dev/app-signing/managed-credentials/)
