import React from 'react';

const Label = ({ id, name, x, y, display, isSelected, bodyData, distance }) => {
  if (display === 'none') {
    return null;
  }

  return (
    <div
      key={id} // Unique key for React list rendering
      className="absolute px-2 py-1 bg-black/50 text-white text-xs rounded pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translateY(-50%)`,
        display: display,
      }}
    >
      {isSelected ? (
        <>
          <div className="font-bold">{name}</div>
          <div className="text-xs opacity-80">Mass: {bodyData.mass.toExponential(2)} kg</div>
          <div className="text-xs opacity-80">Radius: {(bodyData.radius * 149597870.7).toFixed(0)} km</div>
          {bodyData.orbitalPeriod && (
            <div className="text-xs opacity-80">Orbital Period: {bodyData.orbitalPeriod} days</div>
          )}
          {bodyData.rotationPeriod && (
            <div className="text-xs opacity-80">Rotation Period: {Math.abs(bodyData.rotationPeriod)} days{bodyData.rotationPeriod < 0 ? ' (retrograde)' : ''}</div>
          )}
          {distance !== undefined && (
            <div className="text-xs opacity-80">
              Distance: {distance.toFixed(4)} AU
              <span className="text-xs text-gray-400 ml-1">
                ({(distance * 149597870.7).toFixed(0)} km)
              </span>
            </div>
          )}
        </>
      ) : (
        name
      )}
    </div>
  );
};

export default Label;