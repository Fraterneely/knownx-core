import * as THREE from 'three';
import { SpaceScaler } from '../../utils/scaler';
import { CELESTIAL_BODIES, NON_SOLID_TYPES } from '../../entities/CelestialBodies';
import * as CANNON from 'cannon-es';
import { setupPlanetAtmosphere } from '../../utils/atmosphereHelper';
import { addAtmosphereDebugWireframes, logAtmosphereSetup } from '../../utils/atmosphereDebug';

const scaler = new SpaceScaler();

export function setupCelestialBodies(world, renderer, scene, camera, celestialBodiesMaterail, celestialBodiesRef, orbitRefs, atmosphereRefs, cloudsRefs, textureLoader, setLoadingProgress ) {
  Object.entries(CELESTIAL_BODIES).forEach(([key, body]) => {
    const geometry = new THREE.IcosahedronGeometry(scaler.scaleValue(body.radius) , 128);
    const bodyGroup = new THREE.Group();

    // Axial Tilt
    if (body.axialTilt) {
      bodyGroup.rotation.x = body.axialTilt * Math.PI / 180;
    }

    scaler.positionMesh(bodyGroup, body.position);

    scene.add(bodyGroup); 

    let material;

    const fallbackMaterial = new THREE.MeshPhongMaterial({
      color: body.color,
      emissive: body.type === 'star' ? body.color : 0x000000,
      emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0,
    });

    if (body.texture) {
      const texture = textureLoader.current.load(
        body.texture, 
        () => {
          setLoadingProgress(prev => ({
            ...prev,
            textures: {
              ...prev.textures,
              [key]: 'loaded'
            }
          }));
        },
        undefined,
        (error) => {
          console.error(`Failed to load texture for ${body.name}:`, error);
          setLoadingProgress(prev => ({
            ...prev,
            textures: {
              ...prev.textures,
              [key]: 'failed'
            }
          }));

          material = fallbackMaterial;
        }
      );

      if (body.normalMap && body.specMap) {
        const normalMap = textureLoader.current.load(
          body.normalMap, 
          () => {   
            setLoadingProgress(prev => ({
              ...prev,
              textures: {
                ...prev.textures,
                [key]: 'loaded'
              }
            }));
          },
          undefined,
          (error) => {
            console.error(`Failed to load Normal Map for ${body.name}:`, error);
            setLoadingProgress(prev => ({
              ...prev,
              textures: {
                ...prev.textures,
                [key]: 'failed'
              }
            }));
          }
        );

        const specularMap = textureLoader.current.load(
          body.specMap, 
          () => {   
            setLoadingProgress(prev => ({
              ...prev,
              textures: {
                ...prev.textures,
                [key]: 'loaded'
              }
            }));
          },
          undefined,
          (error) => {
            console.error(`Failed to load Specular Map for ${body.name}:`, error);
            setLoadingProgress(prev => ({
              ...prev,
              textures: {
                ...prev.textures,
                [key]: 'failed'
              }
            }));
          }
        );

        // Create advanced material with all maps
        material = new THREE.MeshPhongMaterial({
          map: texture,              // Daytime surface texture
          bumpMap: normalMap,             // Terrain elevation
          bumpScale: 5,              // Adjust for visible terrain
          normalMap: normalMap,           // Also use as normal map
          normalScale: new THREE.Vector2(10, 10), // Enhance terrain detail
          specularMap: specularMap,     // Shiny oceans
          specular: new THREE.Color(0x333333), // Ocean reflection color
          emissive: body.color,
          emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 10) : 0.005,
        });
        
        // Apply high-res settings
        [texture, normalMap, specularMap].forEach(tex => {
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Max quality
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
        });
      } else{
        material = new THREE.MeshPhongMaterial({
          map: texture,
          color: body.color,
          emissive: body.type === 'star' ? body.color : 0x000000,
          emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0,
        });
      }
    } else {
      material = new THREE.MeshPhongMaterial({
        color: body.color,
        emissive: body.type === 'star' ? body.color : 0x000000,
        emissiveIntensity: body.type === 'star' ? (body.emissiveIntensity || 0.3) : 0
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { data: body, bodyKey: key };
    bodyGroup.add(mesh);

    // Shadows
    if (NON_SOLID_TYPES.includes(body.type)) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }else{
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    // Glow for stars Add a little pulsating effect
    if (body.type === "star") {
      // Load flare texture (PNG with transparency)
      const flareTexture = textureLoader.current.load('/textures/lensFlares/sun.png');

      const flareMaterial = new THREE.SpriteMaterial({
        map: flareTexture,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const flareSprite = new THREE.Sprite(flareMaterial);
      flareSprite.scale.set(
        scaler.scaleValue(body.radius * 60), 
        scaler.scaleValue(body.radius * 60), 
        1
      );

      // Position at star
      scaler.positionMesh(flareSprite, body.position);
      bodyGroup.add(flareSprite);

      // after creating flareSprite
      function updateFlare() {
        const d = camera.position.distanceTo(flareSprite.position);
        const s = 1 / Math.max(0.001, d); // smaller with distance
        const base = scaler.scaleValue(body.radius * 60);
        flareSprite.scale.set(base * s * 0.8, base * s * 0.8, 1);
      }

      // Animate flicker
      function animateFlare() {
        const time = performance.now() * 0.02;
        flareSprite.material.opacity = 1 + Math.sin(time) * 0.01;
        flareSprite.rotateX(1);
        requestAnimationFrame(animateFlare);
      }

      animateFlare();
      updateFlare();
    }

    // City lights
    if (body.citylightsTexture) {
      const citylightsTexture = textureLoader.current.load(
        body.citylightsTexture,
        () => {
          setLoadingProgress(prev => ({
            ...prev,
            citylightsTextures: {
              ...prev.citylightsTextures,
              [key]: 'loaded'
            }
          }));
        },
        undefined,
        () => {
          setLoadingProgress(prev => ({
            ...prev,
            citylightsTextures: {
              ...prev.citylightsTextures,
              [key]: 'failed'
            }
          }));
        }
      );
      const lightsMat = new THREE.MeshBasicMaterial({
        map: citylightsTexture,
        blending: THREE.AdditiveBlending
      })
      const citylightsMesh = new THREE.Mesh(geometry, lightsMat);
      bodyGroup.add(citylightsMesh);
    }

    if (body.atmosphere || body.clouds) {
      // 1. Get star position (find the star in celestial bodies)
      let starPosition = new THREE.Vector3(0, 0, 0);
      Object.entries(CELESTIAL_BODIES).forEach(([starKey, starBody]) => {
        if (starBody.type === 'star') {
          starPosition = scaler.scaleVector(starBody.position);
        }
      });

      // Auto-setup based on planet type
      const atmosphereData = setupPlanetAtmosphere(
        bodyGroup, 
        key,
        body, 
        scaler, 
        textureLoader.current, 
        starPosition,
        setLoadingProgress
      );

      // Store references
      if (atmosphereData.atmosphere || atmosphereData.skyDome) {
        atmosphereRefs.current[key] = {
          atmosphere: atmosphereData.atmosphere,
          skyDome: atmosphereData.skyDome
        };
      }
      
      if (atmosphereData.clouds) {
        cloudsRefs.current[key] = atmosphereData.clouds;
      }
    }

    // logAtmosphereSetup(body, scaler);
    // if (atmosphereRefs.current[key] && atmosphereRefs.current[key].atmosphere && cloudsRefs.current[key] && cloudsRefs.current[key].altitudes) {
    //   addAtmosphereDebugWireframes(bodyGroup, scaler.scaleValue(body.radius), scaler.scaleValue(atmosphereRefs.current[key].atmosphere.height), cloudsRefs.current[key].altitudes.map(altitude => scaler.scaleValue(altitude)));
    // }

    // Create Cannon.js body for celestial body
    const cannonBody = new CANNON.Body({
      mass: 0, // Set mass to 0 for static bodies like stars and planets
      shape: new CANNON.Sphere(scaler.scaleValue(body.radius)),
      material: celestialBodiesMaterail,
      position: new CANNON.Vec3(scaler.scaleValue(body.position.x), scaler.scaleValue(body.position.y), scaler.scaleValue(body.position.z))
    });
    world.addBody(cannonBody);

    // Add full Map to bodies reference
    celestialBodiesRef.current[key] = {
      bodyMesh: bodyGroup,
      bodyBody: cannonBody,
      data: body,
    };

    // Otbit Line
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

      const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);


      if (body.orbitalInclination) {
        orbitLine.rotation.x = body.orbitalInclination * Math.PI / 180;
      }

      // scene.add(orbitLine);
      orbitRefs.current[key] = orbitLine;
    }
  });
}