import { forwardRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface BannerProps {
  kind: 'error' | 'info' | 'success';
  children: ReactNode;
}

// Error banners are announced right away (role="alert"); the others are polite status messages.
export const Banner = forwardRef<HTMLDivElement, BannerProps>(function Banner({ kind, children }, ref) {
  return (
    <div ref={ref} className={`banner ${kind}`} role={kind === 'error' ? 'alert' : 'status'} tabIndex={-1}>
      <Icon name={kind === 'success' ? 'check' : 'warn'} size={20} />
      <span>{children}</span>
    </div>
  );
});
