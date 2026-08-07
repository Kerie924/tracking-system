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
import { DEV_ALL_OWNER } from '@/lib/config';
import {
  canCreateServiceSheet,
  canManageUsers,
  canReviewRoleRequests,
  canViewAllSheets,
  normalizeUserRole,
  type UserProfile,
  type UserRole,
} from '@/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  role: UserRole;
  isOwner: boolean;
  isSupervisor: boolean;
  isElaboro: boolean;
  canManageUsers: boolean;
  canViewAllSheets: boolean;
  canCreateSheets: boolean;
  canReviewRoleRequests: boolean;
  /** @deprecated Use isOwner / canManageUsers */
  isAdmin: boolean;
  /** @deprecated Use isSupervisor */
  isAdvisor: boolean;
  /** @deprecated Use isElaboro */
  isCustomer: boolean;
  oauthError: string | null;
  clearOauthError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  role: 'elaboro',
  isOwner: false,
  isSupervisor: false,
  isElaboro: true,
  canManageUsers: false,
  canViewAllSheets: false,
  canCreateSheets: true,
  canReviewRoleRequests: false,
  isAdmin: false,
  isAdvisor: false,
  isCustomer: true,
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

  const role: UserRole = DEV_ALL_OWNER
    ? 'owner'
    : profile
      ? normalizeUserRole(profile.role)
      : 'elaboro';

  const isOwner = role === 'owner';
  const isSupervisor = role === 'supervisor';
  const isElaboro = role === 'elaboro';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        role,
        isOwner,
        isSupervisor,
        isElaboro,
        canManageUsers: canManageUsers(role),
        canViewAllSheets: canViewAllSheets(role),
        canCreateSheets: canCreateServiceSheet(role),
        canReviewRoleRequests: canReviewRoleRequests(role),
        isAdmin: canManageUsers(role),
        isAdvisor: isSupervisor || role === 'meli',
        isCustomer: isElaboro || role === 'cliente' || role === 'operador',
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
