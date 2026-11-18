import { useEffect, type ReactNode } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';

interface PageHeaderProps {
  title: string;
  description?: string;
  // Main action(s) of the page; the theme switch is always the last element, top right.
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} · Crezia`;
  }, [title]);

  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="head-actions">
        {actions}
        <ThemeToggle />
      </div>
    </div>
  );
}
