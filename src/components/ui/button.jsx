import React from 'react';
import clsx from 'clsx';

export function Button({ children, className, variant = 'default', size = 'md', disabled = false, ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none transition-all duration-200 shadow-sm';

  const variants = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20',
    outline: 'border border-gray-700/50 text-gray-200 bg-gray-800/40 backdrop-blur-sm hover:bg-gray-700/60 hover:border-gray-600/70',
    ghost: 'bg-transparent hover:bg-gray-800/40 text-gray-300 hover:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/20',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20',
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    icon: 'p-2',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  return (
    <button 
      className={clsx(base, variants[variant], sizes[size], disabledClasses, className)} 
      disabled={disabled} 
      {...props}
    >
      {children}
    </button>
  );
}
