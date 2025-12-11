import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import SignUp from './pages/SignUp.jsx'
import Home from './pages/Home.jsx'

// Helper function to check if user is authenticated
const isAuthenticated = () => {
  // Check both cookie and localStorage
  const token = document.cookie.split('token=')[1]?.split(';')[0];
  const user = localStorage.getItem('user');
  return token || user;
};

// Protected Route Component - Only accessible when logged in
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Auth Route Component - Only accessible when NOT logged in
const AuthRoute = ({ children }) => {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const App = () => {
  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          <AuthRoute>
            <Login/>
          </AuthRoute>
        } 
      />
      <Route 
        path="/signup" 
        element={
          <AuthRoute>
            <SignUp/>
          </AuthRoute>
        } 
      />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Home/>
          </ProtectedRoute>
        } 
      />
      {/* Redirect any unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App