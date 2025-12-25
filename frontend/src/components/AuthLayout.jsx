/* eslint-disable no-unused-vars */
import React from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import LogoIcon from "../../public/chat-logo.svg?react";
import Logo from "./Logo";
import sideImage from "../assets/sideImages.png";

// Image Section Component - moved outside to prevent recreation on re-render
const ImageSection = ({ navigate }) => (
  <motion.div
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="hidden md:flex w-full md:w-1/2 p-8 items-center justify-center bg-white"
  >
    {/* Image Container with Rounded Corners */}
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
      className="relative w-full h-full rounded-3xl overflow-hidden shadow-xl"
    >
      {/* Close Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/")}
        className="absolute top-6 right-6 z-50 w-8 h-8 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-300"
      >
        <X className="w-4 h-4 text-slate-700" />
      </motion.button>

      {/* Light Gradient Overlay - Very subtle for color tint only */}
      <div className="absolute inset-0 bg-gradient-to-br from-primaryColor/10 to-secondaryColor/10 pointer-events-none"></div>

      {/* Image */}
      <img
        src={sideImage}
        alt="Authentication"
        className="w-full h-full object-cover"
      />
    </motion.div>
  </motion.div>
);

// Form Section Component - moved outside to prevent recreation on re-render
const FormSection = ({
  navigate,
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  onFooterLinkClick,
}) => (
  <motion.div
    initial={{ opacity: 0, x: -50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 xl:p-20 flex flex-col justify-center bg-white overflow-y-auto"
  >
    <div className="max-w-md mx-auto w-full">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-12"
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity group cursor-pointer"
        >
          <Logo className="w-12 h-12" showText={true} textClassName="text-2xl font-bold text-[#040316]" />
        </button>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-bold text-slate-800 mb-3">{title}</h1>
        {subtitle && <p className="text-slate-600 text-base">{subtitle}</p>}
      </motion.div>

      {/* Form Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-6"
      >
        {children}
      </motion.div>

      {/* Footer Link */}
      {footerText && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 text-sm text-slate-600"
        >
          {footerText}{" "}
          <button
            onClick={onFooterLinkClick}
            className="text-primaryColor font-semibold underline hover:text-opacity-80 transition-colors cursor-pointer"
          >
            {footerLinkText}
          </button>
        </motion.div>
      )}
    </div>
  </motion.div>
);

const AuthLayout = ({
  children,
  title,
  subtitle,
  footerText,
  footerLink,
  footerLinkText,
  onFooterLinkClick,
  imagePosition = "right", // "left" or "right"
}) => {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white">
      {/* Main Container - Contains both form and image */}
      <div className="w-full h-full flex">
        {/* Conditionally render based on imagePosition */}
        {imagePosition === "left" ? (
          <>
            <ImageSection navigate={navigate} />
            <FormSection
              navigate={navigate}
              title={title}
              subtitle={subtitle}
              footerText={footerText}
              footerLinkText={footerLinkText}
              onFooterLinkClick={onFooterLinkClick}
            >
              {children}
            </FormSection>
          </>
        ) : (
          <>
            <FormSection
              navigate={navigate}
              title={title}
              subtitle={subtitle}
              footerText={footerText}
              footerLinkText={footerLinkText}
              onFooterLinkClick={onFooterLinkClick}
            >
              {children}
            </FormSection>
            <ImageSection navigate={navigate} />
          </>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;
