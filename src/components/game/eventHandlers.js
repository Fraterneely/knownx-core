import * as THREE from 'three';
import { CELESTIAL_BODIES } from '../../entities/CelestialBodies';

export function setupEventHandlers(mountRef, cameraRef, rendererRef, controlsRef, celestialBodiesRef, setSelectedBody) {
  const handleResize = () => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  };

  handleResize();
  window.addEventListener('resize', handleResize);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const handleClick = (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, cameraRef.current);

    const celestialBodyMeshes = Object.values(celestialBodiesRef.current);
    const intersects = raycaster.intersectObjects(celestialBodyMeshes, false);

    if (intersects.length > 0) {
      const selectedMesh = intersects[0].object;
      const bodyKey = selectedMesh.userData.bodyKey;
      setSelectedBody(bodyKey);

      if (controlsRef.current) {
        controlsRef.current.target.copy(selectedMesh.position);

        const bodyRadius = CELESTIAL_BODIES[bodyKey].radius;
        const distanceFactor = bodyRadius * 200;
        const newCameraPosition = new THREE.Vector3(
          selectedMesh.position.x + distanceFactor,
          selectedMesh.position.y + distanceFactor * 0.5,
          selectedMesh.position.z + distanceFactor
        );

        const startPosition = cameraRef.current.position.clone();
        const endPosition = newCameraPosition;
        const duration = 1000;
        const startTime = Date.now();

        const animateCamera = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3);

          cameraRef.current.position.lerpVectors(startPosition, endPosition, easeProgress);

          if (progress < 1) {
            requestAnimationFrame(animateCamera);
          }
        };

        animateCamera();
      }
    } else {
      setSelectedBody(null);
    }
  };

  window.addEventListener('click', handleClick);

  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('click', handleClick);
  };
}