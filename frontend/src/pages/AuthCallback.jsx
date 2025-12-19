import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAuthClient } from "better-auth/client";

const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  basePath: "/api/better-auth",
});

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  console.log("AuthCallback rendered");
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session after GitHub OAuth callback
        const session = await authClient.getSession();

        if (session) {
          console.log("Session established:", session);
          // Store user data
          localStorage.setItem("betterAuthSession", JSON.stringify(session));
          // Redirect to home or dashboard
          navigate("/");
        } else {
          setError("Failed to establish session");
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (err) {
        console.error("Callback error:", err);
        setError("Authentication failed");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="w-full h-[100vh] bg-slate-200 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <p className="text-red-500 text-xl">{error}</p>
          <p className="text-gray-600 mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100vh] bg-slate-200 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <p className="text-[#20c7ff] text-xl">Authenticating...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
