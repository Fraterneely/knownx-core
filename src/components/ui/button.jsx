import React from 'react';
import clsx from 'clsx';

export function Button({ children, className, variant = 'default', size = 'md', ...props }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none transition';

  const variants = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    outline: 'border border-gray-400 text-gray-800 dark:text-white bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-white',
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
    icon: 'p-2',
  };

  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
