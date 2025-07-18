import React from 'react';
import clsx from 'clsx'; // Optional utility, remove if not using Tailwind + clsx

export function Card({ className, children }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border bg-white dark:bg-gray-900 shadow-lg p-4',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return (
    <div className={clsx('mb-4', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }) {
  return (
    <h2 className={clsx('text-2xl font-bold text-gray-900 dark:text-white', className)}>
      {children}
    </h2>
  );
}

export function CardContent({ className, children }) {
  return (
    <div className={clsx('text-gray-700 dark:text-gray-300', className)}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children }) {
  return (
    <div className={clsx('mt-4 pt-4 border-t dark:border-gray-700', className)}>
      {children}
    </div>
  );
}
