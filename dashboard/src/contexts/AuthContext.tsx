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
import {
  ensureUserProfile,
  getUserProfile,
} from '@/services/firestoreData';
import { DEV_ALL_ADMIN } from '@/lib/config';
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
  isAdmin: boolean;
  isSupervisor: boolean;
  isMeli: boolean;
  isOperador: boolean;
  isCliente: boolean;
  isElaboro: boolean;
  canManageUsers: boolean;
  canViewAllSheets: boolean;
  canCreateSheets: boolean;
  canReviewRoleRequests: boolean;
  assignedSiteIds: string[];
  oauthError: string | null;
  clearOauthError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  role: 'elaboro',
  isAdmin: false,
  isSupervisor: false,
  isMeli: false,
  isOperador: false,
  isCliente: false,
  isElaboro: true,
  canManageUsers: false,
  canViewAllSheets: true,
  canCreateSheets: false,
  canReviewRoleRequests: false,
  assignedSiteIds: [],
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
            // Fall back to a read-only profile so the app can still load sheets.
            try {
              const p = await getUserProfile(firebaseUser.uid);
              setProfile(p);
            } catch {
              setProfile(null);
            }
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

  const role: UserRole = DEV_ALL_ADMIN
    ? 'admin'
    : profile
      ? normalizeUserRole(profile.role)
      : 'elaboro';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        role,
        isAdmin: role === 'admin',
        isSupervisor: role === 'supervisor',
        isMeli: role === 'meli',
        isOperador: role === 'operador',
        isCliente: role === 'cliente',
        isElaboro: role === 'elaboro',
        canManageUsers: canManageUsers(role),
        canViewAllSheets: canViewAllSheets(role),
        canCreateSheets: canCreateServiceSheet(role),
        canReviewRoleRequests: canReviewRoleRequests(role),
        assignedSiteIds: profile?.assignedSiteIds ?? [],
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
