import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth } from './firebase';
import {
  loginWithFirebase,
  getCurrentUser,
  logout as apiLogout,
  login as apiLogin,
  register as apiRegister,
} from './api/auth';
import { getStoredToken, setStoredToken, clearStoredToken } from './authStorage';
import type { LoginPayload, RegisterPayload, UserDto } from './api/types';

WebBrowser.maybeCompleteAuthSession();

type SessionContextType = {
  /** The PrintForge user record, once the Firebase→JWT exchange has completed. Null until then. */
  appUser: UserDto | null;
  /**
   * Convenience accessor: appUser?.role, defaulting to 'student' when
   * signed out. Kept for backward compatibility with screens (e.g.
   * dashboard/index.tsx) that route on role. Now sourced from the real
   * backend user instead of local state.
   */
  role: UserDto['role'] | 'student';
  /** The PrintForge JWT — attach as Authorization: Bearer <token> on authenticated requests. */
  token: string | null;
  firebaseUser: User | null;
  authLoading: boolean;
  signInWithGoogle: () => Promise<UserDto | null>;
  /** Email/password login — throws ApiError on failure (bad credentials, network, etc.) so the caller can show it inline. */
  login: (payload: LoginPayload) => Promise<UserDto>;
  /** Email/password registration — throws ApiError on failure (e.g. duplicate email). */
  register: (payload: RegisterPayload) => Promise<UserDto>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType>({
  appUser: null,
  role: 'student',
  token: null,
  firebaseUser: null,
  authLoading: true,
  signInWithGoogle: async () => null,
  login: async () => {
    throw new Error('SessionProvider not mounted');
  },
  register: async () => {
    throw new Error('SessionProvider not mounted');
  },
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [appUser, setAppUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  });

  // On app start: if a PrintForge token is already stored, validate it
  // against GET /api/auth/me rather than trusting it indefinitely — it
  // may have expired since the app was last open.
  useEffect(() => {
    (async () => {
      const stored = await getStoredToken();
      if (!stored) {
        setAuthLoading(false);
        return;
      }
      try {
        const user = await getCurrentUser(stored);
        setToken(stored);
        setAppUser(user);
      } catch {
        // Expired/invalid — clear it so the app doesn't keep retrying with a dead token.
        await clearStoredToken();
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setFirebaseUser(user);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      setAuthLoading(true);
      const result = await promptAsync();

      if (result.type !== 'success') {
        setAuthLoading(false);
        return null;
      }

      const { id_token } = result.params as { id_token?: string };
      if (!id_token) {
        setAuthLoading(false);
        return null;
      }

      // Sign into Firebase first — this is what proves identity to Google.
      const credential = GoogleAuthProvider.credential(id_token);
      const userCredential = await signInWithCredential(auth, credential);
      setFirebaseUser(userCredential.user);

      // Firebase only proves *who* signed in — exchange that for a
      // PrintForge JWT so the rest of the app can call authenticated
      // endpoints. This is the step that was previously missing entirely.
      const firebaseIdToken = await userCredential.user.getIdToken();
      const authResponse = await loginWithFirebase(firebaseIdToken);

      await setStoredToken(authResponse.token);
      setToken(authResponse.token);
      setAppUser(authResponse.user);
      setAuthLoading(false);
      return authResponse.user;
    } catch (err) {
      console.warn('signInWithGoogle failed:', err);
      setAuthLoading(false);
      return null;
    }
  };

  // Unlike signInWithGoogle (which swallows errors since "user cancelled
  // the picker" is a normal outcome with nothing to show), login/register
  // back real forms — let ApiError propagate so the screen can render the
  // backend's actual message (bad credentials, duplicate email, etc.).
  const login = async (payload: LoginPayload) => {
    setAuthLoading(true);
    try {
      const authResponse = await apiLogin(payload);
      await setStoredToken(authResponse.token);
      setToken(authResponse.token);
      setAppUser(authResponse.user);
      return authResponse.user;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setAuthLoading(true);
    try {
      const authResponse = await apiRegister(payload);
      await setStoredToken(authResponse.token);
      setToken(authResponse.token);
      setAppUser(authResponse.user);
      return authResponse.user;
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    if (token) {
      // Best-effort — backend logout is stateless, so a failure here
      // shouldn't block clearing the local session.
      try {
        await apiLogout(token);
      } catch {
        // ignore
      }
    }
    await clearStoredToken();
    setToken(null);
    setAppUser(null);
    await firebaseSignOut(auth);
    setFirebaseUser(null);
  };

  return (
    <SessionContext.Provider
      value={{
        appUser,
        role: appUser?.role ?? 'student',
        token,
        firebaseUser,
        authLoading,
        signInWithGoogle,
        login,
        register,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
