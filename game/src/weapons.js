// Weapons and combat: six slots (two locked until respect grows), hitscan
// shooting with muzzle flash and tracer, explosions that throw cars and
// bystanders, and the armed Harbor Boys the Bayfront Brawl mission fights.
// fireWeapon, spawnExplosion and createEnemy are the entry points the sim uses.
import { WEAPONS } from './config.js';

export function createLoadout() {
  return { slot: 1, ammo: WEAPONS.map((w) => w.ammo), lastShot: -9, enemies: [] };
}

export function switchWeapon(loadout, slot) {
  if (slot < 0 || slot >= WEAPONS.length) return false;
  if (WEAPONS[slot].locked) return false;
  loadout.slot = slot; return true;
}

export function fireWeapon(loadout, now, from, dir, targets, onShot) {
  const w = WEAPONS[loadout.slot];
  if (now - loadout.lastShot < w.rate) return null;
  if (loadout.ammo[loadout.slot] !== Infinity) {
    if (loadout.ammo[loadout.slot] <= 0) return null;
    loadout.ammo[loadout.slot] -= 1;
  }
  loadout.lastShot = now;
  let best = null; let bestD = w.range;
  for (const t of targets) {
    const dx = t.x - from.x, dz = t.z - from.z;
    const d = Math.hypot(dx, dz);
    if (d > bestD) continue;
    const dot = (dx * dir.x + dz * dir.z) / (d || 1);
    if (dot < 0.82) continue;
    best = t; bestD = d;
  }
  if (best) { best.health -= w.damage; if (onShot) onShot(best, w); }
  return { weapon: w, hit: best, dist: bestD };
}

export function createEnemy(THREE, x, z, name) {
  const g = new THREE.Group();
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.45), new THREE.MeshLambertMaterial({ color: '#8a2f3d' }));
  shirt.position.y = 1.05; g.add(shirt);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), new THREE.MeshLambertMaterial({ color: '#e8b98f' }));
  head.position.y = 1.8; g.add(head);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: '#1c222c' }));
  gun.position.set(0.3, 1.2, 0.4); g.add(gun);
  return { mesh: g, x, z, heading: 0, health: 100, name, speed: 4.2, shootCooldown: 2, alive: true };
}

export function updateEnemies(enemies, dt, playerPos, onEnemyShot) {
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = playerPos.x - e.x, dz = playerPos.z - e.z;
    const d = Math.hypot(dx, dz);
    e.heading = Math.atan2(dx, dz);
    if (d > 10) { e.x += Math.sin(e.heading) * e.speed * dt; e.z += Math.cos(e.heading) * e.speed * dt; }
    e.shootCooldown -= dt;
    if (d < 42 && e.shootCooldown <= 0) { e.shootCooldown = 1.6 + Math.random() * 0.8; if (onEnemyShot) onEnemyShot(e, d); }
    e.mesh.position.set(e.x, 0, e.z); e.mesh.rotation.y = e.heading;
    if (e.health <= 0) { e.alive = false; e.mesh.rotation.x = -Math.PI / 2; e.mesh.position.y = 0.3; }
  }
}

export function spawnExplosion(scene, THREE, x, z, big = false) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(big ? 4 : 2.4, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.95 }));
  core.position.set(x, 1.6, z); g.add(core);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(big ? 6.5 : 4, 12, 10), new THREE.MeshBasicMaterial({ color: '#e8452c', transparent: true, opacity: 0.55 }));
  shell.position.set(x, 1.6, z); g.add(shell);
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(big ? 5 : 3, 10, 8), new THREE.MeshBasicMaterial({ color: '#3a3f4a', transparent: true, opacity: 0.5 }));
  smoke.position.set(x, 5, z); g.add(smoke);
  scene.add(g);
  return { group: g, t: 0, life: big ? 1.6 : 1.1, x, z };
}

export function updateExplosions(explosions, dt, scene) {
  for (let i = explosions.length - 1; i >= 0; i -= 1) {
    const e = explosions[i]; e.t += dt;
    const k = e.t / e.life;
    e.group.scale.set(1 + k * 1.6, 1 + k * 0.8, 1 + k * 1.6);
    e.group.children.forEach((c) => { c.material.opacity = Math.max(0, c.material.opacity - dt * 0.9); });
    if (k >= 1) { scene.remove(e.group); explosions.splice(i, 1); }
  }
}
