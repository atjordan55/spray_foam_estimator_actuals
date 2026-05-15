import './index.css';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import SprayFoamEstimator from './App.jsx';
import AdminConsole from './AdminConsole.jsx';

function App() {
  const [page, setPage] = useState(window.location.hash === '#/admin' ? 'admin' : 'estimator');

  useEffect(() => {
    const handleHash = () => {
      setPage(window.location.hash === '#/admin' ? 'admin' : 'estimator');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (page === 'admin') {
    return <AdminConsole onBack={() => { window.location.hash = ''; setPage('estimator'); }} />;
  }

  return <SprayFoamEstimator onAdmin={() => { window.location.hash = '#/admin'; setPage('admin'); }} />;
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
