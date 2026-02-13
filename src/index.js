import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import { TelegramProvider } from "./reactContext/TelegramContext.js";
import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <TelegramProvider >
      <Router>
        <App />
      </Router>
    </TelegramProvider>
  </ErrorBoundary>
);

