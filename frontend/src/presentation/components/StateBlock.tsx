import type { ReactNode } from 'react';
import { Icon } from './Icon';

// Shared states of every screen: loading, empty and error (the fourth, with data, is the screen itself).

export function LoadingSkeleton({ label = 'Cargando', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="skeleton" role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  text: string;
  action?: ReactNode;
}

export function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className="state">
      <Icon name="empty" />
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  text: string;
  onRetry: () => void;
}

export function ErrorState({ title, text, onRetry }: ErrorStateProps) {
  return (
    <div className="state" role="alert">
      <Icon name="warn" />
      <h2>{title}</h2>
      <p>{text}</p>
      <button type="button" className="btn secondary" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}
