
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MenuView from './components/MenuView';
import AdminView from './components/AdminView';
import Auth from './components/Auth';
import { AUTH_TOKEN_STORAGE_KEY } from './constants';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    setIsAuthenticated(Boolean(token));
  }, []);

  if (isAuthenticated === null) return null;

  return (
    <Router>
      <Routes>
        {/* Public menu board */}
        <Route path="/" element={<MenuView />} />
        
        {/* Admin panel logic */}
        <Route 
          path="/admin" 
          element={
            isAuthenticated ? (
              <AdminView />
            ) : (
              <Auth onLogin={() => setIsAuthenticated(true)} />
            )
          } 
        />
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
