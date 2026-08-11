import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToServiceSheetsCollection,
  subscribeToUsers,
  computeStatsFromSheets,
  computeTrendsFromSheets,
  computeMaterialTrendsFromSheets,
} from '@/services/firestoreData';
import type { ServiceSheet, UserProfile } from '@/types';

interface FirestoreDataContextValue {
  sheets: ServiceSheet[];
  users: UserProfile[];
  stats: ReturnType<typeof computeStatsFromSheets>;
  sheetsLoading: boolean;
  usersLoading: boolean;
  sheetsError: string | null;
  usersError: string | null;
  canViewAllSheets: boolean;
  /** @deprecated Use canViewAllSheets */
  isAdmin: boolean;
}

const FirestoreDataContext = createContext<FirestoreDataContextValue | null>(null);

export function FirestoreDataProvider({ children }: { children: ReactNode }) {
  const {
    user,
    profile,
    canManageUsers,
    loading: authLoading,
  } = useAuth();

  const [sheetsRaw, setSheetsRaw] = useState<ServiceSheet[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  const userId = user?.uid;
  const profileName = profile?.name;
  const profileEmail = profile?.email ?? user?.email ?? undefined;

  // All signed-in users subscribe to top-level serviceSheets. Do not wait on
  // profile — a failed profile write must not block the dashboard forever.
  useEffect(() => {
    if (authLoading) {
      setSheetsLoading(true);
      return;
    }

    if (!userId) {
      setSheetsRaw([]);
      setSheetsLoading(false);
      setSheetsError(null);
      return;
    }

    setSheetsLoading(true);
    setSheetsError(null);

    const unsubscribe = subscribeToServiceSheetsCollection(
      {
        userId,
        canViewAllSheets: true,
        userName: profileName,
        userEmail: profileEmail,
      },
      (data) => {
        setSheetsRaw(data);
        setSheetsLoading(false);
        setSheetsError(null);
      },
      (err) => {
        setSheetsError(err.message);
        setSheetsLoading(false);
      }
    );

    return unsubscribe;
  }, [authLoading, userId, profileName, profileEmail]);

  // Load users for creator enrichment on sheets (and admin user management).
  useEffect(() => {
    if (authLoading) {
      setUsersLoading(true);
      return;
    }

    if (!userId) {
      setUsers([]);
      setUsersLoading(false);
      setUsersError(null);
      return;
    }

    setUsersLoading(true);
    setUsersError(null);

    const unsubscribe = subscribeToUsers(
      (data) => {
        setUsers(data);
        setUsersLoading(false);
        setUsersError(null);
      },
      (err) => {
        // Listing all users may be denied for non-admin; sheets still load.
        setUsers([]);
        setUsersError(err.message);
        setUsersLoading(false);
      }
    );

    return unsubscribe;
  }, [authLoading, userId]);

  const sheets = useMemo(() => {
    const usersMap = new Map(users.map((u) => [u.id, u]));
    return sheetsRaw.map((sheet) => {
      const owner = usersMap.get(sheet.userId) ?? usersMap.get(sheet.createdBy ?? '');
      if (!owner) return sheet;
      return {
        ...sheet,
        userName: owner.name || sheet.userName,
        userEmail: owner.email || sheet.userEmail,
      };
    });
  }, [sheetsRaw, users]);

  const stats = useMemo(() => computeStatsFromSheets(sheets), [sheets]);

  const value = useMemo(
    () => ({
      sheets,
      users,
      stats,
      sheetsLoading: sheetsLoading || authLoading,
      usersLoading: usersLoading || authLoading,
      sheetsError,
      usersError,
      canViewAllSheets: true,
      isAdmin: canManageUsers,
    }),
    [
      sheets,
      users,
      stats,
      sheetsLoading,
      usersLoading,
      authLoading,
      sheetsError,
      usersError,
      canManageUsers,
    ]
  );

  return (
    <FirestoreDataContext.Provider value={value}>
      {children}
    </FirestoreDataContext.Provider>
  );
}

function useFirestoreDataContext() {
  const ctx = useContext(FirestoreDataContext);
  if (!ctx) {
    throw new Error('useFirestoreDataContext must be used within FirestoreDataProvider');
  }
  return ctx;
}

export function useServiceSheets() {
  const { sheets, sheetsLoading, sheetsError, canViewAllSheets, isAdmin } =
    useFirestoreDataContext();
  return {
    sheets,
    loading: sheetsLoading,
    error: sheetsError,
    canViewAllSheets,
    isAdmin,
  };
}

export function useServiceSheetStats() {
  const ctx = useFirestoreDataContext();
  return {
    stats: ctx.stats,
    sheets: ctx.sheets,
    loading: ctx.sheetsLoading,
    error: ctx.sheetsError,
    canViewAllSheets: ctx.canViewAllSheets,
    isAdmin: ctx.isAdmin,
  };
}

export function useFirestoreUsers() {
  const { users, usersLoading, usersError } = useFirestoreDataContext();
  return {
    users,
    loading: usersLoading,
    error: usersError,
  };
}

export function useTrends(days: number) {
  const { sheets } = useFirestoreDataContext();
  const data = useMemo(
    () => computeTrendsFromSheets(sheets, days),
    [sheets, days]
  );
  return { data };
}

export function useMaterialTrends(days: number) {
  const { sheets } = useFirestoreDataContext();
  const data = useMemo(
    () => computeMaterialTrendsFromSheets(sheets, days),
    [sheets, days]
  );
  return { data };
}
