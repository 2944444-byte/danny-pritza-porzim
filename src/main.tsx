/**
 * main.tsx — React entry point. Mounts <App /> into #root.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Root from './Root';
import './styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
