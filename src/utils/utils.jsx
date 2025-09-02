import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState } from "react";

/**
 * A utility function that merges multiple class names together,
 * handling Tailwind CSS conflicts properly.
 * 
 * @param {...string} inputs - Class names or conditional class expressions
 * @returns {string} - Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(1);
};

export const formatTime = (hours) => {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${m}m`;
};

export const getStatusColor = (current, max) => {
  const percentage = (current / max) * 100;
  if (percentage > 60) return 'bg-green-500';
  if (percentage > 30) return 'bg-yellow-500';
  return 'bg-red-500';
};

const AU_IN_KM = 149597870.7;

function VelocityDisplay({ velocity }) {
  const [unit, setUnit] = useState("km/h");

  // Compute velocity magnitude in AU/sec
  const velAuPerSec = Math.sqrt(
    velocity.x ** 2 +
    velocity.y ** 2 +
    velocity.z ** 2
  );

  // Convert based on unit
  let displayValue = 0;
  if (unit === "km/h") {
    displayValue = velAuPerSec * AU_IN_KM * 3600;
  } else if (unit === "km/s") {
    displayValue = velAuPerSec * AU_IN_KM;
  } else if (unit === "AU/day") {
    displayValue = velAuPerSec * 86400; // 86400 sec in a day
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1">
        <span>Velocity:</span>
        <span className="font-mono text-lg font-bold">
          {displayValue.toFixed(4)} {unit}
        </span>
      </div>

      {/* Switcher */}
      <div className="relative inline-flex items-center rounded-md shadow-sm bg-gray-800">
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="appearance-none bg-transparent border-none text-white py-1 pl-3 pr-8 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        >
          <option value="km/h">km/h</option>
          <option value="km/s">km/s</option>
          <option value="AU/day">AU/day</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
          <svg
            className="fill-current h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default VelocityDisplay;
