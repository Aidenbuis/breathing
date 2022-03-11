import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";
import galaxyVertexShader from "./shaders/galaxy/vertex.glsl";
import galaxyFragmentShader from "./shaders/galaxy/fragment.glsl";

/**
 * Base
 */
// Debug
const gui = new dat.GUI();

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Galaxy
 */
const parameters = {
  count: 336300,
  size: 0.005,
  radius: 1.57,
  branches: 4,
  spin: 0.1,
  randomness: 0.353,
  randomnessPower: 4.468,
  insideColor: "#b3fff6",
  outsideColor: "#2462ff",
};

let geometry,
  material,
  points = null;

const generateGalaxy = () => {
  if (points !== null) {
    geometry.dispose();
    material.dispose();
    scene.remove(points);
  }

  /**
   * Geometry
   */
  geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(parameters.count * 3);
  const randomness = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  const scales = new Float32Array(parameters.count * 1);

  const insideColor = new THREE.Color(parameters.insideColor);
  const outsideColor = new THREE.Color(parameters.outsideColor);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;

    // Position
    const radius = Math.random() * parameters.radius;

    const branchAngle =
      ((i % parameters.branches) / parameters.branches) * Math.PI * 2;

    const randomX =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;
    const randomY =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;
    const randomZ =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;

    positions[i3] = Math.cos(branchAngle) * radius;
    positions[i3 + 1] = 0;
    positions[i3 + 2] = Math.sin(branchAngle) * radius;

    randomness[i3] = randomX;
    randomness[i3 + 1] = randomY;
    randomness[i3 + 2] = randomZ;

    // Color
    const mixedColor = insideColor.clone();
    mixedColor.lerp(outsideColor, radius / parameters.radius);

    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    // Scale
    scales[i] = Math.random();
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute(
    "aRandomness",
    new THREE.BufferAttribute(randomness, 3)
  );
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  /**
   * Material
   */
  console.log(30 * renderer.getPixelRatio());
  material = new THREE.ShaderMaterial({
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 30 * renderer.getPixelRatio() },
    },
    vertexShader: galaxyVertexShader,
    fragmentShader: galaxyFragmentShader,
  });

  /**
   * Points
   */
  points = new THREE.Points(geometry, material);
  scene.add(points);
};

gui
  .add(parameters, "count")
  .min(100)
  .max(1000000)
  .step(100)
  .onFinishChange(generateGalaxy);

gui
  .add(parameters, "count")
  .min(100)
  .max(1000000)
  .step(100)
  .onFinishChange(generateGalaxy);

gui
  .add(parameters, "radius")
  .min(0.01)
  .max(20)
  .step(0.01)
  .onFinishChange(generateGalaxy);

gui
  .add(parameters, "branches")
  .min(2)
  .max(20)
  .step(1)
  .onFinishChange(generateGalaxy);

gui
  .add(parameters, "randomness")
  .min(0)
  .max(2)
  .step(0.001)
  .onFinishChange(generateGalaxy);

gui
  .add(parameters, "randomnessPower")
  .min(1)
  .max(10)
  .step(0.001)
  .onFinishChange(generateGalaxy);

gui.addColor(parameters, "insideColor").onFinishChange(generateGalaxy);
gui.addColor(parameters, "outsideColor").onFinishChange(generateGalaxy);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = 0;
camera.position.y = 10;
camera.position.z = 0;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableZoom = false;
controls.enablePan = false;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Generate the first galaxy
 */
generateGalaxy();

/**
 * Animate
 */
const clock = new THREE.Clock();
const state = {
  nextStepAt: 4,
  breath: 0,
  breathIncreased: false,
  wait: false,
};

const cameraStartPosition = 2;
const zoomAmount = 2;
camera.position.y = cameraStartPosition;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update material with time value
  // Prevent this when we are on the pause of the breathe animation
  material.uniforms.uTime.value = elapsedTime;

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  const nextStepForBreath = (breath) =>
    onTheCountOfFour &&
    state.breath === breath &&
    state.breathIncreased === false;

  const currentBreath = (breath) =>
    elapsedTime < state.nextStepAt && state.breath === breath;

  const increaseBreath = () => {
    // -> Next breath
    if (state.breath === 3) {
      state.breath = 0;
    } else {
      state.breath = state.breath + 1;
    }

    // -> Prevent another run in this loop
    state.breathIncreased = true;

    // -> Increase with four seconds
    state.nextStepAt = state.nextStepAt + 4;
  };

  const flooredElapsedTime = Math.floor(elapsedTime);
  const onTheCountOfFour =
    flooredElapsedTime % 4 === 0 && flooredElapsedTime !== 0;

  const framesPerSecond = 60;
  const framesPerBreath = 240;
  const secondsPerFrame = 1 / framesPerSecond;
  const currentFrame = Math.floor(
    (elapsedTime - flooredElapsedTime) / secondsPerFrame
  );

  const currentTimeInBreathCycle = elapsedTime - state.nextStepAt + 4;
  const percentageOfFour = 4 / 100;
  const percentageInBreathCycle =
    Math.floor(currentTimeInBreathCycle / percentageOfFour) / 100;

  const animateCamera = (multiplyWith, increaseFrom) => {
    console.log(percentageOfFour);
    const newPosition = increaseFrom + multiplyWith * percentageInBreathCycle;
    // console.log(newPosition);
    material.uniforms.uSize.value = 20;
    camera.position.y = newPosition;
  };

  console.log("🎥 Position Y: " + camera.position.y);

  if (currentBreath(0)) {
    // 🌬️ Breath in
    animateCamera(zoomAmount, cameraStartPosition);
    state.breathIncreased = false;
  } else if (nextStepForBreath(0)) {
    // 🤖 Setup next breath
    increaseBreath();
  } else if (currentBreath(1)) {
    // 🌬️ Breath HODL for four seconds
    state.breathIncreased = false;
  } else if (nextStepForBreath(1)) {
    // 🤖 Setup next breath
    increaseBreath();
  } else if (currentBreath(2)) {
    // 🌬️ Breath out
    animateCamera(-zoomAmount, cameraStartPosition + zoomAmount);
    state.breathIncreased = false;
  } else if (nextStepForBreath(2)) {
    // 🤖 Setup next breath
    increaseBreath();
  } else if (currentBreath(3)) {
    // 🌬️ Breath HODL for four seconds
    state.breathIncreased = false;
  } else if (nextStepForBreath(3)) {
    // 🤖 Setup next breath
    increaseBreath();
  }

  // if (onTheCountOfFour && state.start > elapsedTime) {
  //   // 👉🏻  Console.logs on one second
  //   state.start === null;
  //   // Now to wait 4 seconds
  //   // state.start = flooredElapsedTime + 4;
  //   state.wait = true;
  // }
  // else if (state.wait && !onTheCountOfFour) {
  //   console.log("2");
  // } else if (state.wait && flooredElapsedTime % 4 === 0) {
  //   console.log("3");
  //   state.start = flooredElapsedTime + 4;
  //   state.wait = false;
  // }

  // We willen dat die na vier seconden, ook weer vier seconden stopt

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
