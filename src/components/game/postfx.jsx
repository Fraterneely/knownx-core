import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';
import { Vector2 } from 'three';

export function setupPostFX(renderer, scene, camera, {
  bloom = { threshold: 0.6, strength: 0.8, radius: 0.35 },
  dof   = { focus: 0.0025, aperture: 0.00003, maxblur: 0.002 }, // tuned for your AU scaling
  color = { powRGB: [1.05, 1.05, 1.05], mulRGB: [1.08, 1.04, 0.98], addRGB: [0.0, 0.0, 0.0] }
} = {}) {
  const composer = new EffectComposer(renderer);

  // 1) Regular scene render
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2) Bloom (cinematic glare)
  const bloomPass = new UnrealBloomPass(
    new Vector2(window.innerWidth, window.innerHeight),
    bloom.strength,
    bloom.radius,
    bloom.threshold
  );
  composer.addPass(bloomPass);

  // 3) DOF (Bokeh)
  // focus: distance in world units from the camera focal plane
  const bokehPass = new BokehPass(scene, camera, {
    focus: dof.focus,
    aperture: dof.aperture, // smaller = deeper DoF, note: this value is scaled internally
    maxblur: dof.maxblur
  });
  composer.addPass(bokehPass);

  // 4) Color grading (simple, fast)
  const colorPass = new ShaderPass(ColorCorrectionShader);
  colorPass.uniforms['powRGB'].value.fromArray(color.powRGB); // contrast curve
  colorPass.uniforms['mulRGB'].value.fromArray(color.mulRGB); // saturation/temperature
  colorPass.uniforms['addRGB'].value.fromArray(color.addRGB); // bias
  composer.addPass(colorPass);

  // Handle resize
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // Optionally expose quick tuners
  function setDOFFocus(dist) { bokehPass.materialBokeh.uniforms.focus.value = dist; }
  function setBloomStrength(s) { bloomPass.strength = s; }

  return { composer, setDOFFocus, setBloomStrength, dispose: () => window.removeEventListener('resize', onResize) };
}
