import React, { useState } from 'react';

export function Select({ children, onValueChange }) {
  return <div className="relative">{children}</div>;
}

export function SelectTrigger({ children, ...props }) {
  return (
    <button
      {...props}
      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
    >
      {children}
    </button>
  );
}

export function SelectContent({ children }) {
  return (
    <div className="absolute z-10 mt-1 w-full bg-white text-black shadow rounded max-h-40 overflow-auto">
      {children}
    </div>
  );
}

export function SelectItem({ children, value, onClick }) {
  return (
    <div
      className="px-3 py-2 hover:bg-blue-500 hover:text-white cursor-pointer"
      onClick={() => onClick?.(value)}
    >
      {children}
    </div>
  );
}

export function SelectValue({ placeholder }) {
  return <span className="text-gray-300">{placeholder}</span>;
}
