import * as THREE from 'three';
import { SpaceScaler } from '../../utils/scaler';
import { CELESTIAL_BODIES, NON_SOLID_TYPES } from '../../entities/CelestialBodies';

const scaler = new SpaceScaler();

export function setupCelestialBodies(scene, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, textureLoader, setTextureLoadStatus) {
  Object.entries(CELESTIAL_BODIES).forEach(([key, body]) => {
    const scaleFactor = 1;
    const geometry = new THREE.SphereGeometry(scaler.scaleValue(body.radius) * scaleFactor, 64, 64);

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

    // Shadows
    if (NON_SOLID_TYPES.includes(body.type)) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }else{
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    // Axial Tilt
    if (body.axialTilt) {
      mesh.rotation.z = body.axialTilt * Math.PI / 180;
    }

    // mesh.position.copy(body.position);
    scaler.positionMesh(mesh, body.position);
    mesh.userData = { bodyData: body, bodyKey: key };

    scene.add(mesh);

    // Glow for stars Add a little pulsating effect
    if (body.type === "star") {
      const glowGeometry = new THREE.SphereGeometry(scaler.scaleValue(body.radius * 1.08), 64, 64);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(body.color),
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        depthWrite: false,
      });

      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      // glowMesh.position.copy(body.position);
      scaler.positionMesh(glowMesh, body.position);
      scene.add(glowMesh);

    
      function animateStar() {
        const time = performance.now() * 0.001;
        const scale = 1 + Math.sin(time * 2.5) * 0.01;
        mesh.scale.set(scale, scale, scale);
        glowMesh.scale.set(scale * 1.08, scale * 1.08, scale * 1.08);
        requestAnimationFrame(animateStar);
      }
      animateStar();
    }

    
    celestialBodiesRef.current[key] = mesh;

    if (body.atmosphere) {
      const atmosphereGeometry = new THREE.SphereGeometry(
        scaler.scaleValue(body.radius * 1.05),
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
        scaler.scaleValue(body.radius * 1.02),
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
      const xRadius = scaler.scaleValue(body.orbitalRadius);
      const yRadius = scaler.scaleValue(body.orbitalRadius * (1 - (body.orbitalEccentricity || 0)));

      const orbitCurve = new THREE.EllipseCurve(
        0, 0,
        xRadius, yRadius,
        0, 2 * Math.PI,
        false,
        0
      );


      let orbitPoints = orbitCurve.getPoints(segments);
      // Close the loop by pushing the first point again
      orbitPoints.push(orbitPoints[0]);

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