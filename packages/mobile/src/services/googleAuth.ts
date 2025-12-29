/**
 * Google Authentication Service
 * Handles Google OAuth 2.0 authentication for both web and mobile platforms
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret?: string; // Only needed for web
}

export interface GoogleAuthResult {
  type: 'success' | 'cancel' | 'error';
  user?: GoogleUser;
  accessToken?: string;
  idToken?: string;
  error?: string;
}

class GoogleAuthService {
  private config: GoogleAuthConfig | null = null;
  private codeVerifier: string = '';

  /**
   * Initialize Google Auth with configuration
   */
  initialize(config: GoogleAuthConfig): void {
    this.config = config;
  }

  /**
   * Sign in with Google
   */
  async signIn(): Promise<GoogleAuthResult> {
    if (!this.config) {
      return {
        type: 'error',
        error: 'Google Auth not initialized. Call initialize() first.',
      };
    }

    try {
      const result = await this.performGoogleAuth();

      if (result.type === 'success' && result.accessToken) {
        // Get user info from Google
        const userInfo = await this.fetchGoogleUserInfo(result.accessToken);

        return {
          type: 'success',
          user: userInfo,
          accessToken: result.accessToken,
          idToken: result.idToken,
        };
      }

      return result;
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      return {
        type: 'error',
        error: error.message || 'Failed to sign in with Google',
      };
    }
  }

  /**
   * Perform Google OAuth authentication
   */
  private async performGoogleAuth(): Promise<GoogleAuthResult> {
    try {
      const redirectUri = AuthSession.makeRedirectUri();

      // Generate code verifier for PKCE
      this.codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);

      const authUrl = this.buildAuthUrl(redirectUri, codeChallenge);

      // Use openAuthSessionAsync for mobile and web
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success') {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (code) {
          // Exchange code for tokens
          const tokenResult = await this.exchangeCodeForTokens(code, redirectUri, this.codeVerifier);
          return tokenResult;
        }
      }

      return {
        type: result.type === 'dismiss' ? 'cancel' : 'error',
        error: result.type === 'dismiss' ? undefined : 'Authentication failed',
      };
    } catch (error: any) {
      return {
        type: 'error',
        error: error.message || 'Failed to perform Google authentication',
      };
    }
  }

  /**
   * Generate code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < 128; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate code challenge from code verifier
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    // Convert standard base64 to base64url
    return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Build Google OAuth authorization URL
   */
  private buildAuthUrl(redirectUri: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: this.config!.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<GoogleAuthResult> {
    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token';

      const body = new URLSearchParams({
        client_id: this.config!.clientId,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      });

      // Add client secret for web platform
      if (Platform.OS === 'web' && this.config!.clientSecret) {
        body.append('client_secret', this.config!.clientSecret);
      }

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const tokenData = await response.json();

      if (!response.ok) {
        throw new Error(tokenData.error_description || 'Token exchange failed');
      }

      return {
        type: 'success',
        accessToken: tokenData.access_token,
        idToken: tokenData.id_token,
      };
    } catch (error: any) {
      return {
        type: 'error',
        error: error.message || 'Failed to exchange code for tokens',
      };
    }
  }

  /**
   * Fetch user information from Google API
   */
  private async fetchGoogleUserInfo(accessToken: string): Promise<GoogleUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user information');
    }

    const userInfo = await response.json();

    return {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      verified_email: userInfo.verified_email,
    };
  }

  /**
   * Sign out (revoke Google tokens)
   */
  async signOut(accessToken?: string): Promise<void> {
    if (accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: 'POST',
        });
      } catch (error) {
        console.warn('Failed to revoke Google token:', error);
      }
    }
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
