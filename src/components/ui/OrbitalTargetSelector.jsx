import React, { useState, useEffect } from 'react';
import { CELESTIAL_BODIES } from '@/entities/CelestialBodies';
import { Spacecraft } from '@/entities/SpaceCraft';

const OrbitalTargetSelector = ({ isOpen, onClose, onSelectBody }) => {
  const [bodies, setBodies] = useState([]);

  useEffect(() => {
    // Get all celestial bodies
    const celestialBodies = Object.entries(CELESTIAL_BODIES).map(([key, body]) => ({
      id: key,
      name: body.name,
      type: body.type,
      category: 'celestial'
    }));
    
    // Get all spacecraft
    const spacecraftList = Spacecraft.list().map(spacecraft => ({
      id: `spacecraft-${spacecraft.name}`,
      name: spacecraft.name,
      type: 'Spacecraft',
      category: 'spacecraft'
    }));
    
    // Combine both lists
    setBodies([...celestialBodies, ...spacecraftList]);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
      <div className="bg-gray-900 border border-blue-500 rounded-lg p-4 w-80 max-h-96 overflow-y-auto">
        <h2 className="text-xl text-blue-400 mb-4">Select Orbital Target</h2>
        
        {/* Celestial Bodies Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-blue-300">Celestial Bodies</h3>
          <div className="space-y-2">
            {bodies.filter(body => body.category === 'celestial').map(body => (
              <button
                key={body.id}
                className="w-full text-left px-3 py-2 rounded bg-gray-800 hover:bg-blue-900 text-white"
                onClick={() => {
                  onSelectBody(body.id);
                  onClose();
                }}
              >
                {body.name} ({body.type})
              </button>
            ))}
          </div>
        </div>
        
        {/* Spacecraft Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-green-300">Spacecraft</h3>
          <div className="space-y-2">
            {bodies.filter(body => body.category === 'spacecraft').map(body => (
              <button
                key={body.id}
                className="w-full text-left px-3 py-2 rounded bg-green-700 hover:bg-green-800 text-white"
                onClick={() => {
                  onSelectBody(body.id);
                  onClose();
                }}
              >
                {body.name} ({body.type})
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrbitalTargetSelector;