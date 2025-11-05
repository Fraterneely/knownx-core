import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/loading'), 20000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <motion.img
        src="/assets/Logo-icon.png"
        alt="KNOWN Corp"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 3 }}
        className="w-48 h-48 mb-6"
      />
      <motion.h1
        className="text-black text-3xl font-bold tracking-widest"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 5 }}
      >
        KNOWN Corporation Presents
      </motion.h1>
    </div>
  );
}
