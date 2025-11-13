import React, { useRef, useEffect, useState } from 'react';
import { CELESTIAL_BODIES } from '../../entities/CelestialBodies';
import { computeTrajectoryAU } from '../../utils/trajectory';
import { AU_TO_METERS } from '../../utils/physicsUtils';

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
  const zoomRef = useRef(100.0);
  const [zoom, setZoom] = useState(100.0);
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

      // Draw grid
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset to screen-space
      ctx.lineWidth = 1; // constant visible width
      ctx.strokeStyle = 'rgba(89, 96, 184, 0.75)';
      ctx.beginPath();

      const gridSize = 50;
      const startX = 0;
      const startY = 0;
      for (let x = startX; x < sizeX; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, sizeY);
      }
      for (let y = startY; y < sizeY; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(sizeX, y);
      }
      ctx.stroke();
      ctx.restore();

      // Apply transforms (note: user-space is CSS px)
      ctx.translate(centerX + offsetX - spacecraftPixelX * zoomRef.current, centerY + offsetY - spacecraftPixelY * zoomRef.current);

      // ctx.translate(centerX + offsetX, centerY + offsetY);
      ctx.rotate(rotation);
      ctx.scale(zoomRef.current, zoomRef.current);


      const positions = [];
      const placedLabelBoxes = [];

      Object.values(CELESTIAL_BODIES).forEach((body) => {
        const mapX = body.position.x * AU_TO_PIXEL_SCALE;
        const mapY = body.position.z * AU_TO_PIXEL_SCALE;

        // compute render radius in px (screen units) using your perceptual mapping
        const bodyRenderRadiusPx = radiusAUToPx(body.radius, zoomRef.current, body);


        // Draw body (divide by zoom because context is scaled by zoom)
        ctx.beginPath();
        ctx.arc(mapX, mapY, bodyRenderRadiusPx / zoomRef.current, 0, Math.PI * 2);
        ctx.fillStyle = body.color || 'white';
        ctx.fill();
        ctx.lineWidth = 1 / zoomRef.current;
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
          ctx.lineWidth = 1 / zoomRef.current;
          ctx.stroke();
          ctx.closePath();
        }

        // Label placement (use screen coords for bbox checks)
        // compute label bbox in screen-space (CSS px)
        ctx.save();
        ctx.scale(1 / zoomRef.current, 1 / zoomRef.current); // keep text readable
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
          ctx.scale(1 / zoomRef.current, 1 / zoomRef.current);
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

      // prepare bodies array for the predictor (AU)
      const bodiesForTraj = Object.values(CELESTIAL_BODIES).map(b => ({
        name: b.name,
        position: { x: b.position.x, y: b.position.y, z: b.position.z },
        mass: b.mass,
        radius: b.radius || 0
      }));
      bodiesForTraj.forEach( body => {
        console.log(`${body.name}'s data for trajectory\nPos: (${body.position.x}, ${body.position.y}, ${body.position.z}) \nMass: ${body.mass} \nRadius: ${body.radius}`);
      })

      // ship pos & vel in AU
      // IMPORTANT: ensure spacecraft.velocity is in AU/s. If it is in m/s convert: v_AU_s = v_m_s / AU_IN_METERS
      const shipPosAU = { x: spacecraft.position.x, y: spacecraft.position.y, z: spacecraft.position.z };
      console.log(`Current ship position: ${shipPosAU.x}, ${shipPosAU.y}, ${shipPosAU.z}`);
      const shipVelAU = spacecraft.velocity 
        ? { x: spacecraft.velocity.x / AU_TO_METERS, y: spacecraft.velocity.y / AU_TO_METERS, z: spacecraft.velocity.z / AU_TO_METERS } 
        : { x: 0, y: 0, z: 0 };
      console.log(`Current ship velocity: ${shipVelAU.x}, ${shipVelAU.y}, ${shipVelAU.z}`);

      // compute trajectory (tune steps & dt)
      const trajPtsAU = computeTrajectoryAU(shipPosAU, shipVelAU, bodiesForTraj);
      console.log("Trajectory's first point:", trajPtsAU[0]);
      console.log("Trajectory's last point:", trajPtsAU[trajPtsAU.length - 1]);

      // draw trajectory in world coords (AU -> map pixels)
      if (trajPtsAU && trajPtsAU.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([0.006, 0.004]); // dashed line in canvas units (world units scaled by ctx)
        ctx.lineWidth = 1 / zoomRef.current;
        ctx.strokeStyle = 'cyan';

        for (let i = 0; i < trajPtsAU.length; i++) {
          const p = trajPtsAU[i];
          const px = p.x * AU_TO_PIXEL_SCALE;
          const py = p.z * AU_TO_PIXEL_SCALE;

          if (i === 0 || i === trajPtsAU.length - 1) {
            console.log(`Trajectory point ${i} in PixelScale: (${px}, ${py})`);
          }
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        console.log(`Spaceraft's position in PixelScale: ${spacecraftPixelX}, ${spacecraftPixelY}`);

        ctx.stroke();
        ctx.setLineDash([]); // reset
        ctx.restore();
      }

      // Draw spacecraft
      // Draw spacecraft as a triangle pointing in its -z direction (which is up on the 2D map)
      ctx.save();
      ctx.translate(spacecraftPixelX, spacecraftPixelY);
      // Rotate the spacecraft based on its orientation. Assuming spacecraft.rotation.y is the yaw.
      // The front of the ship is -z, which corresponds to the positive Y-axis in our 2D map (after rotation).
      // So, we rotate by spacecraft.rotation.y + Math.PI (180 degrees) to point it "up" initially.

      let angle = 0;
      if (spacecraft.rotation?.y !== undefined) {
        angle = spacecraft.rotation.y + Math.PI;
      } else if (spacecraft.velocity) {
        angle = Math.atan2(spacecraft.velocity.z, spacecraft.velocity.x);
      }
      ctx.rotate(angle);
      
      ctx.beginPath();
      ctx.moveTo(0, 10 / zoomRef.current); // Nose of the ship (pointing up)
      ctx.lineTo(-7 / zoomRef.current, -10 / zoomRef.current); // Bottom left
      ctx.lineTo(7 / zoomRef.current, -10 / zoomRef.current); // Bottom right
      ctx.closePath();
      ctx.fillStyle = 'red';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1 / zoomRef.current;
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [spacecraft, zoomRef.current, rotation, offsetX, offsetY]);


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
            zoomRef.current = Math.max(0.0001, Math.min(8440, newZoom));
            setZoom(zoomRef.current);
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

    </div>
  );
};

