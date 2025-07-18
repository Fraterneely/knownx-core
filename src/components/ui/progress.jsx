import React from 'react';
import clsx from 'clsx';

export function Progress({ value = 0, className }) {
  return (
    <div className={clsx("w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
