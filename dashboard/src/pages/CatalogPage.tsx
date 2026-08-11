import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  seedDefaultSites,
  subscribeToSites,
  upsertCatalogSite,
} from '@/services/firestoreData';
import { siteDisplayName, type CatalogSite } from '@/types';
import { MapPin } from 'lucide-react';

export function CatalogPage() {
  const { t, language } = useTranslation();
  const { isAdmin } = useAuth();
  const [sites, setSites] = useState<CatalogSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    return subscribeToSites(
      (data) => {
        setSites(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  if (!isAdmin) {
    return (
      <Layout title={t.catalog.title} subtitle={t.users.adminOnly}>
        <p className="text-sm text-amber-800">{t.users.adminOnly}</p>
      </Layout>
    );
  }

  async function handleSeed() {
    setBusy(true);
    setMessage('');
    try {
      const n = await seedDefaultSites();
      setMessage(t.catalog.seeded.replace('{n}', String(n)));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t.catalog.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      const id = code.trim().toLowerCase().replace(/\s+/g, '-');
      await upsertCatalogSite({
        id,
        code: code.trim().toUpperCase(),
        formCodigo: code.trim().toUpperCase(),
        name: name.trim(),
        labelEn: name.trim(),
        labelEs: name.trim(),
        active: true,
      });
      setCode('');
      setName('');
      setMessage(t.catalog.saved);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t.catalog.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title={t.catalog.title} subtitle={t.catalog.subtitle}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void handleSeed()}>
          {t.catalog.seedDefaults}
        </Button>
      </div>
      {message && (
        <p className="mb-4 text-sm text-surface-700">{message}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.catalog.addSite}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input
                label={t.catalog.siteCode}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="MXCD-13"
              />
              <Input
                label={t.catalog.siteName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CEDIS Norte"
              />
              <Button type="submit" disabled={busy}>
                {t.common.save}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t.catalog.sitesList}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner />
            ) : (
              <ul className="divide-y divide-surface-100">
                {sites.map((site) => (
                  <li key={site.id} className="py-2 text-sm">
                    <span className="font-medium text-surface-900">
                      {siteDisplayName(site, language)}
                    </span>
                    <span className="ml-2 text-surface-500">({site.code})</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
