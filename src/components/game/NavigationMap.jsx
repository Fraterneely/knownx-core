import React, { useRef, useEffect, useState } from 'react';
import NavigationInfo from './NavigationInfo';
import { CELESTIAL_BODIES } from '../../entities/CelestialBodies';

// Visual tuning knobs
const RENDER_MIN_PX = 0.5;
const RENDER_MAX_PX = 50;
const HIT_MIN_PX = 10;
const ZOOM_EXP = 0.35;
const UI_SCALE = 1.0;

const CLASS_MULT = {
  star: 16,
  planet: 2.6,
  dwarf: 1.1,
  moon: 1.0,
  asteroid: 0.8,
  default: 1.0,
};

function getClassMult(body) {
  return CLASS_MULT[body.type] ?? CLASS_MULT.default;
}

function radiusAUToPx(radiusAU, zoom, body) {
  if (!radiusAU || radiusAU <= 0) return RENDER_MIN_PX;
  const logR = Math.log10(radiusAU);
  const mu = 4.2;
  const sigma = 1.4;
  const s = 1 / (1 + Math.exp(-(logR - mu) / sigma));
  const basePx = RENDER_MIN_PX + (RENDER_MAX_PX - RENDER_MIN_PX) * s;
  const zoomFactor = Math.pow(zoom, ZOOM_EXP);
  const classMult = getClassMult(body);
  const px = basePx * zoomFactor * classMult * UI_SCALE;
  return Math.max(RENDER_MIN_PX, Math.min(RENDER_MAX_PX, px));
}

function hitRadiusPx(renderPx) {
  return Math.max(renderPx, HIT_MIN_PX);
}

// helper to test AABB overlap
const intersects = (a, b) =>
  !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);

// label priority mapping
const LABEL_PRIORITY = { star: 3, planet: 2, moon: 1, asteroid: 0, default: 0 };
function labelPriority(body) {
  return LABEL_PRIORITY[body.type] ?? LABEL_PRIORITY.default;
}

