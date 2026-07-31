/**
 * main.tsx — React entry point. Providers: TanStack Query + Router; the toast
 * stack is mounted once here so notifications appear on every route.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import { ToastStack } from './components/Toast';
import './styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastStack />
    </QueryClientProvider>
  </StrictMode>,
);
