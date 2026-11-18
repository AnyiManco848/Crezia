import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './presentation/theme/theme.css';
import './presentation/theme/app.css';
import './application/validation/zodSetup';
import { App } from './presentation/app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
