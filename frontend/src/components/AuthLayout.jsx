/* eslint-disable no-unused-vars */
import React from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import LogoIcon from "../../public/chat-logo.svg?react";
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
          <div className="w-12 h-12 relative">
            <svg viewBox="0 0 584 675" className="w-full h-full">
              <defs>
                <linearGradient
                  id="logoGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#EEC7F4" />
                  <stop offset="50%" stopColor="#ABD4FF" />
                  <stop offset="100%" stopColor="#C4B5FD" />
                </linearGradient>
              </defs>
              <path
                fill="url(#logoGradient)"
                d="M211.81 238.5C203.929 238.488 196.196 240.647 189.46 244.74C191.647 244.048 193.927 243.693 196.22 243.69C200.926 243.683 205.514 245.166 209.326 247.925C213.138 250.684 215.98 254.579 217.444 259.051C218.909 263.524 218.921 268.345 217.478 272.825C216.036 277.304 213.213 281.213 209.414 283.991C205.616 286.768 201.035 288.273 196.329 288.29C191.623 288.306 187.033 286.834 183.215 284.082C179.397 281.331 176.547 277.443 175.073 272.973C173.599 268.504 173.577 263.683 175.01 259.2C170.069 267.334 167.963 276.877 169.021 286.336C170.079 295.794 174.241 304.635 180.858 311.477C187.474 318.319 196.171 322.775 205.589 324.149C215.007 325.523 224.614 323.737 232.91 319.071C241.205 314.405 247.72 307.122 251.436 298.36C255.153 289.598 255.861 279.851 253.45 270.644C251.039 261.437 245.644 253.288 238.11 247.473C230.577 241.657 221.328 238.501 211.81 238.5ZM291.88 0C130.68 0 0.000207164 130.68 0.000207164 291.88C-0.0464865 331.014 7.80068 369.755 23.0723 405.787C38.3439 441.818 60.7262 474.399 88.8802 501.58L56.8802 674.16L195.51 567.43L236.43 533.08L206.43 571.01C234.138 579.485 262.955 583.782 291.93 583.76C453.13 583.76 583.81 453.08 583.81 291.88C583.81 130.68 453.08 0 291.88 0ZM487.8 489L409.24 455.61C375.049 480.187 333.988 493.378 291.88 493.31C180.61 493.31 90.4102 403.11 90.4102 291.84C90.4102 180.57 180.61 90.41 291.88 90.41C403.15 90.41 493.35 180.61 493.35 291.88C493.419 335.821 479.053 378.569 452.46 413.55L487.8 489ZM432.19 265.92C432.19 270.617 430.705 275.195 427.946 278.997C425.188 282.799 421.297 285.632 416.832 287.09C412.366 288.547 407.554 288.556 403.084 287.114C398.613 285.672 394.713 282.853 391.941 279.061C389.169 275.268 387.667 270.696 387.65 265.999C387.634 261.301 389.103 256.719 391.847 252.907C394.592 249.095 398.472 246.248 402.932 244.774C407.392 243.3 412.204 243.274 416.68 244.7C407.692 239.247 397.018 237.276 386.676 239.159C376.333 241.041 367.039 246.648 360.549 254.918C354.059 263.188 350.824 273.549 351.454 284.043C352.085 294.537 356.538 304.436 363.971 311.869C371.405 319.303 381.304 323.755 391.797 324.386C402.291 325.017 412.652 321.781 420.922 315.291C429.193 308.802 434.799 299.507 436.681 289.164C438.564 278.822 436.593 268.148 431.14 259.16C431.842 261.358 432.196 263.653 432.19 265.96V265.92Z"
              />
            </svg>
          </div>
          <span className="text-2xl font-bold text-[#040316]">VibeMesh</span>
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
