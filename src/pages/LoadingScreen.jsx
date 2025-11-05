import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + Math.random() * 15, 100);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate('/menu'), 800);
        }
        return next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-black to-blue-900 text-white">
      <motion.div
        className="text-4xl font-bold mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        Loading Universe...
      </motion.div>

      <div className="w-80 h-4 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <p className="mt-4 text-sm text-gray-300">{Math.floor(progress)}%</p>
    </div>
  );
}
