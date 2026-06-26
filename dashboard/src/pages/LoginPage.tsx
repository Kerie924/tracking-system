import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Recycle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  signInWithGoogle,
  signInWithFacebook,
  signInWithEmail,
  signUpWithEmail,
  getAuthErrorMessage,
} from '@/services/auth';

type AuthMode = 'signin' | 'signup';

export function LoginPage() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    setError('');
    setSubmitting(true);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithFacebook();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name || undefined);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Recycle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t.appName}</h1>
            <p className="text-sm text-white/70">{t.appSubtitle}</p>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight text-white">
            {t.auth.heroTitle}
          </h2>
          <p className="mt-4 max-w-md text-white/70">{t.auth.heroDesc}</p>
        </div>
        <p className="text-sm text-white/50">© {t.appName}</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface-50 p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
                <Recycle className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-surface-900">{t.appName}</h1>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-surface-900">
            {mode === 'signin' ? t.auth.signIn : t.auth.signUp}
          </h2>
          <p className="mt-1 text-sm text-surface-800/50">
            Google, Facebook {t.auth.orEmail}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={submitting}
              onClick={() => handleOAuth('google')}
            >
              <GoogleIcon />
              {t.auth.continueGoogle}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={submitting}
              onClick={() => handleOAuth('facebook')}
            >
              <FacebookIcon />
              {t.auth.continueFacebook}
            </Button>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-surface-200" />
            <span className="text-xs text-surface-400">{t.auth.orEmail}</span>
            <div className="h-px flex-1 bg-surface-200" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label={t.auth.name}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            <Input
              label={t.auth.email}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label={t.auth.password}
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? t.auth.processing
                : mode === 'signin'
                  ? t.auth.signIn
                  : t.auth.register}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-surface-800/50">
            {mode === 'signin' ? (
              <>
                {t.auth.noAccount}{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  {t.auth.register}
                </button>
              </>
            ) : (
              <>
                {t.auth.hasAccount}{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  {t.auth.signIn}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
