import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource/ibm-plex-sans-thai/400.css';
import '@fontsource/ibm-plex-sans-thai/500.css';
import '@fontsource/ibm-plex-sans-thai/600.css';
import '@fontsource/ibm-plex-sans-thai/700.css';
import '@fontsource/ibm-plex-mono/500.css';
import { App } from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);
