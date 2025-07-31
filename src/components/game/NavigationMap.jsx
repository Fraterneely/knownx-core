import React, { useEffect, useRef, useState, useCallback } from 'react';
import NavigationInfo from './NavigationInfo';
import { CELESTIAL_BODIES } from '../../entities/CelestialBodies';
import { Vector3 } from 'three';

const NavigationMap = ({ spacecraft }) => {
  const canvasRef = useRef(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);

  const drawGrid = useCallback((ctx, width, height, cellSize, zoom) => {
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= width; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spacecraft || !spacecraft.position) return;

    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    ctx.save();

    // Define a scale to convert AU to pixels.
    const AU_TO_PIXEL_SCALE = 150; // Adjusted for better visibility

    // Calculate the spacecraft's position in pixels relative to the Sun
    const spacecraftMapX = 0;
    const spacecraftMapY = 0;

    // Apply transformations:
    ctx.translate(center + offsetX, center + offsetY); // Move origin to canvas center + pan
    ctx.rotate(rotation); // Apply rotation
    ctx.scale(zoom, zoom); // Apply zoom around this new origin
    
    // Draw grid background
    drawGrid(ctx, size, size, 20); // Cell size 20px, zoom handled by ctx.scale



    // Draw celestial bodies and their orbits
    const drawCelestialBodies = () => {
      const bodies = Object.values(CELESTIAL_BODIES);

      bodies.forEach(body => {
        // Convert 3D position (AU) to 2D map coordinates (pixels)
        // Positions are now relative to the solar system origin (Sun at 0,0)
        const mapX = body.position.x * AU_TO_PIXEL_SCALE;
        const mapY = body.position.z * AU_TO_PIXEL_SCALE; // Using Z for Y on 2D map

        // Draw body
        ctx.beginPath();
        // Adjust size for visibility on map, ensuring a minimum size and no zoom scaling
        const bodyMapRadius = Math.max(2, body.radius * AU_TO_PIXEL_SCALE * 0.000005 / zoom); 
        ctx.arc(mapX, mapY, bodyMapRadius, 0, Math.PI * 2);
        ctx.fillStyle = body.color || 'white';
        ctx.fill();
        ctx.closePath();

        // Draw orbit (centered around the body it orbits, or the Sun)
        if (body.orbitalRadius) {
          let orbitCenterX = 0;
          let orbitCenterY = 0;

          if (body.orbits) { // If it orbits another body (e.g., Moon orbits Earth)
            const orbitingBody = CELESTIAL_BODIES[body.orbits];
            if (orbitingBody) {
              orbitCenterX = orbitingBody.position.x * AU_TO_PIXEL_SCALE;
              orbitCenterY = orbitingBody.position.z * AU_TO_PIXEL_SCALE;
            }
          }
          
          ctx.beginPath();
          ctx.arc(orbitCenterX, orbitCenterY, body.orbitalRadius * AU_TO_PIXEL_SCALE, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.stroke();
          ctx.closePath();
        }

        // Highlight target body
        if (spacecraft && spacecraft.target_body === body.name) {
          ctx.strokeStyle = 'cyan';
          ctx.lineWidth = 0.5 / zoom; // Scale line width inversely with zoom
          ctx.stroke();
        }

        // Draw name and distance
        ctx.save(); // Save context before applying inverse scale for text
        ctx.translate(mapX, mapY); // Translate to the body's scaled position
        ctx.scale(1 / zoom, 1 / zoom); // Apply inverse scale for text
        ctx.fillStyle = 'white';
        ctx.font = `10px Arial`; // Font size remains constant
        ctx.fillText(body.name, 5, -5); // Draw text relative to the translated point
        ctx.restore(); // Restore context
      });
    };

    drawCelestialBodies();
    ctx.restore();

    // Draw spacecraft pointer
    if (spacecraft && spacecraft.position) {
      ctx.save();
      // Translate to the spacecraft's absolute position on the map
      // The main canvas transformation no longer centers on the spacecraft, so we draw it at its actual scaled position.
      ctx.translate(spacecraftMapX, spacecraftMapY);
      ctx.scale(1 / zoom, 1 / zoom); // Apply inverse scale for the pointer so it doesn't zoom

      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2); // Draw at (0,0) relative to its translated position
      ctx.fill();
      ctx.closePath();

      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 10);
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    }

    // Calculate and display distances (example for one body, extend as needed)
    if (spacecraft && CELESTIAL_BODIES.Earth) {
      const earthPos = CELESTIAL_BODIES.Earth.position;
      const spacecraftPos = spacecraft.position;
      const distance = Math.sqrt(
        Math.pow(spacecraftPos.x - earthPos.x, 2) +
        Math.pow(spacecraftPos.y - earthPos.y, 2) +
        Math.pow(spacecraftPos.z - earthPos.z, 2)
      );

      ctx.save();
      // Translate to the spacecraft's absolute position on the map
      ctx.translate(spacecraftMapX, spacecraftMapY);
      ctx.scale(1 / zoom, 1 / zoom); // Apply inverse scale for text
      ctx.fillStyle = 'white';
      ctx.font = `10px Arial`;
      // Position the text relative to the spacecraft's actual drawn position
      ctx.fillText(`Distance to Earth: ${distance.toFixed(2)} AU`, 10, 20);
      ctx.restore();
    }

  }, [spacecraft, zoom, rotation, offsetX, offsetY]);

  const resetRotation = () => {
    setRotation(0); // Reset rotation to North up
    setOffsetX(0); // Reset pan
    setOffsetY(0); // Reset pan
  };

  return (
    <div className="absolute bottom-16 left-4 bg-gray-900/60 border-gray-700/50 text-gray-300 p-4 rounded-lg shadow-lg backdrop-blur-md">
      <h3 className="text-lg font-bold mb-2">Navigation Map</h3>
      <NavigationInfo spacecraft={spacecraft} />
       <canvas 
      ref={canvasRef} 
      id="navigation-map-canvas" 
      className="w-96 h-96 bg-black rounded-md cursor-grab active:cursor-grabbing"
      onMouseDown={(e) => {
        setIsDragging(true);
        setLastMouseX(e.clientX);
        setLastMouseY(e.clientY);
      }}
      onMouseMove={(e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;

        if (e.shiftKey) {
          // If Shift is pressed, rotate
          const angle = Math.atan2(dy, dx);
          setRotation(prev => prev + angle * 0.05); // Adjust sensitivity as needed
        } else {
          // Otherwise, pan
          setOffsetX(prev => prev + dx);
          setOffsetY(prev => prev + dy);
        }
        setLastMouseX(e.clientX);
        setLastMouseY(e.clientY);
      }}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onWheel={(e) => {
        e.preventDefault();
        const scaleAmount = 0.1;
        const newZoom = e.deltaY < 0 ? zoom * (1 + scaleAmount) : zoom / (1 + scaleAmount);
        setZoom(Math.max(0.1, Math.min(5, newZoom))); // Prevent zooming too far out or in
      }}
    ></canvas>

    {/* North indicator and reset button */}
    <div className="absolute bottom-4 right-4 flex flex-col items-center">
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full mb-2"
        onClick={resetRotation}
      >
        Reset View
      </button>
      <div className="relative w-12 h-12">
        {/* North Arrow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            transform: `translate(-50%, -50%) rotate(${-rotation}rad)`,
            transformOrigin: 'center center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L12 22M12 2L17 7M12 2L7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="12" y="20" textAnchor="middle" fill="white" fontSize="10" fontFamily="Arial">N</text>
          </svg>
        </div>
      </div>
    </div>
    </div>
  );
};

export default NavigationMap;