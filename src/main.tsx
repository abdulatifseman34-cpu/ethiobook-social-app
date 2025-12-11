/* global __app_id, __firebase_config, __initial_auth_token */
import React from 'react';
import { inject } from '@vercel/analytics';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize Vercel Analytics on the client side
inject();

// Initialize Firebase
// @ts-expect-error __app_id is provided globally
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
// @ts-expect-error __firebase_config is provided globally
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
// @ts-expect-error __initial_auth_token is provided globally
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// Render the app
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
