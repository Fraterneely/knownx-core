import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/loading'), 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <motion.img
        src="/assets/Logo-icon.png"
        alt="KNOWN Corp"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5 }}
        className="w-48 h-48 mb-6"
      />
      <motion.h1
        className="text-white text-3xl font-light tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1.5 }}
      >
        KNOWN Corporation Presents
      </motion.h1>
    </div>
  );
}
