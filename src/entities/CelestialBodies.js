// Enhanced celestial body data with more accurate parameters
import { Vector3 } from 'three';
import * as THREE from 'three';

export const CELESTIAL_BODIES = {
  sun: {
    name: 'Sun',
    position: new THREE.Vector3(0, 0, 0),
    radius: 465.47454e-5, // AU
    color: '#FDB813',
    mass: 1.989e30,
    // mass: 0,
    type: 'star',
    texture: '/textures/sun.jpg',
    emissive: true,
    emmissiveColor: 'white',
    emissiveIntensity: 100000,
    rotationPeriod: 27 // days
  },
  mercury: {
    name: 'Mercury',
    position: new Vector3(0.39, 0, 0),
    radius: 1.63083872e-5, // AU
    color: '#A5A5A5',
    mass: 3.3011e23,
    type: 'planet',
    orbitalRadius: 0.39,
    orbitalPeriod: 88,
    orbitalInclination: 7.0, // degrees
    orbitalEccentricity: 0.205,
    rotationPeriod: 58.6, // days
    axialTilt: 0.034, // degrees
    parent: 'sun',
    texture: '/textures/mercury.jpg'
  },
  venus: {
    name: 'Venus',
    position: new Vector3(0.72, 0, 0),
    radius: 4.04537843e-5, // AU
    color: '#E6E6FA',
    mass: 4.8675e24,
    type: 'planet',
    orbitalRadius: 0.72,
    orbitalPeriod: 224.7,
    orbitalInclination: 3.4, // degrees
    orbitalEccentricity: 0.007,
    rotationPeriod: -243, // days (negative for retrograde)
    axialTilt: 177.4, // degrees
    parent: 'sun',
    texture: '/textures/venus.jpg',
    atmosphere: {
      color: '#FFFACD',
      opacity: 0.8
    }
  },
  earth: {
    name: 'Earth',
    position: new Vector3(1, 0, 0),
    radius: 4.26343e-5, // AU
    color: '#6B93D6',
    mass: 5.972e24,
    type: 'planet',
    orbitalRadius: 1,
    orbitalPeriod: 365.25,
    orbitalInclination: 0, // degrees (reference plane)
    orbitalEccentricity: 0.017,
    rotationPeriod: 1, // days
    axialTilt: 23.44, // degrees
    parent: 'sun',
    texture: '/textures/earth/earthmap1k.jpg',
    // normalMap: '/textures/earth/earth-normal-8k.png',
    // bumpMap: '/textures/earth/earthbump1k.jpg',
    // citylightsTexture: '/textures/earth/earthlights4k.png',
    atmosphere: {
      color: '#ADD8E6',
      opacity: 0.3
    },
    clouds: {
      texture: '/textures/earth_clouds.png',
      speed: 0.0005
    }
  },
  moon: {
    name: 'Moon',
    position: new Vector3(1.00257, 0, 0),
    radius: 1.16138017e-5, // AU
    color: '#C0C0C0',
    mass: 7.342e22,
    type: 'moon',
    orbitalRadius: 0.00257,
    orbitalPeriod: 27.32,
    orbitalInclination: 5.14, // degrees
    orbitalEccentricity: 0.055,
    rotationPeriod: 27.32, // days (tidally locked)
    axialTilt: 6.68, // degrees
    parent: 'earth',
    texture: '/textures/moon.jpg'
  },
  mars: {
    name: 'Mars',
    position: new Vector3(1.52, 0, 0),
    radius: 2.26574081e-5, // AU
    color: '#CD5C5C',
    mass: 6.39e23,
    type: 'planet',
    orbitalRadius: 1.52,
    orbitalPeriod: 687,
    orbitalInclination: 1.85, // degrees
    orbitalEccentricity: 0.094,
    rotationPeriod: 1.03, // days
    axialTilt: 25.19, // degrees
    parent: 'sun',
    texture: '/textures/mars.jpg',
    atmosphere: {
      color: '#FFE4B5',
      opacity: 0.1
    }
  },
  jupiter: {
    name: 'Jupiter',
    position: new Vector3 (5.2, 0, 0),
    radius: 4.6732617e-5, // AU
    color: '#D8CA9D',
    mass: 1.898e27,
    type: 'planet',
    orbitalRadius: 5.2,
    orbitalPeriod: 4333,
    orbitalInclination: 1.31, // degrees
    orbitalEccentricity: 0.049,
    rotationPeriod: 0.41, // days
    axialTilt: 3.13, // degrees
    parent: 'sun',
    texture: '/textures/jupiter.jpg'
  },
  neptune: {
    name: 'Neptune',
    position: new Vector3(30.1, 0, 0),
    radius: 16.4766e-5, // AU
    color: '#5B5BE0',
    mass: 1.024e26,
    type: 'planet',
    orbitalRadius: 30.1,
    orbitalPeriod: 60190,
    orbitalInclination: 1.77, // degrees
    orbitalEccentricity: 0.0086,
    rotationPeriod: 0.67, // days
    axialTilt: 28.32, // degrees
    parent: 'sun',
    texture: '/textures/neptune.jpg'
  },
  uranus: {
    name: 'Uranus',
    position: new Vector3(19.2, 0, 0),
    radius: 16.9534499e-5, // AU
    color: '#C1E1C1',
    mass: 8.681e25,
    type: 'planet',
    orbitalRadius: 19.2,
    orbitalPeriod: 30687,
    orbitalInclination: 0.77, // degrees
    orbitalEccentricity: 0.047,
    rotationPeriod: 0.72, // days
    axialTilt: 97.77, // degrees
    parent: 'sun',
    texture: '/textures/uranus.jpg'
  },
};

export const NON_SOLID_TYPES = ["star", "blackhole", "nebula", "accretiondisk"];