export default NavigationMap;

// import React, { useRef, useEffect, useState } from 'react';
// import { CELESTIAL_BODIES } from '../../entities/CelestialBodies';
// import { computeTrajectoryAU } from '../../utils/trajectory';

// // Visual tuning knobs
// const RENDER_MIN_PX = 0.5;
// const RENDER_MAX_PX = 50;  
// const HIT_MIN_PX = 10;
// const ZOOM_EXP = 0.35;
// const UI_SCALE = 1.0;

// const CLASS_MULT = {
//   star: 16,
//   planet: 2.6,
//   dwarf: 1.1,
//   moon: 1.0,
//   asteroid: 0.8,
//   default: 1.0,
// };

// function getClassMult(body) {
//   return CLASS_MULT[body.type] ?? CLASS_MULT.default;
// }

// function radiusAUToPx(radiusAU, zoom, body) {
//   if (!radiusAU || radiusAU <= 0) return RENDER_MIN_PX;
//   const logR = Math.log10(radiusAU);
//   const mu = 4.2;
//   const sigma = 1.4;
//   const s = 1 / (1 + Math.exp(-(logR - mu) / sigma));
//   const basePx = RENDER_MIN_PX + (RENDER_MAX_PX - RENDER_MIN_PX) * s;
//   const zoomFactor = Math.pow(zoom, ZOOM_EXP);
//   const classMult = getClassMult(body);
//   const px = basePx * zoomFactor * classMult * UI_SCALE;
//   return Math.max(RENDER_MIN_PX, Math.min(RENDER_MAX_PX, px));
// }

