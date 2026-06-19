import { config } from '../config';
import * as Sentry from '@sentry/nextjs';
import type { Profile } from '../types/database';

interface LoginPayload {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface EmailRegisterPayload {
  email: string;
  password:  string;
  fullName?: string;
  environmentType?: 'home' | 'hospital' | 'industrial';
}

export interface EmailLoginPayload {
  email: string;
  password:  string;
}

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    wallet_address: string;
  };
  profile: Profile;
}

interface BackendAuthResponse {
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    user?: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    };
  };
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
}

class AuthAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.backend.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: 'Authentication request failed',
        }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }

  async register(payload: LoginPayload): Promise<AuthResponse> {
    const data = await this.request<BackendAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeAuthResponse(data, payload.walletAddress);
  }

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const data = await this.request<BackendAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeAuthResponse(data, payload.walletAddress);
  }

  async emailRegister(payload: EmailRegisterPayload): Promise<AuthResponse> {
    const data = await this.request<any>('/auth/email-register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeAuthResponse(data, '');
  }

  async emailLogin(payload: EmailLoginPayload): Promise<AuthResponse> {
    const data = await this.request<any>('/auth/email-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeAuthResponse(data, '');
  }

  async logout(token: string): Promise<void> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const data = await this.request<BackendAuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return normalizeAuthResponse(data, '');
  }

  async updateFCMToken(token: string, fcmToken: string): Promise<void> {
    return this.request<void>('/auth/fcm-token', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fcm_token: fcmToken }),
    });
  }
}

export const authAPI = new AuthAPI();

function normalizeAuthResponse(data: any, walletAddress: string): AuthResponse {
  if (!data.session) throw new Error('Authentication response missing session');
  const user = data.user ?? data.session.user;
  if (!user) throw new Error('Authentication response missing user');

  const email = user.email ?? `${walletAddress.toLowerCase()}@wallet.aura`;
  const now = new Date().toISOString();

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: user.id,
      wallet_address: walletAddress || data.profile?.wallet_address || null,
    },
    profile: data.profile ?? {
      id: user.id,
      full_name: null,
      email,
      avatar_url: null,
      environment_type: 'home',
      wallet_address: walletAddress || null,
      lisk_wallet_address: null,
      fcm_token: null,
      notification_email: true,
      notification_push: true,
      created_at: now,
      updated_at: now,
    },
  };
}
