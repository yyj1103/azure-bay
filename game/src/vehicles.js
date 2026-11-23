// Vehicles: low-poly car models and arcade driving. A car is a box body, a
// cabin, four spinning wheels and headlights; physics is arcade — throttle,
// steering that bites harder the slower you go, drift on the handbrake, and
// circle-vs-building collision. stealCar parks the player in the driver's seat.
import { VEHICLES } from './config.js';

export function buildCarMesh(THREE, def, police = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: def.color });
  const darkMat = new THREE.MeshLambertMaterial({ color: '#1c222c' });
  const glassMat = new THREE.MeshPhongMaterial({ color: '#9fd8e8', shininess: 100, specular: '#ffffff' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), bodyMat);
  body.position.y = 0.62; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.1), glassMat);
  cabin.position.set(0, 1.2, -0.25); g.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.7), darkMat);
  nose.position.set(0, 0.45, 2.2); g.add(nose);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [x, z] of [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat); w.position.set(x, 0.42, z); g.add(w); wheels.push(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: '#fff2b0' });
  for (const x of [-0.7, 0.7]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.1), lightMat);
    l.position.set(x, 0.7, 2.56); g.add(l);
  }
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: '#ff2d2d' }));
    bar.position.set(0, 1.62, -0.25); g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: '#2d6bff' }));
    bar2.position.set(0, 1.62, 0.15); g.add(bar2);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 4.42), new THREE.MeshLambertMaterial({ color: '#eef2f5' }));
    stripe.position.y = 0.62; g.add(stripe);
  }
  g.userData.wheels = wheels;
  return g;
}

export function createCar(defKey, x, z, heading, police = false) {
  const def = VEHICLES[defKey] ?? VEHICLES.comet;
  return {
    defKey, def, police, x, z, heading, speed: 0, steer: 0,
    condition: 100, stuck: 0, mesh: null, wheelSpin: 0, exploded: false,
  };
}

export function driveCar(car, input, dt, colliders, onHit) {
  const def = car.def;
  const target = input.throttle * def.topSpeed;
  const accel = input.throttle > 0 ? def.accel : (input.throttle < 0 ? def.accel * 0.8 : 10);
  car.speed += Math.max(-accel * dt, Math.min(accel * dt, target - car.speed));
  if (input.boost && input.throttle > 0) car.speed = Math.min(car.speed + 14 * dt, def.topSpeed * 1.18);
  const grip = input.boost ? def.grip * 0.75 : def.grip;
  const steerTarget = input.steer * (0.55 + 0.45 * Math.max(0, 1 - Math.abs(car.speed) / def.topSpeed));
  car.steer += (steerTarget - car.steer) * Math.min(1, 10 * dt);
  const moving = Math.abs(car.speed) > 0.2;
  if (moving) car.heading += car.steer * grip * 0.45 * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 12 + 0.25);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  if (collides(nx, nz, 2.2, colliders)) {
    car.speed *= -0.25; car.condition = Math.max(0, car.condition - 2);
    if (onHit) onHit();
  } else { car.x = nx; car.z = nz; }
  car.wheelSpin += car.speed * dt * 2;
  return car;
}

export function collides(x, z, r, colliders) {
  if (Math.abs(x) > 356 || Math.abs(z) > 356) return true;
  for (let i = 0; i < colliders.length; i += 1) {
    const c = colliders[i];
    if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) return true;
  }
  return false;
}

export function pushOutOfColliders(x, z, r, colliders) {
  for (let i = 0; i < colliders.length; i += 1) {
    const c = colliders[i];
    if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) {
      const dxl = x + r - c.x0, dxr = c.x1 - (x - r), dzl = z + r - c.z0, dzr = c.z1 - (z - r);
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) x = c.x0 - r; else if (m === dxr) x = c.x1 + r;
      else if (m === dzl) z = c.z0 - r; else z = c.z1 + r;
    }
  }
  return { x: Math.max(-356, Math.min(356, x)), z: Math.max(-356, Math.min(356, z)) };
}

export function stealCar(player, car) {
  player.inCar = car; player.car = car; car.speed = 0;
  return car;
}
export function exitCar(player) {
  const car = player.car; player.inCar = null; player.car = null;
  if (car) { player.x = car.x - Math.sin(car.heading) * 3; player.z = car.z - Math.cos(car.heading) * 3; player.heading = car.heading; }
  return car;
}
