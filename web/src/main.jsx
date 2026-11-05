import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/anuphan/400.css';
import '@fontsource/anuphan/500.css';
import '@fontsource/anuphan/600.css';
import '@fontsource/anuphan/700.css';
import '@fontsource/mitr/400.css';
import '@fontsource/mitr/500.css';
import '@fontsource/mitr/600.css';
import '@fontsource/jetbrains-mono/500.css';
import { queryClient } from './lib/api.js';
import { Toaster } from './components/ui/sonner.jsx';
import { TooltipProvider } from './components/ui/tooltip.jsx';
import { App } from './app/App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter><App /></BrowserRouter>
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>
);
