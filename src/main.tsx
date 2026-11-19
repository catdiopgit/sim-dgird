// v8.6.6 : polices hébergées par le SIM (plus d'appel à Google Fonts).
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/spectral/latin-500.css';
import '@fontsource/spectral/latin-600.css';
import '@fontsource/spectral/latin-700.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
