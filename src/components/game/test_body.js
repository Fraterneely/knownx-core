import * as THREE from "three";

export default function AddBody(sceneRef, cameraRef, planetsRef, selectedBodyRef) {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0.5, 0, 10);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(camera);

    // Smooth follow camera
    const targetPosition = mesh.position.clone().add(new THREE.Vector3(0, 30, 50));
    camera.position.lerp(targetPosition, 0.05); // Smooth transition
    camera.lookAt(mesh.position);

    cameraRef.current = camera;

    scene.add(mesh);

    planetsRef.current.push(mesh);
    selectedBodyRef.current = mesh

    

    // 🌞 Create visible sun body
    const sunGeometry = new THREE.IcosahedronGeometry(3, 15);
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#FDB813"),
        emissive: new THREE.Color("#FDB813"),
        emissiveIntensity: 1,
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.position.set(5, 0, 5);
    scene.add(sunMesh);

    planetsRef.current.push(sunMesh);

}

// Load texture (you can use shader-based noise too)
// const textureLoader = new THREE.TextureLoader();
// const noiseTexture = textureLoader.load(noiseTextureURL);
// noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

// // 🌞 Core Sun Geometry
// const geometry = new THREE.SphereGeometry(radius, 64, 64);

// // 🌞 Material with emissive glow and noise texture
// const material = new THREE.MeshStandardMaterial({
//   map: noiseTexture,
//   color: new THREE.Color(emissiveColor),
//   emissive: new THREE.Color(emissiveColor),
//   emissiveMap: noiseTexture,
//   emissiveIntensity: 1.5,
//   metalness: 0.3,
//   roughness: 0.6,
//   transparent: true,
//   opacity: 1,
// });

// const sunMesh = new THREE.Mesh(geometry, material);
// sunMesh.position.copy(position);
// sunMesh.castShadow = false;
// sunMesh.receiveShadow = false;
// scene.add(sunMesh);

// // 🌟 Optional: Glow using a larger mesh with transparency
// const glowGeometry = new THREE.SphereGeometry(radius * 1.8, 64, 64);
// const glowMaterial = new THREE.MeshBasicMaterial({
//   color: new THREE.Color(glowColor),
//   transparent: true,
//   opacity: 0.3,
//   side: THREE.BackSide,
//   depthWrite: false,
// });

// const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
// glowMesh.position.copy(position);
// scene.add(glowMesh);

// // 🔁 Add a little pulsating effect
// function animateSun() {
//   const time = performance.now() * 0.001;
//   const scale = 1 + Math.sin(time * 2.5) * 0.02;
//   sunMesh.scale.set(scale, scale, scale);
//   glowMesh.scale.set(scale * 1.8, scale * 1.8, scale * 1.8);
//   requestAnimationFrame(animateSun);
// }
// animateSun();

// // ☀️ Optional: Add PointLight at the Sun's position
// const light = new THREE.PointLight(emissiveColor, 3, 1000, 2);
// light.position.copy(position);
// light.castShadow = true;
// scene.add(light);

// // Return the full sun object (for updating later if needed)
// return {
//   mesh: sunMesh,
//   glow: glowMesh,
//   light,
// };