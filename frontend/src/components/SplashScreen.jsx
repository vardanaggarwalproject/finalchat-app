import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";

/**
 * Beautiful splash screen with fade animation for VibeMesh
 * Shows on initial load with animated logo and text
 */
export function SplashScreen({ onComplete, duration = 3500 }) {
  const [show, setShow] = useState(true);
  const productName = "VibeMesh";

  // Generate random particles once to avoid impure function calls during render
  const particles = useMemo(() => {
    return [...Array(20)].map(() => ({
      width: Math.random() * 10 + 5,
      height: Math.random() * 10 + 5,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));
  }, []);

  useEffect(() => {
    // Wait for the specified duration before hiding
    const timer = setTimeout(() => {
      setShow(false);
      if (onComplete) {
        // Add a small delay for exit animation to complete
        setTimeout(onComplete, 600);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #EEC7F4 0%, #ABD4FF 50%, #C4B5FD 100%)",
          }}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {particles.map((particle, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: particle.width,
                  height: particle.height,
                  left: particle.left,
                  top: particle.top,
                  background: "rgba(255, 255, 255, 0.3)",
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  delay: particle.delay,
                }}
              />
            ))}
          </div>

          <motion.div
            exit={{ scale: 3 }}
            transition={{ duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto px-6"
          >
            {/* Logo with entrance animation */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: "easeOut",
              }}
              className="mb-8 md:mb-10"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 40px rgba(238, 199, 244, 0.5), 0 0 80px rgba(171, 212, 255, 0.3)",
                    "0 0 60px rgba(171, 212, 255, 0.6), 0 0 100px rgba(238, 199, 244, 0.4)",
                    "0 0 40px rgba(238, 199, 244, 0.5), 0 0 80px rgba(171, 212, 255, 0.3)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/95 flex items-center justify-center border-4 border-white/50"
              >
                <Logo className="w-16 h-16 md:w-20 md:h-20" />
              </motion.div>
            </motion.div>

            {/* Animated VibeMesh text - letters appear one by one */}
            <div className="mb-4 md:mb-6">
              <div className="flex flex-wrap justify-center items-center gap-x-1">
                {productName.split("").map((letter, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.3,
                      delay: 0.8 + index * 0.08,
                      ease: "easeOut",
                    }}
                    className="text-5xl md:text-6xl font-bold text-[#040316]"
                    style={{
                      textShadow: "0 2px 20px rgba(4, 3, 22, 0.2)",
                    }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Tagline with fade in */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: 2,
                ease: "easeOut",
              }}
              className="text-lg md:text-xl font-medium text-[#040316]/80 mb-8"
            >
              Connect, Chat, Collaborate
            </motion.p>

            {/* Loading indicator with animated dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: 2.2,
                ease: "easeOut",
              }}
              className="flex items-center gap-2"
            >
              <motion.p
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-base md:text-lg font-medium text-[#040316]/70"
              >
                Loading your experience
              </motion.p>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      y: [0, -6, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                    className="text-xl font-bold text-[#040316]"
                  >
                    .
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SplashScreen;
