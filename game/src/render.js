// The renderer: three.js scene, sunset lighting, chase camera and effects.
// createRenderer builds the world (sky gradient, sun, fog, hemisphere and
// directional light); updateCamera follows the player or the car with a
// smoothed chase cam and shake; createPlayerMesh builds the on-foot character;
// createMarker builds the pulsing objective beacon; renderFrame draws one frame.
import * as THREE from 'three';
import { createCity } from './city.js';

export function createRenderer(canvas, seed) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffb37a, 180, 620);
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#ff9a5c'); grad.addColorStop(0.55, '#ffb37a'); grad.addColorStop(1, '#ffd9a0');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(c); skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x3a4a5a, 0.95); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b0, 1.5);
  sun.position.set(180, 220, 120); scene.add(sun);
  const city = createCity(THREE, seed);
  scene.add(city.group);
  const cam = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);
  return { renderer, scene, camera: cam, city, shake: 0, camPos: new THREE.Vector3(0, 10, -20), camLook: new THREE.Vector3() };
}

export function createPlayerMesh(THREE) {
  const g = new THREE.Group();
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.42), new THREE.MeshLambertMaterial({ color: '#ff5c8a' }));
  jacket.position.y = 1.1; g.add(jacket);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), new THREE.MeshLambertMaterial({ color: '#e8b98f' }));
  head.position.y = 1.82; g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.48), new THREE.MeshLambertMaterial({ color: '#101820' }));
  cap.position.y = 2.06; g.add(cap);
  const legMat = new THREE.MeshLambertMaterial({ color: '#2c3e55' });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.28), legMat); legL.position.set(-0.2, 0.32, 0); g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.65, 0.28), legMat); legR.position.set(0.2, 0.32, 0); g.add(legR);
  const armMat = new THREE.MeshLambertMaterial({ color: '#ff5c8a' });
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), armMat); armL.position.set(-0.5, 1.15, 0); g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), armMat); armR.position.set(0.5, 1.15, 0); g.add(armR);
  g.userData = { legL, legR, armL, armR };
  return g;
}

export function createMarker(THREE) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd94d', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 15; g.add(beam);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.35, 8, 24), new THREE.MeshBasicMaterial({ color: '#ffd94d' }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
  g.userData = { beam, ring };
  return g;
}

export function createPackageMesh(THREE, x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshLambertMaterial({ color: '#ffd94d', emissive: '#7a5c00' }));
  m.position.set(x, 0.8, z); return m;
}

export function updateCamera(r, player, dt) {
  const inCar = !!player.car;
  const back = inCar ? 13 : 8.5;
  const up = inCar ? 5.2 : 4.2;
  const heading = player.heading;
  const tx = player.x - Math.sin(heading) * back;
  const tz = player.z - Math.cos(heading) * back;
  const k = Math.min(1, dt * (inCar ? 4.5 : 6));
  r.camPos.x += (tx - r.camPos.x) * k; r.camPos.y += (up - r.camPos.y) * k; r.camPos.z += (tz - r.camPos.z) * k;
  r.camLook.set(player.x + Math.sin(heading) * 6, 1.6, player.z + Math.cos(heading) * 6);
  const sh = r.shake;
  r.camera.position.set(r.camPos.x + (Math.random() - 0.5) * sh, r.camPos.y + (Math.random() - 0.5) * sh * 0.5, r.camPos.z + (Math.random() - 0.5) * sh);
  r.camera.lookAt(r.camLook);
  r.shake = Math.max(0, r.shake - dt * 3);
}

export function renderFrame(r, width, height) {
  if (r.renderer.domElement.width !== width || r.renderer.domElement.height !== height) {
    r.renderer.setSize(width, height, false);
    r.camera.aspect = width / height; r.camera.updateProjectionMatrix();
  }
  r.renderer.render(r.scene, r.camera);
}
