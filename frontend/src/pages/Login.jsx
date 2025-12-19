/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axiosInstance from "../utils/axiosConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, LogIn, Mail, Lock } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      const result = await axiosInstance.post(`/api/auth/login`, {
        email,
        password,
      });

      // Store user and token in localStorage
      localStorage.setItem("user", JSON.stringify(result.data.user));
      localStorage.setItem("token", result.data.token);

      setEmail("");
      setPassword("");
      setLoading(false);

      // Show success toast
      toast.success("Login successful!", {
        description: "Welcome back! Redirecting to chat...",
        duration: 2000,
      });

      // Small delay to ensure localStorage is set before navigation
      setTimeout(() => {
        navigate("/chat", { replace: true });
      }, 100);
    } catch (error) {
      setLoading(false);
      setError(false);

      // Show error toast
      toast.error("Login failed", {
        description:
          error?.response?.data?.message ||
          "Please check your credentials and try again.",
        duration: 4000,
      });
    }
  };

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Welcome back! Please enter your details."
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      onFooterLinkClick={() => navigate("/signup")}
      imagePosition="right"
    >
      <form onSubmit={handleLogin} className="space-y-5">
        {/* Email Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="space-y-2"
        >
          <Label
            htmlFor="email"
            className="text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <Mail className="w-4 h-4 text-slate-500" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="amelielaurent7622@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 bg-white border border-slate-200 rounded-xl focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 transition-all duration-300"
          />
        </motion.div>

        {/* Password Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="space-y-2"
        >
          <Label
            htmlFor="password"
            className="text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <Lock className="w-4 h-4 text-slate-500" />
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              placeholder="••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 pr-12 bg-white border border-slate-200 rounded-xl focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 transition-all duration-300"
            />
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShow((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {show ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive" className="py-3 rounded-xl">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Login Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-[#040316] to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-[#040316] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-base cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Sign In
              </>
            )}
          </Button>
        </motion.div>
      </form>

      {/* Terms */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="text-xs text-center text-slate-500 mt-8"
      >
        By signing in, you agree to our{" "}
        <button className="text-primaryColor hover:text-darkPurple underline transition-colors cursor-pointer">
          Terms & Conditions
        </button>
      </motion.p>
    </AuthLayout>
  );
};

export default Login;
