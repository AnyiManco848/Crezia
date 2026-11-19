import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { ThemeProvider } from '../theme/ThemeProvider';
import { createQueryClient } from './queryClient';
import { AppRoutes } from './routes';
import { SessionWatcher } from './SessionWatcher';

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SessionWatcher />
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
