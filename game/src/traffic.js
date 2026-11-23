// Traffic and pedestrians: cars that drive the road grid and people who walk
// the sidewalks and run from trouble. Traffic cars pick a road, drive to the
// next intersection, turn at random, and stop for nothing; pedestrians stroll
// and flee from a speeding car or a gunshot.
import { VEHICLES } from './config.js';
import { createCar, buildCarMesh } from './vehicles.js';
import { createRandom, pickRandom, rangeRandom } from './random.js';

export function spawnTraffic(THREE, random, count, colliders) {
  const cars = [];
  const keys = ['comet', 'stingray', 'hauler', 'taxi'];
  for (let i = 0; i < count; i += 1) {
    const vertical = random() < 0.5;
    const road = (Math.floor(random() * 13) - 6) * 60;
    const along = rangeRandom(random, -330, 330);
    const car = createCar(pickRandom(random, keys), vertical ? road + 3 : along, vertical ? along : road + 3, vertical ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2));
    car.speed = rangeRandom(random, 8, 14);
    car.mesh = buildCarMesh(THREE, car.def);
    car.mesh.position.set(car.x, 0, car.z); car.mesh.rotation.y = car.heading;
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, random) {
  for (const car of cars) {
    if (car.exploded) continue;
    // Drive on; at an intersection, sometimes turn left or right.
    const onRoadX = Math.abs(car.x % 60) < 1.5 || Math.abs(car.x % 60) > 58.5;
    const onRoadZ = Math.abs(car.z % 60) < 1.5 || Math.abs(car.z % 60) > 58.5;
    if (onRoadX && onRoadZ && random() < dt * 0.35) {
      car.heading += (random() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    if (car.x > 350) { car.x = 350; car.heading = Math.PI; }
    if (car.x < -350) { car.x = -350; car.heading = 0; }
    if (car.z > 350) { car.z = 350; car.heading = -Math.PI / 2; }
    if (car.z < -350) { car.z = -350; car.heading = Math.PI / 2; }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    car.wheelSpin += car.speed * dt * 2;
  }
}

export function spawnPedestrians(THREE, random, count) {
  const peds = [];
  const shirts = ['#ff5c8a', '#2c9de8', '#f2c14e', '#7fb3a3', '#e8b4b8', '#d95f6e'];
  for (let i = 0; i < count; i += 1) {
    const g = new THREE.Group();
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), new THREE.MeshLambertMaterial({ color: pickRandom(random, shirts) }));
    shirt.position.y = 1.05; g.add(shirt);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshLambertMaterial({ color: '#e8b98f' }));
    head.position.y = 1.75; g.add(head);
    const legMat = new THREE.MeshLambertMaterial({ color: '#2c3e55' });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.6, 0.26), legMat); legL.position.set(-0.18, 0.3, 0); g.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.6, 0.26), legMat); legR.position.set(0.18, 0.3, 0); g.add(legR);
    const road = (Math.floor(random() * 13) - 6) * 60;
    const vertical = random() < 0.5;
    const along = rangeRandom(random, -330, 330);
    peds.push({
      mesh: g, x: vertical ? road + 8 : along, z: vertical ? along : road + 8,
      heading: random() * Math.PI * 2, speed: rangeRandom(random, 1.2, 2.4),
      flee: 0, phase: random() * 6, legL, legR,
    });
  }
  return peds;
}

export function updatePedestrians(peds, dt, playerPos, danger) {
  for (const p of peds) {
    const dx = p.x - playerPos.x, dz = p.z - playerPos.z;
    const d = Math.hypot(dx, dz);
    if (d < 14 && danger) { p.flee = 2.5; p.heading = Math.atan2(dx, dz); }
    if (p.flee > 0) { p.flee -= dt; p.speed = 5.5; }
    else { p.speed = 1.8; if (Math.random() < dt * 0.08) p.heading += (Math.random() - 0.5) * 1.8; }
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    p.x = Math.max(-352, Math.min(352, p.x)); p.z = Math.max(-352, Math.min(352, p.z));
    p.phase += dt * (p.flee > 0 ? 14 : 6);
    p.legL.rotation.x = Math.sin(p.phase) * 0.6; p.legR.rotation.x = -Math.sin(p.phase) * 0.6;
    p.mesh.position.set(p.x, 0, p.z); p.mesh.rotation.y = p.heading;
  }
}
