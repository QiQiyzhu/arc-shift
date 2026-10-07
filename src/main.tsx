import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { DeviceNotice, LaunchBoundary, LoadingScreen } from './ui/LaunchShell';
import '../app/globals.css';
import '../app/expedition.css';
import '../app/pilgrimage.css';
import '../app/resonance.css';
import '../app/coach.css';
import '../app/release.css';
import '../app/art-direction.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
const root = createRoot(document.getElementById('root')!);
const App = lazy(() => {
  if (location.pathname === '/frontier')
    return import('./frontier/FrontierApp');
  if (location.pathname === '/build-trial') return import('./trial/TrialApp');
  if (location.pathname === '/challenge')
    return import('./activities/ActivityApp');
  if (import.meta.env.DEV && location.pathname.startsWith('/dev/'))
    return location.pathname === '/dev/trial-editor'
      ? import('./dev/TrialEditor')
      : location.pathname === '/dev/activity-editor'
        ? import('./dev/ActivityEditor')
        : location.pathname === '/dev/content-editor'
          ? import('./dev/ContentEditor')
          : location.pathname === '/dev/debugger'
            ? import('./dev/Debugger')
            : import('./dev/DevApp');
  return import('../app/page');
});
root.render(
  <React.StrictMode>
    <LaunchBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <App />
      </Suspense>
    </LaunchBoundary>
    <DeviceNotice />
  </React.StrictMode>,
);
