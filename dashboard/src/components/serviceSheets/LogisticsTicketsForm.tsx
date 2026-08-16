import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  processWeighbridgeTicketOcr,
  uploadSheetTicket,
} from '@/services/ocr';
import {
  ticketHasWeights,
  type ServiceSheet,
  type WeighbridgeTicket,
} from '@/types';
import { Camera, Plus, Trash2 } from 'lucide-react';

const fieldClass =
  'w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

interface LogisticsTicketsFormProps {
  sheet: ServiceSheet;
  onChange: (sheet: ServiceSheet) => void;
  onComplete: (sheet: ServiceSheet) => void | Promise<void>;
  busy?: boolean;
}

export function LogisticsTicketsForm({
  sheet,
  onChange,
  onComplete,
  busy,
}: LogisticsTicketsFormProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tickets = sheet.tickets ?? [];
  const canAdd = tickets.length < 4;
  const canComplete = tickets.some(ticketHasWeights);

  const updateTicket = (id: string, patch: Partial<WeighbridgeTicket>) => {
    onChange({
      ...sheet,
      tickets: tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  };

  const removeTicket = (id: string) => {
    onChange({
      ...sheet,
      tickets: tickets.filter((t) => t.id !== id),
    });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !canAdd) return;
    setOcrBusy(true);
    setError(null);
    const ticketId = `ticket-${Date.now()}`;
    try {
      const result = await processWeighbridgeTicketOcr(file, ticketId);
      let photoUri: string | undefined;
      try {
        photoUri = await uploadSheetTicket(sheet.id, ticketId, result.imageBlob);
      } catch (uploadErr) {
        console.warn('Ticket photo upload failed', uploadErr);
      }
      const next: WeighbridgeTicket = {
        ...result.ticket,
        ...(photoUri ? { photoUri } : {}),
      };
      onChange({
        ...sheet,
        tickets: [...tickets, next],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.tickets.ocrError);
    } finally {
      setOcrBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-600">{t.tickets.hint}</p>

      {sheet.photoUri && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-surface-500">
            {t.tickets.orderPhoto}
          </p>
          <img
            src={sheet.photoUri}
            alt="Orden de salida"
            className="max-h-40 rounded-lg border border-surface-200 object-contain"
          />
        </div>
      )}

      <div className="space-y-3">
        {tickets.map((ticket, index) => (
          <div
            key={ticket.id}
            className="rounded-xl border border-surface-200 bg-surface-50/50 p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-surface-800">
                {t.tickets.ticketN} {index + 1}
              </p>
              <button
                type="button"
                className="text-rose-500 hover:text-rose-700"
                onClick={() => removeTicket(ticket.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {ticket.photoUri && (
              <img
                src={ticket.photoUri}
                alt={`Ticket ${index + 1}`}
                className="mb-3 max-h-32 rounded-lg border border-surface-200 object-contain"
              />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-surface-600">{t.tickets.scaleFolio}</span>
                <input
                  className={fieldClass}
                  value={ticket.scaleFolio ?? ''}
                  onChange={(e) =>
                    updateTicket(ticket.id, { scaleFolio: e.target.value })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-surface-600">
                  {t.tickets.scaleDateTime}
                </span>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={toLocal(ticket.scaleDateTime)}
                  onChange={(e) =>
                    updateTicket(ticket.id, {
                      scaleDateTime: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : undefined,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-surface-600">{t.tickets.tare}</span>
                <input
                  type="number"
                  step="any"
                  className={fieldClass}
                  value={ticket.tareWeight ?? ''}
                  onChange={(e) =>
                    updateTicket(ticket.id, {
                      tareWeight: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-surface-600">{t.tickets.gross}</span>
                <input
                  type="number"
                  step="any"
                  className={fieldClass}
                  value={ticket.grossWeight ?? ''}
                  onChange={(e) =>
                    updateTicket(ticket.id, {
                      grossWeight: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-surface-600">{t.tickets.net}</span>
                <input
                  type="number"
                  step="any"
                  className={fieldClass}
                  value={ticket.netWeight ?? ''}
                  onChange={(e) =>
                    updateTicket(ticket.id, {
                      netWeight: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-surface-600">
                  {t.tickets.discount}
                </span>
                <input
                  type="number"
                  step="any"
                  min={0}
                  max={100}
                  className={fieldClass}
                  value={ticket.discountPercent ?? ''}
                  onChange={(e) =>
                    updateTicket(ticket.id, {
                      discountPercent:
                        e.target.value === ''
                          ? undefined
                          : Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {canAdd && (
        <Button
          type="button"
          variant="secondary"
          disabled={ocrBusy || busy}
          onClick={() => fileRef.current?.click()}
          className="w-full sm:w-auto"
        >
          <Camera className="mr-2 h-4 w-4" />
          {ocrBusy ? t.tickets.ocrProcessing : t.tickets.addTicket}
          <Plus className="ml-2 h-4 w-4" />
        </Button>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Button
        type="button"
        disabled={!canComplete || busy || ocrBusy}
        onClick={() => void onComplete(sheet)}
        className={cn('w-full sm:w-auto')}
      >
        {busy ? t.common.saving : t.tickets.complete}
      </Button>
    </div>
  );
}

function toLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.length >= 16 ? iso.slice(0, 16) : '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
