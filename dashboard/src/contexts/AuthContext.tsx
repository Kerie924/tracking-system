import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { completeOAuthRedirect, getAuthErrorMessage } from '@/services/auth';
import { ensureUserProfile, getUserProfile } from '@/services/firestoreData';
import { DEV_ALL_ADMIN } from '@/lib/config';
import type { UserProfile } from '@/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  oauthError: string | null;
  clearOauthError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  oauthError: null,
  clearOauthError: () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const clearOauthError = useCallback(() => setOauthError(null), []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await getUserProfile(user.uid);
    if (p) setProfile(p);
  }, [user]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initAuth() {
      try {
        await completeOAuthRedirect();
      } catch (err) {
        setOauthError(getAuthErrorMessage(err));
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser);

        if (firebaseUser) {
          try {
            const p = await ensureUserProfile(
              firebaseUser.uid,
              firebaseUser.email ?? '',
              firebaseUser.displayName
            );
            setProfile(p);
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }

        setLoading(false);
      });
    }

    void initAuth();
    return () => unsubscribe?.();
  }, []);

  const isAdmin = DEV_ALL_ADMIN || profile?.role === 'admin' || profile?.role == null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        oauthError,
        clearOauthError,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