const NavigationMap = ({ spacecraft, gameTime }) => {
  const canvasRef = useRef(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);
  const [zoom, setZoom] = useState(142.0);
  const [rotation, setRotation] = useState(0);
  const [selectedBody, setSelectedBody] = useState(null);
  const [bodyPositions, setBodyPositions] = useState([]);
  const bodyPositionsRef = useRef([]);
  const spacecraftPixelXRef = useRef(0);
  const spacecraftPixelYRef = useRef(0);

  const AU_TO_PIXEL_SCALE = 300;

  // DPR-aware resize so canvas user-space == CSS pixels
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // set internal buffer size in device pixels
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      // Normalize so that 1 unit in canvas user-space == 1 CSS pixel
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clear in CSS pixel units
      ctx.clearRect(0, 0, rect.width, rect.height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Click handler uses screen-space positions (CSS pixels)
  const handleCanvasClick = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const positions = bodyPositionsRef.current || [];
    for (let i = positions.length - 1; i >= 0; i--) {
      const body = positions[i];
      const dx = mouseX - body.x;
      const dy = mouseY - body.y;
      if (dx * dx + dy * dy <= body.radius * body.radius) {
        setSelectedBody(body.data);
        return;
      }
    }
    setSelectedBody(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId = 0;

    const render = () => {
      if (!canvas || !spacecraft || !spacecraft.position) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Use CSS size for center calculations (since user-space now equals CSS pixels)
      const rect = canvas.getBoundingClientRect();
      const sizeX = rect.width;
      const sizeY = rect.height;
      const centerX = sizeX / 2;
      const centerY = sizeY / 2;

      ctx.clearRect(0, 0, sizeX, sizeY);
      ctx.save();

      // compute spacecraft pixel position in world (world units -> px)
      const spacecraftPixelX = spacecraft.position.x * AU_TO_PIXEL_SCALE;
      const spacecraftPixelY = spacecraft.position.z * AU_TO_PIXEL_SCALE;
      spacecraftPixelXRef.current = spacecraftPixelX;
      spacecraftPixelYRef.current = spacecraftPixelY;

      // Apply transforms (note: user-space is CSS px)
      ctx.translate(centerX + offsetX - spacecraftPixelX * zoom, centerY + offsetY - spacecraftPixelY * zoom);
      ctx.rotate(rotation);
      ctx.scale(zoom, zoom);

      const positions = [];
      const placedLabelBoxes = [];

      Object.values(CELESTIAL_BODIES).forEach((body) => {
        const mapX = body.position.x * AU_TO_PIXEL_SCALE;
        const mapY = body.position.z * AU_TO_PIXEL_SCALE;

        // compute render radius in px (screen units) using your perceptual mapping
        const bodyRenderRadiusPx = radiusAUToPx(body.radius, zoom, body);

        // Draw body (divide by zoom because context is scaled by zoom)
        ctx.beginPath();
        ctx.arc(mapX, mapY, bodyRenderRadiusPx / zoom, 0, Math.PI * 2);
        ctx.fillStyle = body.color || 'white';
        ctx.fill();
        ctx.lineWidth = 1 / zoom;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.stroke();
        ctx.closePath();

        // get screen-space transform (returns CSS pixel coordinates because of ctx.setTransform earlier)
        const m = ctx.getTransform();
        const screen = { x: m.a * mapX + m.c * mapY + m.e, y: m.b * mapX + m.d * mapY + m.f };

        positions.push({
          name: body.name,
          x: screen.x,
          y: screen.y,
          radius: hitRadiusPx(bodyRenderRadiusPx),
          data: body,
        });

        // Draw orbit in world space (same transform)
        if (body.orbitalRadius) {
          let orbitCenterX = 0;
          let orbitCenterY = 0;
          if (body.parent && CELESTIAL_BODIES[body.parent]) {
            const p = CELESTIAL_BODIES[body.parent];
            orbitCenterX = p.position.x * AU_TO_PIXEL_SCALE;
            orbitCenterY = p.position.z * AU_TO_PIXEL_SCALE;
          }
          ctx.beginPath();
          ctx.arc(orbitCenterX, orbitCenterY, body.orbitalRadius * AU_TO_PIXEL_SCALE, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1 / zoom;
          ctx.stroke();
          ctx.closePath();
        }

        // Label placement (use screen coords for bbox checks)
        // compute label bbox in screen-space (CSS px)
        ctx.save();
        ctx.scale(1 / zoom, 1 / zoom); // keep text readable
        ctx.font = '11px Arial';
        const label = body.name;
        const metrics = ctx.measureText(label);
        const labelW = metrics.width;
        const labelH = 12;

        // candidate box positioned relative to screen point
        const candidateBox = {
          x: screen.x + 15,
          y: screen.y - 5 - labelH,
          w: labelW,
          h: labelH,
          priority: labelPriority(body),
        };

        // collision check
        let collides = false;
        for (const placed of placedLabelBoxes) {
          if (intersects(candidateBox, placed)) {
            if (placed.priority >= candidateBox.priority) {
              collides = true;
              break;
            } else {
              // replace lower-priority placed label
              placedLabelBoxes.splice(placedLabelBoxes.indexOf(placed), 1);
            }
          }
        }

        if (!collides) {
          // draw label using world-space transform but keep text readable
          ctx.restore();
          ctx.save();
          ctx.translate(mapX, mapY);
          ctx.scale(1 / zoom, 1 / zoom);
          ctx.fillStyle = 'white';
          ctx.font = '11px Arial';
          ctx.fillText(label, 15, 5);
          ctx.restore();

          // store placed label in screen-space
          placedLabelBoxes.push(candidateBox);
        } else {
          ctx.restore();
        }
      }); // end forEach bodies

      // push positions to state + ref (ref used for clicks to avoid staleness)
      setBodyPositions(positions);
      bodyPositionsRef.current = positions;

      // Draw spacecraft
      ctx.beginPath();
      ctx.arc(spacecraftPixelX, spacecraftPixelY, 5 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.closePath();

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [spacecraft, zoom, rotation, offsetX, offsetY]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 text-gray-300 p-4 rounded-lg backdrop-blur-md w-full h-full">
        {/* <NavigationInfo spacecraft={spacecraft} /> */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          id="navigation-map-canvas"
          className="w-full h-full bg-none"
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
              const angle = Math.atan2(dy, dx);
              setRotation((prev) => prev + angle * 0.005);
            } else {
              setOffsetX((p) => p + dx);
              setOffsetY((p) => p + dy);
            }
            setLastMouseX(e.clientX);
            setLastMouseY(e.clientY);
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onWheel={(e) => {
            e.preventDefault();
            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const scaleAmount = 0.1;
            const newZoom = e.deltaY < 0 ? zoom * (1 + scaleAmount) : zoom / (1 + scaleAmount);
            const oldZoom = zoom;
            const worldX = (mouseX - (rect.width / 2 + offsetX)) / oldZoom;
            const worldY = (mouseY - (rect.height / 2 + offsetY)) / oldZoom;
            setZoom(Math.max(0.0001, Math.min(1440, newZoom)));
            const newOffsetX = mouseX - (rect.width / 2) - worldX * newZoom;
            const newOffsetY = mouseY - (rect.height / 2) - worldY * newZoom;
            setOffsetX(newOffsetX);
            setOffsetY(newOffsetY);
          }}
        />
      </div>

      <div className="absolute top-4 right-4 bg-gray-900/60 border-gray-700/50 text-gray-300 p-4 rounded-lg shadow-lg backdrop-blur-md w-80">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">Kigali Station</h3>
          <span className="text-sm">1.5 AU</span>
        </div>
        <p className="text-xs leading-relaxed">
          Your mission is to explore the cosmos and learn more about the universe. Your spacecraft is equipped with advanced technology to help you navigate and communicate with other spacecraft.
        </p>
      </div>

      {selectedBody && (
        <div className="absolute top-20 right-4 bg-gray-900/80 p-4 rounded-lg text-gray-200 w-72 shadow-lg">
          <h3 className="text-lg font-bold mb-2">{selectedBody.name}</h3>
          <p>Radius: {selectedBody.radius} km</p>
          <p>Orbital Radius: {selectedBody.orbitalRadius} AU</p>
          <p>Parent: {selectedBody.parent || 'Sun'}</p>
        </div>
      )}

      <div className="absolute top-4 left-4 bg-gray-900/60 border-gray-700/50 text-gray-300 p-4 rounded-lg shadow-lg backdrop-blur-md w-80">
        <h3 className="text-lg font-bold mb-2">Navigation Mode</h3>
        <div className="text-sm mb-2">
          <p>
            Current Fuel: 583.33 <span className="text-yellow-400">&#x2605;</span>
          </p>
          <p>
            Required Fuel: 0.00 <span className="text-yellow-400">&#x2605;</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NavigationMap;
