import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DEV_ALL_ADMIN } from '@/lib/config';
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
  isAdmin: boolean;
}

const FirestoreDataContext = createContext<FirestoreDataContextValue | null>(null);

export function FirestoreDataProvider({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const canLoadAdminData = isAdmin || DEV_ALL_ADMIN;

  const [sheetsRaw, setSheetsRaw] = useState<ServiceSheet[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  const userId = user?.uid;
  const profileId = profile?.id;
  const profileName = profile?.name;
  const profileEmail = profile?.email;

  useEffect(() => {
    if (authLoading || !userId || !profileId) {
      setSheetsRaw([]);
      setSheetsLoading(!authLoading);
      return;
    }

    setSheetsLoading(true);
    setSheetsError(null);

    const unsubscribe = subscribeToServiceSheetsCollection(
      {
        userId,
        isAdmin: canLoadAdminData,
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
  }, [authLoading, userId, profileId, profileName, profileEmail, canLoadAdminData]);

  useEffect(() => {
    if (authLoading || !userId || !canLoadAdminData) {
      setUsers([]);
      setUsersLoading(false);
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
        setUsersError(err.message);
        setUsersLoading(false);
      }
    );

    return unsubscribe;
  }, [authLoading, userId, canLoadAdminData]);

  const sheets = useMemo(() => {
    if (!canLoadAdminData) return sheetsRaw;

    const usersMap = new Map(users.map((u) => [u.id, u]));
    return sheetsRaw.map((sheet) => {
      const owner = usersMap.get(sheet.userId);
      if (!owner) return sheet;
      return {
        ...sheet,
        userName: owner.name || sheet.userName,
        userEmail: owner.email || sheet.userEmail,
      };
    });
  }, [sheetsRaw, users, canLoadAdminData]);

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
      isAdmin: canLoadAdminData,
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
      canLoadAdminData,
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
  const { sheets, sheetsLoading, sheetsError, isAdmin } = useFirestoreDataContext();
  return {
    sheets,
    loading: sheetsLoading,
    error: sheetsError,
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
