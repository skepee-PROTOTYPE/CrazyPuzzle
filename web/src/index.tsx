import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error handler for debugging
window.addEventListener('error', (event) => {
});

window.addEventListener('unhandledrejection', (event) => {
});

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  throw new Error("Root container not found");
}
