// The simulation: one fixed-step loop over the whole of Azure Bay. createSim
// builds the player, the parked cars, traffic, pedestrians, police, missions
// and the save; step advances a frame — driving, walking, carjacking, shooting,
// police pursuit, wanted heat, mission stages, busted and wasted. getHudState
// hands the HUD everything it shows. No drawing here; render.js paints it.
import * as THREE from 'three';
import { STEP, CITY, VEHICLES, WEAPONS, RADIO, CONTACTS } from './config.js';
import { createRandom, pickRandom } from './random.js';
import { createRenderer, createPlayerMesh, createMarker, createPackageMesh, updateCamera, renderFrame } from './render.js';
import { buildCarMesh, createCar, driveCar, collides, pushOutOfColliders, stealCar, exitCar } from './vehicles.js';
import { spawnTraffic, updateTraffic, spawnPedestrians, updatePedestrians } from './traffic.js';
import { createPolice, addWanted, updateWantedLevel, updatePoliceUnits, spawnRoadblock, updateHelicopter } from './police.js';
import { createLoadout, switchWeapon, fireWeapon, createEnemy, updateEnemies, spawnExplosion, updateExplosions } from './weapons.js';
import { MISSIONS, startMission, updateMission, missionObjective } from './missions.js';
import { createAudio } from './audio.js';
import { loadGame, saveGame, respectRank } from './save.js';
import { districtAt } from './city.js';

export function createSim(canvas, seed) {
  const random = createRandom(seed);
  const r = createRenderer(canvas, seed);
  const save = loadGame();
  const audio = createAudio();
  const playerMesh = createPlayerMesh(THREE);
  r.scene.add(playerMesh);
  const marker = createMarker(THREE); marker.visible = false; r.scene.add(marker);
  const muzzle = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
  muzzle.visible = false; r.scene.add(muzzle);
  const parked = [];
  const parkedDefs = [['comet', 40, 180], ['stingray', -90, 60], ['hauler', 150, -150], ['taxi', -180, -120], ['comet', 210, 90]];
  for (const [def, x, z] of parkedDefs) {
    const car = createCar(def, x, z, random() * Math.PI * 2);
    car.mesh = buildCarMesh(THREE, car.def);
    car.mesh.position.set(x, 0, z); car.mesh.rotation.y = car.heading;
    r.scene.add(car.mesh); parked.push(car);
  }
  const traffic = spawnTraffic(THREE, random, 14);
  for (const c of traffic) r.scene.add(c.mesh);
  const peds = spawnPedestrians(THREE, random, 24);
  for (const p of peds) r.scene.add(p.mesh);
  const police = createPolice();
  const loadout = createLoadout();
  loadout.ammo = WEAPONS.map((w) => (w.ammo === Infinity ? Infinity : w.ammo));
  if (save.respect >= 40) { WEAPONS[4].locked = false; }
  if (save.respect >= 80) { WEAPONS[5].locked = false; }

  const s = {
    THREE, r, random, audio, save, seed,
    screen: 'title', time: 0, now: 0,
    player: { x: 0, z: 120, heading: 0, health: 100, armour: 50, inCar: null, car: null, walkPhase: 0, invuln: 0, moving: false },
    playerMesh, marker, muzzle, parked, traffic, peds, police, loadout,
    mission: null, explosions: [], enemies: [], packages: [], packageMeshes: [],
    cash: save.cash, respect: save.respect, station: save.station,
    crewCooldown: 0, crewReady: true, bustedTimer: 0, banner: null,
    garageOpen: false, shop: null, roadblockTimer: 0, hitPedCooldown: 0,
    muzzle: null, muzzleT: 0, overReason: '', startedAt: 0,
  };
  return s;
}

export function startJob(s, index) {
  const active = startMission({ active: null }, index);
  s.mission = active;
  const st = active.def.stages[0];
  if (st.type === 'defeat') spawnEnemies(s, st);
  if (st.type === 'collect') spawnPackages(s, st.count);
  if (st.wanted) addWanted(s.police, st.wanted, s.now);
  s.banner = { text: `JOB ${index + 1}/8 — ${active.def.title}`, sub: active.def.dialogue, until: s.time + 4 };
  s.audio.sting(true);
  return active;
}

