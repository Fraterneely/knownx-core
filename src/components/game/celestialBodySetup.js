import * as THREE from 'three';
import { CELESTIAL_BODIES } from '../../entities/CelestialBodies';

export function setupCelestialBodies(scene, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, realScale, textureLoader, setTextureLoadStatus) {
  Object.entries(CELESTIAL_BODIES).forEach(([key, body]) => {
    const scaleFactor = realScale ? 1 : 50;
    const geometry = new THREE.SphereGeometry(body.radius * scaleFactor, 64, 64);

    let material;
    if (body.texture) {
      console.log(`Attempting to load texture for ${body.name}: ${body.texture}`);

      const fallbackMaterial = new THREE.MeshPhongMaterial({
        color: body.color,
        emissive: body.type === 'star' ? body.color : 0x000000,
        emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0,
        shininess: body.type === 'star' ? 0 : 30
      });



      const texture = textureLoader.current.load(
        body.texture,
        (loadedTexture) => {
          console.log(`Successfully loaded texture for ${body.name}`);
          setTextureLoadStatus(prev => ({
            ...prev,
            [key]: 'loaded'
          }));
        },
        undefined,
        (error) => {
          console.error(`Failed to load texture for ${body.name}:`, error);
          setTextureLoadStatus(prev => ({
            ...prev,
            [key]: 'failed'
          }));

          if (celestialBodiesRef.current[key]) {
            celestialBodiesRef.current[key].material = fallbackMaterial;
          }
        }
      );

      material = new THREE.MeshPhongMaterial({
        map: texture,
        color: body.color,
        emissive: body.type === 'star' ? body.color : 0x000000,
        emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0,
        shininess: body.type === 'star' ? 0 : 30
      });
    } else {
      material = new THREE.MeshPhongMaterial({
        color: body.color,
        emissive: body.type === 'star' ? body.color : 0x000000,
        emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0
      });
    }

    const mesh = new THREE.Mesh(geometry, material);

    if (body.axialTilt) {
      mesh.rotation.z = body.axialTilt * Math.PI / 180;
    }

    mesh.position.set(...body.position);
    mesh.castShadow = body.type !== 'star';
    mesh.receiveShadow = body.type !== 'star';
    mesh.userData = { bodyData: body, bodyKey: key };

    scene.add(mesh);
    celestialBodiesRef.current[key] = mesh;

    if (body.atmosphere) {
      const atmosphereGeometry = new THREE.SphereGeometry(
        body.radius * 1.05,
        64,
        64
      );
      const atmosphereMaterial = new THREE.MeshPhongMaterial({
        color: body.atmosphere.color,
        transparent: true,
        opacity: body.atmosphere.opacity,
        side: THREE.DoubleSide
      });
      const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      mesh.add(atmosphereMesh);
      atmosphereRefs.current[key] = atmosphereMesh;
    }

    if (body.clouds) {
      const cloudsGeometry = new THREE.SphereGeometry(
        body.radius * 1.02,
        64,
        64
      );
      const cloudsTexture = textureLoader.current.load(
        body.clouds.texture,
        () => console.log(`Successfully loaded cloud texture for ${body.name}`),
        undefined,
        (error) => console.error(`Failed to load cloud texture for ${body.name}:`, error)
      );
      const cloudsMaterial = new THREE.MeshPhongMaterial({
        map: cloudsTexture,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
      mesh.add(cloudsMesh);
      cloudsRefs.current[key] = cloudsMesh;
    }

    if (body.orbitalRadius) {
      const segments = 128;
      const orbitCurve = new THREE.EllipseCurve(
        0, 0,
        body.orbitalRadius, body.orbitalRadius * (1 - body.orbitalEccentricity || 0),
        0, 2 * Math.PI,
        false,
        0
      );

      const orbitPoints = orbitCurve.getPoints(segments);
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);

      const positions = new Float32Array(segments * 3);
      for (let i = 0; i < segments; i++) {
        const point = orbitPoints[i];
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = point.y;
      }
      orbitGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x444466,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
      });

      const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);

      if (body.orbitalInclination) {
        orbitLine.rotation.x = body.orbitalInclination * Math.PI / 180;
      }

      scene.add(orbitLine);
      orbitRefs.current[key] = orbitLine;
    }
  });
}