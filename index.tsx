import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { FocusProvider } from './context/FocusContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Detect AI Studio Preview environment (prevents double-mounting effects)
// Added scusercontent.goog to match index.html logic
const isPreview = window.location.hostname.includes('googleusercontent.com') || 
                  window.location.hostname.includes('scusercontent.goog') ||
                  window.location.hostname.includes('ai.studio');

console.log(`%c [System] Running in ${isPreview ? 'PREVIEW (StrictMode Disabled)' : 'STANDARD'} mode`, 'background: #222; color: #bada55');
console.log("%c [Build] Canonical tree: ROOT.", 'background: #333; color: #ff9900; font-weight: bold;');

// Runtime Guard: Check for unexpected path nesting during development
if (window.location.hostname === 'localhost' && window.location.pathname.includes('/src/')) {
    console.warn("%c [DEV] Application is running from a path containing 'src/'. Ensure you are serving the project root.", 'background: orange; color: black; font-size: 12px;');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const app = (
  <ErrorBoundary>
    <AuthProvider>
      <FocusProvider>
         <App />
      </FocusProvider>
    </AuthProvider>
  </ErrorBoundary>
);

root.render(
  isPreview ? app : <React.StrictMode>{app}</React.StrictMode>
);