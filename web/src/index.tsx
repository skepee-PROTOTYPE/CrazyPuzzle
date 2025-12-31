import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error handler for debugging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  alert('Error: ' + event.error?.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  alert('Promise error: ' + event.reason);
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
  console.error("Root container not found");
  alert("Critical error: Root container not found");
  throw new Error("Root container not found");
}
