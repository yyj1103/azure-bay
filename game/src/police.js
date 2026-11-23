// The ABPD wanted system: five stars, named units with a distance in metres
// and a role, and a response that escalates — RAMMING cruisers at one star,
// ROADBLOCK crews at three, CONDOR-1 the police helicopter with its spotlight
// cone at three and up. updateWantedLevel raises and decays the heat;
// spawnPoliceUnit, spawnRoadblock and updateHelicopter run the response.
import { VEHICLES } from './config.js';
import { createCar, buildCarMesh } from './vehicles.js';
import { createRandom, rangeRandom } from './random.js';

export const UNIT_NAMES = ['UNIT 12', 'UNIT 07', 'UNIT 23', 'UNIT 31', 'UNIT 44', 'UNIT 19'];
export const UNIT_ROLES = ['RAMMING', 'CLOSING IN', 'PIT MANOEUVRE', 'ROADBLOCK', 'SPOTLIGHT'];
export const HELI_NAME = 'CONDOR-1';

export function createPolice() {
  return { wanted: 0, heat: 0, units: [], roadblocks: [], heli: null, heliAngle: 0, busted: 0, lastCrime: -99 };
}

export function addWanted(police, stars, now) {
  police.wanted = Math.max(0, Math.min(5, police.wanted + stars));
  police.heat = 1; police.lastCrime = now;
}

export function updateWantedLevel(police, dt, now, playerVisible) {
  // Heat cools when the player stays clean and out of sight; stars fall with it.
  if (now - police.lastCrime > 14 && !playerVisible) police.heat = Math.max(0, police.heat - dt * 0.06);
  if (police.heat <= 0.02 && police.wanted > 0) { police.wanted -= 1; police.heat = police.wanted > 0 ? 0.7 : 0; }
}

export function spawnPoliceUnit(THREE, police, x, z, random) {
  const car = createCar('cruiser', x + rangeRandom(random, -20, 20), z + rangeRandom(random, -20, 20), random() * Math.PI * 2, true);
  car.mesh = buildCarMesh(THREE, car.def, true);
  car.mesh.position.set(car.x, 0, car.z);
  const unit = { car, name: UNIT_NAMES[police.units.length % UNIT_NAMES.length], role: 'RAMMING', dist: 0, ramCooldown: 0 };
  police.units.push(unit);
  return unit;
}

export function updatePoliceUnits(THREE, police, dt, player, random, onRam) {
  const want = police.wanted === 0 ? 0 : police.wanted + 1;
  while (police.units.length < want) spawnPoliceUnit(THREE, police, player.x + (random() - 0.5) * 120, player.z + (random() - 0.5) * 120, random);
  while (police.units.length > want) { const u = police.units.pop(); if (u.car.mesh && u.car.mesh.parent) u.car.mesh.parent.remove(u.car.mesh); }
  for (const u of police.units) {
    const car = u.car; if (car.exploded) continue;
    const dx = player.x - car.x, dz = player.z - car.z;
    const d = Math.hypot(dx, dz); u.dist = Math.round(d);
    u.role = d < 12 ? 'RAMMING' : (d < 60 ? 'CLOSING IN' : 'PIT MANOEUVRE');
    const targetHeading = Math.atan2(dx, dz);
    let diff = targetHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const speed = Math.min(44, 20 + police.wanted * 4 + d * 0.12);
    car.speed += (speed - car.speed) * Math.min(1, 2 * dt);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    if (u.ramCooldown > 0) u.ramCooldown -= dt;
    if (d < 4.5 && u.ramCooldown <= 0) { u.ramCooldown = 1.2; if (onRam) onRam(u, d); }
    car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
  }
}

export function spawnRoadblock(THREE, police, x, z, heading) {
  const group = new THREE.Group();
  for (const off of [-4, 0, 4]) {
    const car = createCar('cruiser', x + Math.cos(heading) * off, z - Math.sin(heading) * off, heading + Math.PI / 2, true);
    car.mesh = buildCarMesh(THREE, car.def, true);
    car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
    group.add(car.mesh);
    police.roadblocks.push({ car, x: car.x, z: car.z });
  }
  return group;
}

export function updateHelicopter(THREE, police, dt, player) {
  if (police.wanted < 3) {
    if (police.heli && police.heli.parent) police.heli.parent.remove(police.heli);
    police.heli = null; return null;
  }
  if (!police.heli) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 6), new THREE.MeshLambertMaterial({ color: '#1d4e9e' }));
    body.position.y = 0; g.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 5), new THREE.MeshLambertMaterial({ color: '#1d4e9e' }));
    tail.position.set(0, 0.3, -5); g.add(tail);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: '#1c222c' }));
    rotor.position.y = 1.1; g.add(rotor); g.userData.rotor = rotor;
    const coneGeo = new THREE.ConeGeometry(7, 42, 16, 1, true);
    const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
    cone.position.y = -21; cone.rotation.x = Math.PI; g.add(cone);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(7, 16), new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: 0.35, depthWrite: false }));
    spot.rotation.x = -Math.PI / 2; spot.position.y = -41.5; g.add(spot); g.userData.spot = spot;
    police.heli = g; police.heliAngle = 0;
  }
  police.heliAngle += dt * 0.45;
  const r = 26;
  const hx = player.x + Math.sin(police.heliAngle) * r, hz = player.z + Math.cos(police.heliAngle) * r;
  police.heli.position.set(hx, 46, hz);
  police.heli.rotation.y = Math.atan2(player.x - hx, player.z - hz);
  police.heli.userData.rotor.rotation.y += dt * 22;
  police.heli.userData.spot.position.set(player.x, 0.15, player.z);
  return police.heli;
}
