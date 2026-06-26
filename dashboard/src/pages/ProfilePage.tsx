import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { updateUserProfile } from '@/services/firestoreData';
import { getRoleLabel } from '@/i18n/translations';
import type { Language } from '@/types';
import { Globe, Shield, Check } from 'lucide-react';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const [name, setName] = useState('');
  const [selectedLang, setSelectedLang] = useState<Language>('es');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setSelectedLang(profile.language);
    }
  }, [profile]);

  if (!profile) {
    return (
      <Layout title={t.profile.title} subtitle={t.profile.subtitle}>
        <LoadingSpinner />
      </Layout>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateUserProfile(profile!.id, { name: name.trim() });
      if (selectedLang !== language) {
        await setLanguage(selectedLang);
      } else {
        await refreshProfile();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title={t.profile.title} subtitle={t.profile.subtitle}>
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
              {saved && (
                <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                  <Check className="h-4 w-4" />
                  {t.profile.saved}
                </div>
              )}

              <Input
                label={t.profile.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label={t.profile.email}
                value={profile.email}
                disabled
                readOnly
              />

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-surface-800/70">
                  <Shield className="h-4 w-4" />
                  {t.profile.role}
                </label>
                <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-medium text-surface-900">
                  {getRoleLabel(profile.role, language)}
                </div>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-surface-800/70">
                  <Globe className="h-4 w-4" />
                  {t.profile.language}
                </label>
                <p className="mb-3 text-xs text-surface-800/50">
                  {t.profile.languageHint}
                </p>
                <Select
                  label=""
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value as Language)}
                  options={[
                    { value: 'es', label: t.profile.spanish },
                    { value: 'en', label: t.profile.english },
                  ]}
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? t.profile.saving : t.profile.save}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