// function hitRadiusPx(renderPx) {
//   return Math.max(renderPx, HIT_MIN_PX);
// }

// // helper to test AABB overlap
// const intersects = (a, b) =>
//   !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);

// // label priority mapping
// const LABEL_PRIORITY = { star: 3, planet: 2, moon: 1, asteroid: 0, default: 0 };
// function labelPriority(body) {
//   return LABEL_PRIORITY[body.type] ?? LABEL_PRIORITY.default;
// }

// const NavigationMap = ({ spacecraft, gameTime }) => {
//   const canvasRef = useRef(null);
//   const [offsetX, setOffsetX] = useState(0);
//   const [offsetY, setOffsetY] = useState(0);
//   const [isDragging, setIsDragging] = useState(false);
//   const [lastMouseX, setLastMouseX] = useState(0);
//   const [lastMouseY, setLastMouseY] = useState(0);
//   const zoomRef = useRef(100.0);
//   const [zoom, setZoom] = useState(100.0);
//   const [rotation, setRotation] = useState(0); // radians (ship heading)
//   const [selectedBody, setSelectedBody] = useState(null);
//   const [bodyPositions, setBodyPositions] = useState([]);
//   const bodyPositionsRef = useRef([]);
//   const spacecraftPixelXRef = useRef(0);
//   const spacecraftPixelYRef = useRef(0);
//   const AU_TO_PIXEL_SCALE = 300; // pixels per AU at zoom==1

//   // DPR-aware resize so canvas user-space == CSS pixels
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d');

//     const handleResize = () => {
//       const rect = canvas.getBoundingClientRect();
//       const dpr = window.devicePixelRatio || 1;

//       // set internal buffer size in device pixels
//       canvas.width = Math.max(1, Math.floor(rect.width * dpr));
//       canvas.height = Math.max(1, Math.floor(rect.height * dpr));

//       // Normalize so that 1 unit in canvas user-space == 1 CSS pixel
//       ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

//       // Clear in CSS pixel units
//       ctx.clearRect(0, 0, rect.width, rect.height);
//     };

//     window.addEventListener('resize', handleResize);
//     handleResize();
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   // Click handler uses screen-space positions (CSS pixels)
//   const handleCanvasClick = (e) => {
//     e.preventDefault();
//     const rect = canvasRef.current.getBoundingClientRect();
//     const mouseX = e.clientX - rect.left;
//     const mouseY = e.clientY - rect.top;

//     const positions = bodyPositionsRef.current || [];
//     for (let i = positions.length - 1; i >= 0; i--) {
//       const body = positions[i];
//       const dx = mouseX - body.x;
//       const dy = mouseY - body.y;
//       if (dx * dx + dy * dy <= body.radius * body.radius) {
//         setSelectedBody(body.data);
//         return;
//       }
//     }
//     setSelectedBody(null);
//   };

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d');
//     let animationFrameId = 0;

//     // helper: convert world AU coords -> screen CSS pixels centered on canvas with rotation and zoom
//     function worldToScreenAU(auX, auZ, shipPosAU, zoomLocal, rotationLocal, centerX, centerY) {
//       // relative vector in AU
//       const relX = (auX - shipPosAU.x) * AU_TO_PIXEL_SCALE; // pixels
//       const relY = (auZ - shipPosAU.z) * AU_TO_PIXEL_SCALE; // pixels (we use z->y)

//       // rotate the world so ship heading points up: rotate by -rotationLocal
//       const cos = Math.cos(-rotationLocal);
//       const sin = Math.sin(-rotationLocal);
//       const rx = relX * cos - relY * sin;
//       const ry = relX * sin + relY * cos;

//       // apply zoom and center
//       return { x: centerX + rx * zoomLocal + offsetX, y: centerY + ry * zoomLocal + offsetY };
//     }

//     // Draw a HUD-style grid centered on canvas. Grid lines follow the rotated world.
//     function drawHUDGrid(centerX, centerY, shipPosAU, zoomLocal, rotationLocal) {
//       ctx.save();

