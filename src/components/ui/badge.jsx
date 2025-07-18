import React from 'react';
import clsx from 'clsx';

export function Badge({ children, variant = 'default', className }) {
  const base = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
  const variants = {
    default: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-400 text-black',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <span className={clsx(base, variants[variant], className)}>
      {children}
    </span>
  );
}
