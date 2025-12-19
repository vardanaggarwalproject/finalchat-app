import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import Home from "./pages/Home.jsx";

// Helper function to get token from cookies
const getTokenFromCookie = () => {
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "token") {
      return value;
    }
  }
  return null;
};

// Helper function to check if user is authenticated
const isAuthenticated = () => {
  try {
    // const token = getTokenFromCookie();
    const user = localStorage.getItem("user");
    console.log("jello");
    // For authentication, we primarily rely on localStorage user data
    // The cookie will be sent automatically with requests
    const isAuth = !!user;

    // console.log('🔐 Auth check:', {
    //   hasToken: !!token,
    //   hasUser: !!user,
    //   isAuthenticated: isAuth,
    //   allCookies: document.cookie
    // });

    return isAuth;
  } catch (error) {
    console.error(" Auth check error:", error);
    return false;
  }
};

// Protected Route Component - Only accessible when logged in
const ProtectedRoute = ({ children }) => {
  const isAuth = isAuthenticated();

  console.log("Protected route check:", isAuth);

  if (!isAuth) {
    console.log(" Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  console.log("Authenticated, rendering protected content");
  return children;
};

// Auth Route Component - Only accessible when NOT logged in
const AuthRoute = ({ children }) => {
  const isAuth = isAuthenticated();

  console.log(" Auth route check:", isAuth);

  if (isAuth) {
    console.log("Already authenticated, redirecting to home");
    return <Navigate to="/" replace />;
  }

  console.log("Not authenticated, rendering auth page");
  return children;
};

const App = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthRoute>
            <SignUp />
          </AuthRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      {/* Redirect any unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