function spawnEnemies(s, stage) {
  for (const e of s.enemies) s.r.scene.remove(e.mesh);
  s.enemies = [];
  for (let i = 0; i < stage.count; i += 1) {
    const e = createEnemy(s.THREE, stage.x + (i - 1.5) * 8, stage.z + (i % 2) * 10, `HARBOR BOY ${i + 1}`);
    s.r.scene.add(e.mesh); s.enemies.push(e);
  }
}

function spawnPackages(s, count) {
  const spots = [[-300, -300], [300, 300], [0, -300], [-300, 60], [240, 120]];
  for (const m of s.packageMeshes) s.r.scene.remove(m);
  s.packageMeshes = []; s.packages = [];
  for (let i = 0; i < count; i += 1) {
    const [x, z] = spots[i];
    const m = createPackageMesh(s.THREE, x, z);
    s.r.scene.add(m); s.packageMeshes.push(m); s.packages.push({ x, z, got: false });
  }
}

function nearestStealable(s) {
  let best = null; let bd = 5;
  const all = [...s.parked, ...s.traffic];
  for (const car of all) {
    if (car.exploded || car === s.player.car) continue;
    const d = Math.hypot(car.x - s.player.x, car.z - s.player.z);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

function damagePlayer(s, amount) {
  if (s.player.invuln > 0) return;
  s.player.invuln = 0.4;
  const absorbed = Math.min(s.player.armour, amount);
  s.player.armour -= absorbed;
  s.player.health -= (amount - absorbed);
  s.r.shake = Math.min(1.2, s.r.shake + 0.5);
  if (s.player.health <= 0) endRun(s, 'WASTED');
}

function endRun(s, reason) {
  s.overReason = reason;
  s.screen = 'over';
  s.cash = Math.max(0, Math.floor(s.cash * 0.9));
  s.save.cash = s.cash; saveGame(s.save);
  if (s.mission) s.mission.failed = true;
  s.audio.sting(false);
  s.banner = { text: reason, sub: reason === 'BUSTED' ? 'ABPD took you in — 10% of your cash is gone.' : 'You were wasted — 10% of your cash is gone.', until: s.time + 5 };
}

function completeMission(s) {
  const m = s.mission;
  s.cash += m.def.reward; s.respect += m.def.respect;
  s.save.cash = s.cash; s.save.respect = s.respect;
  if (!s.save.jobsDone.includes(m.def.id)) s.save.jobsDone.push(m.def.id);
  if (m.def.id === 2 && s.player.car) { if (!s.save.garage.includes(s.player.car.defKey)) s.save.garage.push(s.player.car.defKey); }
  saveGame(s.save);
  if (s.respect >= 40) WEAPONS[4].locked = false;
  if (s.respect >= 80) WEAPONS[5].locked = false;
  s.police.wanted = 0; s.police.heat = 0;
  s.banner = { text: `JOB COMPLETE — ${m.def.title}`, sub: `+$${m.def.reward.toLocaleString()} · +${m.def.respect} REP · ${s.save.jobsDone.length}/8 JOBS DONE`, until: s.time + 4 };
  s.audio.sting(true);
  s.mission = null;
}

export function stepSim(s, input, dt) {
  s.time += dt; s.now = s.time;
  const p = s.player;
  if (s.screen === 'title') {
    // Living backdrop behind the title screen: traffic rolls, camera orbits.
    updateTraffic(s.traffic, dt, s.random);
    updatePedestrians(s.peds, dt, { x: p.x, z: p.z }, false);
    const a = s.time * 0.05;
    s.r.camera.position.set(Math.sin(a) * 130, 72, Math.cos(a) * 130);
    s.r.camera.lookAt(0, 8, 0);
    return;
  }
  if (s.screen !== 'play') return;
  if (p.invuln > 0) p.invuln -= dt;
  const actions = input.takeActions();
  const slot = input.takeWeaponSlot();
  if (slot >= 0) switchWeapon(s.loadout, slot);
  if (actions & 64) { /* crew ability: Deacon's Ram */ 
    if (s.crewReady) {
      s.crewReady = false; s.crewCooldown = 45;
      for (const u of s.police.units) {
        const c = u.car; c.speed = -12; c.condition = Math.max(0, c.condition - 30);
        const dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz) || 1;
        c.x += (dx / d) * 14; c.z += (dz / d) * 14;
        s.explosions.push(spawnExplosion(s.r.scene, s.THREE, c.x, c.z));
      }
      addWanted(s.police, -1, s.now); s.audio.explosion(); s.r.shake = 1;
      s.banner = { text: 'CREW ABILITY — DEACON\'S RAM', sub: 'ABPD units spun out · heat down one star', until: s.time + 3 };
    }
  }
  if (actions & 32) { s.station = (s.station + 1) % RADIO.length; s.save.station = s.station; saveGame(s.save); }
  if (actions & 16 && p.car) s.audio.tone(320, 0.25, 'square', 0.12);
  if (actions & 4) {
    if (p.car) { exitCar(p); }
    else {
      const car = nearestStealable(s);
      if (car) {
        stealCar(p, car);
        if (car.police) addWanted(s.police, 1, s.now);
        else if (!s.parked.includes(car)) { const i = s.traffic.indexOf(car); if (i >= 0) s.traffic.splice(i, 1); addWanted(s.police, 1, s.now); }
        s.audio.pickup();
      }
    }
  }
  // Movement.
  if (p.car) {
    const before = p.car.condition;
    driveCar(p.car, input.drive(), dt, s.r.city.colliders, () => { s.audio.noise(0.15, 0.4, 900); s.r.shake = Math.min(1, s.r.shake + 0.4); });
    if (p.car.condition <= 0 && before > 0) {
      p.car.exploded = true;
      s.explosions.push(spawnExplosion(s.r.scene, s.THREE, p.car.x, p.car.z, true));
      s.audio.explosion(); addWanted(s.police, 1, s.now);
      exitCar(p); p.health = Math.max(1, p.health - 25);
    }
    p.x = p.car.x; p.z = p.car.z; p.heading = p.car.heading;
    // Running over a pedestrian is a crime.
    if (s.hitPedCooldown > 0) s.hitPedCooldown -= dt;
    for (const ped of s.peds) {
      if (Math.abs(p.car.speed) > 8 && Math.hypot(ped.x - p.x, ped.z - p.z) < 3 && s.hitPedCooldown <= 0) {
        s.hitPedCooldown = 2; addWanted(s.police, 1, s.now);
        s.banner = { text: 'PEDESTRIAN DOWN', sub: 'ABPD saw that — wanted level up', until: s.time + 2.5 };
      }
    }
  } else {
    const w = input.walk();
    const speed = w.run ? 10 : 6;
    const moving = w.x !== 0 || w.z !== 0;
    if (w.x !== 0) p.heading += w.x * 2.6 * dt;
    if (w.z !== 0) {
      p.x += Math.sin(p.heading) * -w.z * speed * dt;
      p.z += Math.cos(p.heading) * -w.z * speed * dt;
    }
    p.moving = moving;
    if (moving) p.walkPhase += dt * (w.run ? 13 : 9);
    const fixed = pushOutOfColliders(p.x, p.z, 0.7, s.r.city.colliders);
    p.x = fixed.x; p.z = fixed.z;
    // Shooting on foot.
    if (input.shooting()) {
      const dir = { x: Math.sin(p.heading), z: Math.cos(p.heading) };
      const targets = [
        ...s.enemies.filter((e) => e.alive),
        ...s.police.units.map((u) => ({ x: u.car.x, z: u.car.z, health: u.car.condition, unit: u, name: '' })),
      ];
      const res = fireWeapon(s.loadout, s.time, { x: p.x, z: p.z }, dir, targets, (hit, w) => {
        if (hit.unit) {
          hit.unit.car.condition -= w.damage;
          if (hit.unit.car.condition <= 0 && !hit.unit.car.exploded) {
            hit.unit.car.exploded = true;
            s.explosions.push(spawnExplosion(s.r.scene, s.THREE, hit.unit.car.x, hit.unit.car.z, true));
            s.audio.explosion(); addWanted(s.police, 1, s.now);
          }
        }
      });
      if (res) {
        s.audio.gunshot(); addWanted(s.police, 1, s.now);
        s.muzzleT = 0.07;
        if (res.hit && res.hit.health <= 0 && res.hit.name) s.mission && (s.mission.defeated += 1);
      }
    }
  }
  // Player mesh.
  p.mesh = p.mesh || s.playerMesh;
  s.playerMesh.position.set(p.x, 0, p.z);
  s.playerMesh.rotation.y = p.heading;
  const u = s.playerMesh.userData;
  const swing = p.car ? 0 : (p.moving ? Math.sin(p.walkPhase) * 0.5 : 0);
  u.legL.rotation.x = swing; u.legR.rotation.x = -swing; u.armL.rotation.x = -swing * 0.7; u.armR.rotation.x = swing * 0.7;
  s.playerMesh.visible = !p.car;
  s.muzzle.visible = s.muzzleT > 0 && !p.car;
  if (s.muzzle.visible) {
    s.muzzle.position.set(p.x + Math.sin(p.heading) * 1.1, 1.35, p.z + Math.cos(p.heading) * 1.1);
    s.muzzle.rotation.y = p.heading;
  }
  if (p.car) { p.car.mesh.position.set(p.car.x, 0, p.car.z); p.car.mesh.rotation.y = p.car.heading; p.car.mesh.userData.wheels.forEach((w) => { w.rotation.x += p.car.speed * dt * 2; }); }
  // Traffic, pedestrians, enemies, police.
  updateTraffic(s.traffic, dt, s.random);
  updatePedestrians(s.peds, dt, { x: p.x, z: p.z }, p.car ? Math.abs(p.car.speed) > 10 : false);
  updateEnemies(s.enemies, dt, { x: p.x, z: p.z }, (e, d) => { damagePlayer(s, 6 + Math.random() * 6); s.audio.gunshot(); });
  updateWantedLevel(s.police, dt, s.time, s.police.units.length > 0);
  updatePoliceUnits(s.THREE, s.police, dt, p, s.random, (unit) => {
    if (p.car) { p.car.condition = Math.max(0, p.car.condition - 8); s.audio.noise(0.2, 0.5, 700); s.r.shake = 1; }
    else damagePlayer(s, 8);
  });
  if (s.police.wanted >= 3 && s.roadblockTimer <= 0) {
    s.roadblockTimer = 26;
    const grp = spawnRoadblock(s.THREE, s.police, p.x + Math.sin(p.heading) * 60, p.z + Math.cos(p.heading) * 60, p.heading);
    s.r.scene.add(grp);
    s.roadblockGroup = grp;
  }
  if (s.police.wanted === 0 && s.roadblockGroup) {
    s.r.scene.remove(s.roadblockGroup);
    s.roadblockGroup = null; s.police.roadblocks = [];
  }
  if (s.roadblockTimer > 0) s.roadblockTimer -= dt;
  const heli = updateHelicopter(s.THREE, s.police, dt, p);
  if (heli && !heli.parent) s.r.scene.add(heli);
  if (s.police.wanted > 0) s.audio.siren(true); else s.audio.siren(false);
  s.audio.engine(p.car ? Math.abs(p.car.speed) / 50 : 0, !!p.car);
  s.audio.radioTick(dt);
  // Busted: a cruiser sits on the on-foot player.
  if (!p.car && s.police.wanted > 0) {
    const near = s.police.units.some((u) => Math.hypot(u.car.x - p.x, u.car.z - p.z) < 3.5);
    s.bustedTimer = near ? s.bustedTimer + dt : 0;
    if (s.bustedTimer > 2) endRun(s, 'BUSTED');
  }
  // Mission stages.
  if (s.mission) {
    const m = s.mission;
    const ctx = { x: p.x, z: p.z, inCar: !!p.car, setWanted: (n) => { s.police.wanted = Math.max(s.police.wanted, n); s.police.heat = 1; s.police.lastCrime = s.time; } };
    const res = updateMission(m, ctx, dt);
    if (res === 'complete') completeMission(s);
    else if (res === 'failed') { s.banner = { text: 'JOB FAILED', sub: 'The clock ran out — press M to retry the job', until: s.time + 4 }; s.audio.sting(false); s.mission = null; }
    else if (res === 'stage') {
      s.audio.pickup();
      const st = m.def.stages[m.stage];
      if (st.type === 'defeat') spawnEnemies(s, st);
      if (st.type === 'collect') spawnPackages(s, st.count);
      if (st.wanted) addWanted(s.police, st.wanted, s.now);
      s.banner = { text: 'STAGE CLEAR', sub: st.label, until: s.time + 3 };
    }
    // Collect packages by proximity.
    for (let i = 0; i < s.packages.length; i += 1) {
      const pk = s.packages[i];
      if (!pk.got && Math.hypot(pk.x - p.x, pk.z - p.z) < 4) {
        pk.got = true; s.packageMeshes[i].visible = false; m.collected += 1;
        s.cash += 150; s.audio.pickup();
        s.banner = { text: `PACKAGE ${m.collected}/5`, sub: '+$150 — keep collecting', until: s.time + 2 };
      }
    }
  }
  // Objective marker.
  const target = missionTarget(s);
  if (target) {
    s.marker.visible = true;
    s.marker.position.set(target.x, 0, target.z);
    s.marker.userData.beam.rotation.y += dt;
    s.marker.userData.ring.scale.setScalar(1 + Math.sin(s.time * 4) * 0.12);
  } else s.marker.visible = false;
  // Race gates.
  if (s.mission && s.mission.def.stages[s.mission.stage].type === 'race') {
    const st = s.mission.def.stages[s.mission.stage];
    const gate = st.gates[s.mission.gate];
    if (gate && Math.hypot(gate[0] - p.x, gate[1] - p.z) < 12) {
      s.mission.gate += 1; s.audio.pickup();
      s.banner = { text: `GATE ${s.mission.gate}/${st.gates.length}`, sub: s.mission.gate >= st.gates.length ? 'Finish line!' : 'Next gate marked', until: s.time + 2 };
      if (s.mission.gate >= st.gates.length) { s.mission.stage += 1; if (s.mission.stage >= s.mission.def.stages.length) { s.mission.done = true; completeMission(s); } }
    }
  }
  // Garage: drive into Deacon's yard and the upgrade shop opens.
  s.garageOpen = Math.hypot(p.x - 120, p.z + 60) < 20;
  updateExplosions(s.explosions, dt, s.r.scene);
  if (s.crewCooldown > 0) { s.crewCooldown -= dt; if (s.crewCooldown <= 0) s.crewReady = true; }
  if (s.muzzleT > 0) s.muzzleT -= dt;
  updateCamera(s.r, p, dt);
}

export function missionTarget(s) {
  if (!s.mission) return null;
  const st = s.mission.def.stages[s.mission.stage];
  if (st.type === 'race') { const g = st.gates[s.mission.gate]; return g ? { x: g[0], z: g[1] } : null; }
  if (st.x !== undefined) return { x: st.x, z: st.z };
  if (st.type === 'collect') { const pk = s.packages.find((x) => !x.got); return pk ? { x: pk.x, z: pk.z } : null; }
  return null;
}

export function getHudState(s) {
  const p = s.player;
  const target = missionTarget(s);
  return {
    mission: s.mission, objective: s.mission ? missionObjective(s.mission) : 'No job active — pick a job from the menu.',
    contactRole: s.mission ? (CONTACTS[MISSIONS[s.mission.index].contact].role || '') : '',
    wanted: s.police.wanted, cash: s.cash, respect: s.respect,
    district: districtAt(p.x, p.z), timeOfDay: 'GOLDEN HOUR · 7:42 PM',
    units: s.police.units.map((u) => ({ name: u.name, dist: u.dist, role: u.role, x: u.car.x, z: u.car.z })),
    heli: !!s.police.heli,
    roadblocks: s.police.roadblocks.map((rb) => ({ dist: Math.round(Math.hypot(rb.x - p.x, rb.z - p.z)) })),
    health: p.health, armour: p.armour, ammo: s.loadout.ammo, slot: s.loadout.slot,
    inCar: !!p.car, carSpeed: p.car ? p.car.speed : 0, carName: p.car ? p.car.def.name : '',
    carCond: p.car ? p.car.condition : 0, station: s.station, crewReady: s.crewReady,
    x: p.x, z: p.z, heading: p.heading, objectivePos: target,
  };
}

export function resetRun(s) {
  const p = s.player;
  p.x = 0; p.z = 120; p.heading = 0; p.health = 100; p.armour = 50;
  if (p.car) { p.car = null; p.inCar = null; }
  s.police.wanted = 0; s.police.heat = 0; s.police.units = []; s.police.roadblocks = [];
  s.mission = null; s.bustedTimer = 0;
  s.screen = 'play'; s.startedAt = s.time;
}
