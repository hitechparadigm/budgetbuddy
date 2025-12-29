# Google Sign-In Web Testing Guide

## Current Status

❌ **Google Sign-In NOT YET IMPLEMENTED on web app**

The web app currently has:
- ✅ Email/password authentication (LoginForm.tsx, RegisterForm.tsx)
- ✅ AWS Cognito integration
- ✅ JWT token management
- ❌ Google OAuth 2.0 integration (NOT IMPLEMENTED)

## Implementation Plan

### Step 1: Install Dependencies

```bash
cd packages/web-app
npm install @react-oauth/google
```

### Step 2: Create Google Sign-In Component

Create `packages/web-app/src/components/auth/GoogleSignInButton.tsx`:

```typescript
import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError
}) => {
  const { loginWithGoogle, loading } = useAuth();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (credentialResponse.credential) {
        await loginWithGoogle(credentialResponse.credential);
        onSuccess?.();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google Sign-In failed';
      onError?.(errorMessage);
    }
  };

  const handleError = () => {
    onError?.('Google Sign-In failed. Please try again.');
  };

  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        text="signin_with"
        width="100%"
      />
    </div>
  );
};
```

### Step 3: Update AuthContext

Add to `packages/web-app/src/contexts/AuthContext.tsx`:

```typescript
const loginWithGoogle = async (idToken: string) => {
  // Send idToken to backend to verify and create/link user
  // Backend should:
  // 1. Verify the Google ID token
  // 2. Extract user info (email, name, picture)
  // 3. Create user if doesn't exist
  // 4. Return JWT tokens

  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  const data = await response.json();
  // Store tokens and redirect
};
```

### Step 4: Update LoginForm

Add Google Sign-In button to `packages/web-app/src/components/auth/LoginForm.tsx`:

```typescript
import { GoogleSignInButton } from './GoogleSignInButton';

// In the form JSX, add before or after the email/password form:
<div className="mt-6">
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-300"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-2 bg-white text-gray-500">Or continue with</span>
    </div>
  </div>

  <div className="mt-6">
    <GoogleSignInButton
      onSuccess={onSuccess}
      onError={(error) => setSubmitError(error)}
    />
  </div>
</div>
```

### Step 5: Wrap App with GoogleOAuthProvider

Update `packages/web-app/src/main.tsx`:

```typescript
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
```

### Step 6: Add Environment Variables

Create/update `packages/web-app/.env.local`:

```env
VITE_GOOGLE_WEB_CLIENT_ID=your-web-client-id-here
```

Get the client ID from AWS Secrets Manager:

```bash
aws secretsmanager get-secret-value \
  --secret-id budgetbuddy-dev/google-oauth \
  --profile hitechparadigm \
  --query 'SecretString' \
  --output text | jq -r '.web_client_id'
```

## Testing on Web App

### Prerequisites

1. **Start the web app**:
   ```bash
   cd packages/web-app
   npm run dev
   ```
   App will be at: `http://localhost:5173/`

2. **Ensure backend is running**:
   - Lambda functions deployed
   - API Gateway accessible
   - Cognito user pool configured

### Test Scenarios

#### Scenario 1: Google Sign-In with New Account

1. Open `http://localhost:5173/`
2. Click "Sign In" tab
3. Look for "Or continue with Google" section
4. Click "Sign in with Google" button
5. **Expected**: Google login popup appears
6. Sign in with a Google account you don't have in BudgetBuddy
7. **Expected**:
   - Popup closes
   - Redirected to `/onboarding` (new user)
   - User profile created in Cognito
   - JWT tokens stored in localStorage

#### Scenario 2: Google Sign-In with Existing Account

1. Create a user with email `test@gmail.com` via email/password signup
2. Log out
3. Click "Sign In" tab
4. Click "Sign in with Google"
5. Sign in with the same Google account
6. **Expected**:
   - Redirected to `/dashboard` (existing user)
   - Same user profile loaded
   - Budget data accessible

#### Scenario 3: Link Google Account to Existing Email Account

1. Sign up with email: `user@example.com`
2. Log out
3. Sign in with Google using same email
4. **Expected**:
   - System recognizes email match
   - Accounts are linked
   - User can sign in with either method

#### Scenario 4: Error Handling

1. Click "Sign in with Google"
2. Close the popup without signing in
3. **Expected**: Error message appears: "Google Sign-In failed. Please try again."

### Browser Console Testing

Open DevTools (F12) and check:

```javascript
// Check if Google library loaded
console.log(window.google);
// Expected: Google object with gsi property

// Check localStorage for tokens
console.log(localStorage.getItem('budgetbuddy_id_token'));
// Expected: JWT token string

// Check user info
console.log(localStorage.getItem('budgetbuddy_user'));
// Expected: User object with email, name, picture
```

### Network Tab Testing

1. Open DevTools → Network tab
2. Click "Sign in with Google"
3. Complete Google login
4. Look for requests:
   - `POST /api/auth/google` - Should return 200 with JWT tokens
   - Check response contains: `accessToken`, `refreshToken`, `idToken`

## Troubleshooting

### Issue: "Google is not defined"
- **Cause**: GoogleOAuthProvider not wrapping app
- **Solution**: Ensure `main.tsx` has GoogleOAuthProvider wrapper

### Issue: "Invalid client ID"
- **Cause**: Wrong or missing VITE_GOOGLE_WEB_CLIENT_ID
- **Solution**:
  ```bash
  # Get correct client ID from AWS
  aws secretsmanager get-secret-value \
    --secret-id budgetbuddy-dev/google-oauth \
    --profile hitechparadigm
  ```

### Issue: "Redirect URI mismatch"
- **Cause**: Google Cloud Console has wrong redirect URI
- **Solution**:
  - For local dev: `http://localhost:5173`
  - For production: `https://d1ueeugn9zcx7n.cloudfront.net`
  - Update in Google Cloud Console → OAuth 2.0 Client IDs

### Issue: Backend returns 401 after Google login
- **Cause**: Backend not verifying Google ID token correctly
- **Solution**:
  - Verify Google ID token using `google-auth-library-nodejs`
  - Check token signature and expiration
  - Ensure backend has Google client ID configured

## Success Criteria

- ✅ Google Sign-In button appears on login page
- ✅ Clicking button opens Google login popup
- ✅ New users can sign up with Google
- ✅ Existing users can sign in with Google
- ✅ Email accounts can be linked to Google
- ✅ JWT tokens stored in localStorage
- ✅ User redirected to onboarding (new) or dashboard (existing)
- ✅ No console errors
- ✅ Network requests show successful API calls

## Next Steps

1. Implement backend `/api/auth/google` endpoint
2. Add Google ID token verification
3. Create/link user accounts
4. Test end-to-end flow
5. Add to RegisterForm as well
6. Deploy to production

