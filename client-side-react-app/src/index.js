import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Fetch runtime configuration
fetch('/config/runtime-config.json')
  .then(response => response.json())
  .then(config => {
    // Set environment variables dynamically
    window._env_ = config;

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
  );})
  .catch(error => {
    console.error('Error fetching runtime configuration:', error);
  });

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
