import { config } from '../config';
import { useAuthStore } from '../stores/authStore';
import * as Sentry from '@sentry/nextjs';

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class APIClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.backend.baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const { session, clearSession } = useAuthStore.getState();
    
    if (!session) {
      return {};
    }

    // Don't send expired tokens — prevents 401 before the periodic
    // expiry check in useAuth.ts catches it.
    if (session.expires_at && Date.now() >= session.expires_at * 1000) {
      clearSession();
      return {};
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(!skipAuth && this.getAuthHeaders()),
        ...options.headers,
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 - unauthorized
      if (response.status === 401) {
        useAuthStore.getState().clearSession();
        throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      // Handle other error status codes
      if (!response.ok) {
        const body = await response.json().catch(() => ({
          message: `HTTP ${response.status}`,
        }));
        // Backend wraps errors in { error: { message, status, code } }.
        // Unwrap so the actual error message surfaces instead of "Request failed".
        const errBody = body.error ?? body;
        throw new APIError(
          errBody.message || 'Request failed',
          response.status,
          errBody.code
        );
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof APIError) {
        Sentry.captureException(error, {
          tags: { api_endpoint: endpoint },
          extra: { status: error.status, code: error.code },
        });
        throw error;
      }

      // Network or other errors
      const networkError = new APIError(
        'Network request failed',
        0,
        'NETWORK_ERROR'
      );
      Sentry.captureException(networkError, {
        tags: { api_endpoint: endpoint },
        extra: { originalError: error },
      });
      throw networkError;
    }
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new APIClient();
