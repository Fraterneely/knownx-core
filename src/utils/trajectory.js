// utils/trajectoryMap.js (or inline)
const G_SI = 6.67408e-11;                   // m^3 kg^-1 s^-2
const AU_IN_METERS = 1.49598e11;           // m
const G_AU = G_SI / (AU_IN_METERS ** 3);   // (AU^3 / m^3) * m^3/s^2 / m^3 => AU^3? => results in AU^3? 
// Practically: acceleration (AU/s^2) = G_AU * M / r_AU^2

/**
 * computeTrajectoryAU
 * - shipPosAU: {x,y,z} (AU)
 * - shipVelAU: {x,y,z} (AU/s)
 * - bodies: array of { position: {x,y,z} in AU, mass: kg, radius: AU (optional) }
 * - steps: number of points
 * - dt: timestep in seconds
 * - stopOnImpact: boolean - stop when predicted distance <= sum radii
 *
 * Returns array of positions {x,y,z} in AU
 */
export function computeTrajectoryAU(shipPosAU, shipVelAU, bodies, steps = 10000, dt = 10, stopOnImpact = true) {
  const pts = [];

  // small helpers
  const vecAdd = (a,b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  const vecSub = (a,b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const vecScale = (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s });
  const len = v => Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
  const normalize = v => { const L = len(v) || 1; return { x: v.x/L, y: v.y/L, z: v.z/L }; };

  // acceleration function (returns AU/s^2)
  function gravAccelAt(pointAU) {
    const a = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < bodies.length; i++) {
      const ob = bodies[i];
      // r vector from ship to body
      const r = vecSub(ob.position, pointAU); // AU
      const rmag = len(r);
      if (rmag === 0) continue;
      // acceleration magnitude in AU/s^2
      const accMag = (G_SI / (AU_IN_METERS ** 3)) * (ob.mass) / (rmag * rmag); // G_AU * M / r^2
      const dir = vecScale(r, 1 / rmag);
      a.x += dir.x * accMag;
      a.y += dir.y * accMag;
      a.z += dir.z * accMag;
    }
    return a;
  }

  // swept-sphere collision check (returns true if hits)
  function sweptHit(p0, p1, r0, c, r1) {
    // p0,p1,c are in AU; radii in AU
    // approximate with quadratic formula (same approach as before)
    const s = vecSub(p1, p0); // displacement (AU)
    const m = vecSub(p0, c);
    const r = r0 + r1;
    const a = s.x*s.x + s.y*s.y + s.z*s.z;
    const b = 2 * (m.x*s.x + m.y*s.y + m.z*s.z);
    const ccoef = (m.x*m.x + m.y*m.y + m.z*m.z) - r*r;
    const disc = b*b - 4*a*ccoef;
    if (disc < 0 || a === 0) return false;
    const sqrtD = Math.sqrt(disc);
    const t1 = (-b - sqrtD) / (2*a);
    const t2 = (-b + sqrtD) / (2*a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  }

  // state (AU / AU/s)
  let pos = { x: shipPosAU.x, y: shipPosAU.y, z: shipPosAU.z };
  let vel = { x: shipVelAU.x, y: shipVelAU.y, z: shipVelAU.z };

  // initial accel
  let a = gravAccelAt(pos);
  pts.push({ ...pos });

  for (let i = 0; i < steps; i++) {
    // leapfrog half-step
    const vHalf = vecAdd(vel, vecScale(a, 0.5 * dt)); // AU/s

    // predict position
    const posNext = vecAdd(pos, vecScale(vHalf, dt)); // AU

    // collision check if requested
    if (stopOnImpact) {
      for (let j = 0; j < bodies.length; j++) {
        const ob = bodies[j];
        const shipRadiusAU = 0.000001; // tiny default; override per-body if needed
        const otherRadiusAU = ob.radius || 0;
        if (sweptHit(pos, posNext, shipRadiusAU, ob.position, otherRadiusAU)) {
          // place last point at collision (approx posNext)
          pts.push(posNext);
          return pts;
        }
      }
    }

    const aNext = gravAccelAt(posNext);
    // complete velocity step
    const vNext = vecAdd(vHalf, vecScale(aNext, 0.5 * dt));

    // accept step
    pos = posNext;
    vel = vNext;
    a = aNext;

    pts.push({ ...pos });
  }

  return pts;
}