//       // faint background overlay / glass
//       ctx.fillStyle = 'rgba(6,12,25,0.45)';
//       ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

//       // grid settings
//       const gridStepWorldPx = 50; // world pixels between grid lines at zoom==1
//       const worldToScreenStep = gridStepWorldPx * zoomLocal;

//       // compute a screen-space anchor so lines align with ship-centered coordinates
//       // pick a large region around the canvas to draw the grid (so rotation doesn't show holes)
//       const range = Math.max(canvas.width, canvas.height) * 1.5;

//       // We'll draw grid by iterating in world coordinates in AU, converting to screen
//       // Determine how many lines to draw in each direction (in world pixels)
//       const maxWorldPx = range / zoomLocal;
//       const lines = Math.ceil(maxWorldPx / gridStepWorldPx) + 4;

//       // draw thin vertical/horizontal grid lines transformed by rotation
//       ctx.lineWidth = 0.6;
//       ctx.strokeStyle = 'rgba(30,160,220,0.10)';
//       ctx.shadowBlur = 0;

//       for (let i = -lines; i <= lines; i++) {
//         // draw vertical line at world x = i*gridStepWorldPx
//         // convert world px back to AU offset for line sampling
//         const worldXpx = i * gridStepWorldPx;
//         // sample two points far apart on the line in world pixels and convert to screen
//         const p1 = worldToScreenAU(shipPosAU.x + (worldXpx / AU_TO_PIXEL_SCALE), shipPosAU.z - 2000, shipPosAU, zoomLocal, rotationLocal, centerX, centerY);
//         const p2 = worldToScreenAU(shipPosAU.x + (worldXpx / AU_TO_PIXEL_SCALE), shipPosAU.z + 2000, shipPosAU, zoomLocal, rotationLocal, centerX, centerY);
//         ctx.beginPath();
//         ctx.moveTo(p1.x, p1.y);
//         ctx.lineTo(p2.x, p2.y);
//         ctx.stroke();
//       }

//       for (let j = -lines; j <= lines; j++) {
//         // draw horizontal line at world y = j*gridStepWorldPx
//         const worldYpx = j * gridStepWorldPx;
//         const p1 = worldToScreenAU(shipPosAU.x - 2000, shipPosAU.z + (worldYpx / AU_TO_PIXEL_SCALE), shipPosAU, zoomLocal, rotationLocal, centerX, centerY);
//         const p2 = worldToScreenAU(shipPosAU.x + 2000, shipPosAU.z + (worldYpx / AU_TO_PIXEL_SCALE), shipPosAU, zoomLocal, rotationLocal, centerX, centerY);
//         ctx.beginPath();
//         ctx.moveTo(p1.x, p1.y);
//         ctx.lineTo(p2.x, p2.y);
//         ctx.stroke();
//       }

//       // central crosshair + rings
//       ctx.lineWidth = 1.2;
//       ctx.strokeStyle = 'rgba(0,210,255,0.9)';
//       ctx.beginPath();
//       ctx.moveTo(centerX - 12, centerY);
//       ctx.lineTo(centerX + 12, centerY);
//       ctx.moveTo(centerX, centerY - 12);
//       ctx.lineTo(centerX, centerY + 12);
//       ctx.stroke();

//       // rings
//       ctx.setLineDash([6, 6]);
//       ctx.lineWidth = 1;
//       ctx.strokeStyle = 'rgba(0,200,255,0.18)';
//       for (let r = 60; r <= Math.min(canvas.width, canvas.height); r += 60) {
//         ctx.beginPath();
//         ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
//         ctx.stroke();
//       }
//       ctx.setLineDash([]);

//       ctx.restore();
//     }

//     const render = () => {
//       if (!canvas || !spacecraft || !spacecraft.position) {
//         animationFrameId = requestAnimationFrame(render);
//         return;
//       }

//       // Use CSS size for center calculations (since user-space now equals CSS pixels)
//       const rect = canvas.getBoundingClientRect();
//       const sizeX = rect.width;
//       const sizeY = rect.height;
//       const centerX = sizeX / 2;
//       const centerY = sizeY / 2;

