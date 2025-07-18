import React from 'react';

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  orientation = 'horizontal',
  className = '',
}) {
  const handleChange = (e) => {
    onValueChange([parseFloat(e.target.value)]);
  };

  return (
    <input
      type="range"
      value={value[0]}
      onChange={handleChange}
      min={min}
      max={max}
      step={step}
      className={`w-full ${orientation === 'vertical' ? 'rotate-90' : ''} ${className}`}
    />
  );
}
