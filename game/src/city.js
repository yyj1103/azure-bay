// Azure Bay itself: a sun-soaked coastal city on a 720 x 720 grid. Streets every
// 60 units, downtown towers in the middle, a beach and water to the south, the
// harbour cranes to the east, palms and lamps along every avenue. Builds the
// three.js scene, the building collision boxes, the road network traffic drives
// on, and the district lookup the HUD shows.
import { CITY, PALETTE, DISTRICTS } from './config.js';
import { createRandom, pickRandom, rangeRandom } from './random.js';

export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d.name;
  return 'AZURE BAY';
}

function facadeTexture(THREE) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#2c3e55';
  for (let y = 8; y < 120; y += 16) for (let x = 6; x < 58; x += 14) g.fillRect(x, y, 9, 11);
  g.fillStyle = '#ffd98a';
  for (let y = 8; y < 120; y += 16) for (let x = 6; x < 58; x += 14) if ((x + y) % 48 === 0) g.fillRect(x, y, 9, 11);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createCity(THREE, seed) {
  const random = createRandom(seed);
  const group = new THREE.Group(); group.name = 'Azure Bay';
  const colliders = [];
  const roads = [];
  const half = CITY.half, pitch = CITY.pitch, beachZ = CITY.beachZ;

  const groundMat = new THREE.MeshLambertMaterial({ color: '#b8a888' });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 240, half * 2 + 240), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, 60); group.add(ground);

  const waterMat = new THREE.MeshPhongMaterial({ color: PALETTE.water, shininess: 120, specular: '#ffdf9e' });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 240, 300), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.05, beachZ + 150); group.add(water);

  const sandMat = new THREE.MeshLambertMaterial({ color: PALETTE.sand });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, 110), sandMat);
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, beachZ + 52); group.add(sand);

  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const lineMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  for (let k = -6; k <= 6; k += 1) {
    const c = k * pitch;
    const v = new THREE.Mesh(new THREE.PlaneGeometry(CITY.road, half * 2), roadMat);
    v.rotation.x = -Math.PI / 2; v.position.set(c, 0, 0); group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, CITY.road), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0, c); group.add(h);
    roads.push({ axis: 'x', at: c, from: -half, to: half });
    roads.push({ axis: 'z', at: c, from: -half, to: half });
    for (let d = -half + 30; d < half; d += 60) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 8), lineMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(c, 0.06, d); group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.2), lineMat);
      dash2.rotation.x = -Math.PI / 2; dash2.position.set(d, 0.06, c); group.add(dash2);
    }
  }

  const facade = facadeTexture(THREE);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const mats = PALETTE.building.map((col) => new THREE.MeshLambertMaterial({ color: col, map: facade }));
  const roofMat = new THREE.MeshLambertMaterial({ color: PALETTE.roof });
  const glassMat = new THREE.MeshPhongMaterial({ color: PALETTE.glass, shininess: 90, specular: '#ffe9b0' });
  for (let i = -6; i < 6; i += 1) for (let j = -6; j < 6; j += 1) {
    const cx = i * pitch + pitch / 2, cz = j * pitch + pitch / 2;
    if (cz > beachZ - 30) continue;
    const downtown = Math.abs(cx) < 150 && Math.abs(cz) < 150;
    const harbor = cx > 180;
    const n = downtown ? 1 : (random() < 0.55 ? 2 : 1);
    for (let b = 0; b < n; b += 1) {
      const w = rangeRandom(random, 16, 30), d = rangeRandom(random, 16, 30);
      const h = downtown ? rangeRandom(random, 26, 68) : harbor ? rangeRandom(random, 10, 18) : rangeRandom(random, 8, 24);
      const ox = n === 1 ? 0 : (b === 0 ? -9 : 9), oz = n === 1 ? 0 : (b === 0 ? 8 : -8);
      const mesh = new THREE.Mesh(boxGeo, pickRandom(random, mats));
      mesh.scale.set(w, h, d); mesh.position.set(cx + ox, h / 2, cz + oz); group.add(mesh);
      const roof = new THREE.Mesh(boxGeo, roofMat);
      roof.scale.set(w + 1, 1.2, d + 1); roof.position.set(cx + ox, h + 0.6, cz + oz); group.add(roof);
      if (downtown && h > 40) {
        const crown = new THREE.Mesh(boxGeo, glassMat);
        crown.scale.set(w * 0.5, 6, d * 0.5); crown.position.set(cx + ox, h + 4, cz + oz); group.add(crown);
      }
      colliders.push({ x0: cx + ox - w / 2 - 0.5, z0: cz + oz - d / 2 - 0.5, x1: cx + ox + w / 2 + 0.5, z1: cz + oz + d / 2 + 0.5 });
    }
  }

  const palmTrunk = new THREE.CylinderGeometry(0.5, 0.8, 9, 5);
  const palmMat = new THREE.MeshLambertMaterial({ color: PALETTE.trunk });
  const palmTop = new THREE.IcosahedronGeometry(3.4, 0);
  const palmTopMat = new THREE.MeshLambertMaterial({ color: PALETTE.palm, flatShading: true });
  const lampPole = new THREE.CylinderGeometry(0.18, 0.18, 7, 5);
  const lampMat = new THREE.MeshLambertMaterial({ color: '#3a3f4a' });
  const lampGlow = new THREE.SphereGeometry(0.9, 8, 6);
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: '#ffd98a' });
  for (let k = -5; k <= 5; k += 1) {
    const c = k * pitch;
    for (const s of [-1, 1]) {
      if (c + s * 9 > beachZ) continue;
      const px = c + s * 9, pz = -330 + Math.abs(k) * 13;
      const trunk = new THREE.Mesh(palmTrunk, palmMat); trunk.position.set(px, 4.5, pz); group.add(trunk);
      const top = new THREE.Mesh(palmTop, palmTopMat); top.position.set(px, 10, pz); top.scale.y = 0.55; group.add(top);
      const pole = new THREE.Mesh(lampPole, lampMat); pole.position.set(c + s * 7, 3.5, pz + 24); group.add(pole);
      const glow = new THREE.Mesh(lampGlow, lampGlowMat); glow.position.set(c + s * 7, 7.2, pz + 24); group.add(glow);
    }
  }

  // Marina pier, lighthouse and harbour cranes — the skyline the cover shot is built on.
  const pierMat = new THREE.MeshLambertMaterial({ color: '#8a6b4f' });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 90), pierMat);
  pier.position.set(-240, 1, beachZ + 70); group.add(pier);
  const lightMat = new THREE.MeshLambertMaterial({ color: '#f4f1e8' });
  const lightTop = new THREE.MeshLambertMaterial({ color: '#e8452c' });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 26, 8), lightMat);
  tower.position.set(-240, 14, beachZ + 108); group.add(tower);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 3, 8), lightTop);
  cap.position.set(-240, 28.5, beachZ + 108); group.add(cap);
  const craneMat = new THREE.MeshLambertMaterial({ color: '#d95f6e' });
  for (const cx of [240, 300]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(4, 34, 4), craneMat);
    leg.position.set(cx, 17, -240); group.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(46, 3, 3), craneMat);
    arm.position.set(cx + 18, 33, -240); group.add(arm);
    colliders.push({ x0: cx - 3, z0: -243, x1: cx + 3, z1: -237 });
  }
  // Shipping containers stacked at the harbour.
  const contCols = ['#2c9de8', '#e8452c', '#f2c14e', '#5b7fa6'];
  for (let i = 0; i < 10; i += 1) {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: contCols[i % 4] }));
    m.scale.set(12, 3, 3.2); m.position.set(210 + (i % 5) * 14, 1.6 + Math.floor(i / 5) * 3.2, -300 + (i % 2) * 8); group.add(m);
  }
  return { group, colliders, roads, spawn: { x: 0, z: 120, heading: 0 } };
}
