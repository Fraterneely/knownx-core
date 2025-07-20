import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export function Select({ children, onValueChange, defaultValue }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue || '');
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={selectRef}>
      {React.Children.map(children, child => {
        if (child.type === SelectTrigger) {
          return React.cloneElement(child, {
            onClick: () => setIsOpen(!isOpen),
            selectedValue
          });
        }
        if (child.type === SelectContent && isOpen) {
          return React.cloneElement(child, {
            onSelect: (value, label) => {
              setSelectedValue(label);
              onValueChange(value);
              setIsOpen(false);
            }
          });
        }
        return null;
      })}
    </div>
  );
}

export function SelectTrigger({ children, onClick, selectedValue, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-2 bg-gray-800/80 text-white rounded border border-gray-700/50 backdrop-blur-sm flex items-center justify-between"
      {...props}
    >
      {React.Children.map(children, child => {
        if (child.type === SelectValue) {
          return React.cloneElement(child, { selectedValue });
        }
        return child;
      })}
    </button>
  );
}

export function SelectContent({ children, onSelect }) {
  return (
    <div className="absolute z-50 mt-1 w-full bg-gray-800/90 backdrop-blur-md text-white shadow-lg rounded-md border border-gray-700/50 max-h-60 overflow-auto">
      {React.Children.map(children, child => {
        if (child.type === SelectItem) {
          return React.cloneElement(child, {
            onClick: () => onSelect(child.props.value, child.props.children)
          });
        }
        return child;
      })}
    </div>
  );
}

export function SelectItem({ children, value, onClick }) {
  return (
    <div
      className="px-3 py-2 hover:bg-blue-600/70 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function SelectValue({ placeholder, selectedValue }) {
  return <span className={selectedValue ? "text-white" : "text-gray-400"}>{selectedValue || placeholder}</span>;
}
