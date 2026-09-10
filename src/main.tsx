import React from 'react';
import { createRoot } from 'react-dom/client';
import '../app/globals.css';
import '../app/expedition.css';
import '../app/pilgrimage.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
const root = createRoot(document.getElementById('root')!);
if (import.meta.env.DEV && location.pathname.startsWith('/dev/')) {
  void import('./dev/DevApp').then(({ default: DevApp }) =>
    root.render(
      <React.StrictMode>
        <DevApp />
      </React.StrictMode>,
    ),
  );
} else
  void import('../app/page').then(({ default: App }) =>
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  );
