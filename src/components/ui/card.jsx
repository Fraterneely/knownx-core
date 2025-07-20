import React from 'react';
import clsx from 'clsx';

export function Card({ className, children }) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-800/50 bg-gray-900/70 shadow-lg backdrop-blur-md p-4',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return (
    <div className={clsx('mb-3', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }) {
  return (
    <h2 className={clsx('text-xl font-semibold text-white', className)}>
      {children}
    </h2>
  );
}

export function CardContent({ className, children }) {
  return (
    <div className={clsx('text-gray-200', className)}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children }) {
  return (
    <div className={clsx('mt-4 pt-3 border-t border-gray-700/50', className)}>
      {children}
    </div>
  );
}