//       // local copies
//       const zoomLocal = zoomRef.current;
//       const rotationLocal = rotation; // radians

//       // clear screen
//       ctx.clearRect(0, 0, sizeX, sizeY);

//       // ship pos in AU
//       const shipPosAU = { x: spacecraft.position.x, y: spacecraft.position.y, z: spacecraft.position.z };

//       // draw HUD grid (centered and rotated)
//       drawHUDGrid(centerX, centerY, shipPosAU, zoomLocal, rotationLocal);

//       // prepare bodies array for the predictor (AU)
//       const bodiesForTraj = Object.values(CELESTIAL_BODIES).map(b => ({
//         name: b.name,
//         position: { x: b.position.x, y: b.position.y, z: b.position.z },
//         mass: b.mass,
//         radius: b.radius || 0
//       }));

//       // compute trajectory (tune steps & dt) in AU
//       const shipVelAU = spacecraft.velocity ? { x: spacecraft.velocity.x, y: spacecraft.velocity.y, z: spacecraft.velocity.z } : { x: 0, y: 0, z: 0 };
//       const trajPtsAU = computeTrajectoryAU(shipPosAU, shipVelAU, bodiesForTraj, 400, 10, true);

//       // draw bodies and labels
//       const positions = [];
//       ctx.save();
//       for (const body of Object.values(CELESTIAL_BODIES)) {
//         const screen = worldToScreenAU(body.position.x, body.position.z, shipPosAU, zoomLocal, rotationLocal, centerX, centerY);

//         // render radius in px (scale with zoom)
//         const bodyRenderRadiusPx = radiusAUToPx(body.radius, zoomLocal, body) * (zoomLocal);

//         // body circle
//         ctx.beginPath();
//         ctx.arc(screen.x, screen.y, Math.max(2, bodyRenderRadiusPx), 0, Math.PI * 2);
//         ctx.fillStyle = body.color || 'white';
//         ctx.fill();
//         ctx.lineWidth = 1;
//         ctx.strokeStyle = 'rgba(255,255,255,0.08)';
//         ctx.stroke();

//         // label
//         ctx.fillStyle = 'rgba(220,240,255,0.95)';
//         ctx.font = `${11}px Arial`;
//         ctx.fillText(body.name, screen.x + 8, screen.y + 4);

//         positions.push({ name: body.name, x: screen.x, y: screen.y, radius: hitRadiusPx(bodyRenderRadiusPx), data: body });
//       }
//       ctx.restore();

//       // store positions for click tests
//       setBodyPositions(positions);
//       bodyPositionsRef.current = positions;

//       // draw trajectory in screen space
//       if (trajPtsAU && trajPtsAU.length > 1) {
//         ctx.save();
//         ctx.beginPath();
//         ctx.setLineDash([8, 6]);
//         ctx.lineWidth = 1.2;
//         ctx.strokeStyle = 'rgba(0,255,230,0.9)';

//         for (let i = 0; i < trajPtsAU.length; i++) {
//           const p = trajPtsAU[i];
//           const s = worldToScreenAU(p.x, p.z, shipPosAU, zoomLocal, rotationLocal, centerX, centerY);
//           if (i === 0) ctx.moveTo(s.x, s.y);
//           else ctx.lineTo(s.x, s.y);
//         }
//         ctx.stroke();
//         ctx.setLineDash([]);
//         ctx.restore();
//       }

//       // draw ship (centered)
//       ctx.save();
//       ctx.translate(centerX + offsetX, centerY + offsetY);
//       // rotate ship triangle so its nose points up on screen. Ship 'heading' is rotationLocal.
//       ctx.rotate(rotationLocal);

//       // triangle
//       ctx.beginPath();
//       ctx.moveTo(0, -12); // nose (upwards)
//       ctx.lineTo(-8, 10);
//       ctx.lineTo(8, 10);
//       ctx.closePath();
//       ctx.fillStyle = 'red';
//       ctx.fill();
//       ctx.lineWidth = 1.0;
//       ctx.strokeStyle = 'rgba(255,255,255,0.9)';
//       ctx.stroke();

