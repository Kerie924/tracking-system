import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { FirestoreDataProvider } from '@/contexts/FirestoreDataContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DeparturesPage } from '@/pages/DeparturesPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { UsersPage } from '@/pages/UsersPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TvModePage } from '@/pages/TvModePage';

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <FirestoreDataProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departures"
              element={
                <ProtectedRoute>
                  <DeparturesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <UsersPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tv"
              element={
                <ProtectedRoute>
                  <TvModePage />
                </ProtectedRoute>
              }
            />
            <Route path="/sites" element={<Navigate to="/analytics" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </FirestoreDataProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
