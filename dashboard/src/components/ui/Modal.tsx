import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  bare?: boolean;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'lg',
  bare = false,
  footer,
}: ModalProps) {
  if (!open) return null;

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 w-full animate-slide-up bg-white shadow-2xl sm:rounded-2xl',
          sizeClasses[size],
          'mx-0 max-h-[95vh] overflow-y-auto sm:mx-4 sm:max-h-[92vh]',
          bare ? 'rounded-t-2xl' : 'rounded-t-2xl'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-between border-b border-surface-200',
            bare ? 'bg-white px-3 py-2.5 sm:px-4' : 'px-4 py-3 sm:px-6 sm:py-4'
          )}
        >
          <h2
            className={cn(
              'min-w-0 flex-1 truncate pr-2 text-base font-semibold sm:text-lg',
              bare ? 'text-surface-800' : 'text-surface-900'
            )}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'rounded-lg p-1',
              bare
                ? 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'
                : 'text-surface-400 hover:bg-surface-100 hover:text-surface-600'
            )}
          >
            ✕
          </button>
        </div>
        <div className={bare ? 'bg-surface-50 p-2 sm:p-4' : 'p-4 sm:p-6'}>
          {children}
        </div>
        {footer && (
          <div className="border-t border-surface-200 bg-white px-3 py-3 sm:px-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="mb-4 h-12 w-12 text-surface-300" />}
      <h3 className="text-lg font-medium text-surface-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-surface-800/50">{description}</p>
    </div>
  );
}