//       // small glow
//       ctx.beginPath();
//       ctx.arc(0, 0, 3, 0, Math.PI * 2);
//       ctx.fillStyle = 'rgba(0,240,255,0.8)';
//       ctx.fill();

//       ctx.restore();

//       // debug: spacecraft pixel coords
//       spacecraftPixelXRef.current = centerX + offsetX;
//       spacecraftPixelYRef.current = centerY + offsetY;

//       animationFrameId = requestAnimationFrame(render);
//     };

//     render();
//     return () => cancelAnimationFrame(animationFrameId);
//   }, [spacecraft, rotation, offsetX, offsetY]);

//   return (
//     <div className="relative w-full h-full">
//       <div className="absolute inset-0 text-gray-300 p-4 rounded-lg backdrop-blur-md w-full h-full">
//         <canvas
//           ref={canvasRef}
//           onClick={handleCanvasClick}
//           id="navigation-map-canvas"
//           className="w-full h-full bg-none"
//           onMouseDown={(e) => {
//             setIsDragging(true);
//             setLastMouseX(e.clientX);
//             setLastMouseY(e.clientY);
//           }}
//           onMouseMove={(e) => {
//             if (!isDragging) return;
//             const dx = e.clientX - lastMouseX;
//             const dy = e.clientY - lastMouseY;
//             if (e.shiftKey) {
//               const angle = Math.atan2(dy, dx);
//               setRotation((prev) => prev + angle * 0.005);
//             } else {
//               setOffsetX((p) => p + dx);
//               setOffsetY((p) => p + dy);
//             }
//             setLastMouseX(e.clientX);
//             setLastMouseY(e.clientY);
//           }}
//           onMouseUp={() => setIsDragging(false)}
//           onMouseLeave={() => setIsDragging(false)}
//           onWheel={(e) => {
//             e.preventDefault();
//             const rect = canvasRef.current.getBoundingClientRect();
//             const mouseX = e.clientX - rect.left;
//             const mouseY = e.clientY - rect.top;
//             const scaleAmount = 0.08;
//             const newZoom = e.deltaY < 0 ? zoomRef.current * (1 + scaleAmount) : zoomRef.current / (1 + scaleAmount);
//             const clamped = Math.max(0.01, Math.min(2000, newZoom));
//             zoomRef.current = clamped;
//             setZoom(clamped);

//             // adjust offsets so zoom is anchored at mouse position
//             const centerX = rect.width / 2;
//             const centerY = rect.height / 2;
//             const worldX = (mouseX - centerX - offsetX) / zoomRef.current;
//             const worldY = (mouseY - centerY - offsetY) / zoomRef.current;
//             const newOffsetX = mouseX - centerX - worldX * clamped;
//             const newOffsetY = mouseY - centerY - worldY * clamped;
//             setOffsetX(newOffsetX);
//             setOffsetY(newOffsetY);
//           }}
//         />
//       </div>

//       <div className="absolute top-4 right-4 bg-gray-900/60 border-gray-700/50 text-gray-300 p-4 rounded-lg shadow-lg backdrop-blur-md w-80">
//         <div className="flex justify-between items-center mb-2">
//           <h3 className="text-lg font-bold">Kigali Station</h3>
//           <span className="text-sm">1.5 AU</span>
//         </div>
//         <p className="text-xs leading-relaxed">
//           Your mission is to explore the cosmos and learn more about the universe. Your spacecraft is equipped with advanced technology to help you navigate and communicate with other spacecraft.
//         </p>
//       </div>

//       {selectedBody && (
//         <div className="absolute top-20 right-4 bg-gray-900/80 p-4 rounded-lg text-gray-200 w-72 shadow-lg">
//           <h3 className="text-lg font-bold mb-2">{selectedBody.name}</h3>
//           <p>Radius: {selectedBody.radius} km</p>
//           <p>Orbital Radius: {selectedBody.orbitalRadius} AU</p>
//           <p>Parent: {selectedBody.parent || 'Sun'}</p>
//         </div>
//       )}

//     </div>
//   );
// };

// export default NavigationMap;
