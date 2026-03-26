import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken } from '../services/api';
import type { User } from '../types';

const AUTH_KEY = 'pg_auth';

interface AuthState {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isHydrating: boolean;
  login: (phone: string, otp: string) => Promise<{ isNewUser?: boolean; phone?: string } | void>;
  register: (phone: string, name: string, email?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: false,
  isHydrating: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

async function storeAuth(state: AuthState): Promise<void> {
  const json = JSON.stringify(state);
  if (Platform.OS === 'web') {
    localStorage.setItem(AUTH_KEY, json);
  } else {
    await SecureStore.setItemAsync(AUTH_KEY, json);
  }
}

async function loadAuth(): Promise<AuthState | null> {
  try {
    let json: string | null;
    if (Platform.OS === 'web') {
      json = localStorage.getItem(AUTH_KEY);
    } else {
      json = await SecureStore.getItemAsync(AUTH_KEY);
    }
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

async function clearAuth(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(AUTH_KEY);
    } else {
      await SecureStore.deleteItemAsync(AUTH_KEY);
    }
  } catch {
    // ignore storage errors during cleanup
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    loadAuth().then(async (state) => {
      if (state?.user && state?.token) {
        try {
          // Set the token globally so API calls are authenticated
          setAuthToken(state.token);
          // Validate the stored session with the backend
          const res = await api.auth.me();
          // Update with fresh data from server
          const freshUser: User = {
            id: res.data.id,
            name: res.data.name,
            role: res.data.role as 'owner' | 'tenant',
          };
          setUser(freshUser);
          setToken(state.token);
          await storeAuth({ user: freshUser, token: state.token });
        } catch {
          // Session invalid — clear and show login
          await clearAuth();
        }
      }
      setIsHydrating(false);
    });
  }, []);

  const login = useCallback(async (phone: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.verifyOtp(phone, otp);
      if (res.data.isNewUser) {
        return { isNewUser: true, phone: res.data.phone };
      }
      const authState: AuthState = {
        user: res.data.user!,
        token: res.data.accessToken!,
      };
      setAuthToken(authState.token);
      await storeAuth(authState);
      setUser(authState.user);
      setToken(authState.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (phone: string, name: string, email?: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(phone, name, email);
      const authState: AuthState = {
        user: res.data.user,
        token: res.data.accessToken,
      };
      setAuthToken(authState.token);
      await storeAuth(authState);
      setUser(authState.user);
      setToken(authState.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuthToken(null);
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, isHydrating, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
