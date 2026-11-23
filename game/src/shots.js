// The screenshot scenes behind ?shot=chase|foot|garage|title. Each one puts the
// real sim into a named scene and plays it forward with an autopilot, so the
// frame is what a short game really looks like and the same seed gives the
// same frame. stageShot returns the screen to show; main.js paints it twice
// and sets window.__shotReady for the screenshot.
import { STEP } from './config.js';
import { startJob, stepSim, resetRun } from './sim.js';
import { spawnExplosion } from './weapons.js';
import { addWanted, spawnPoliceUnit } from './police.js';

const FAKE = {
  drive: () => ({ throttle: 1, steer: 0, brake: false, boost: false }),
  walk: () => ({ x: 0, z: 0, run: false }),
  shooting: () => false,
  takeActions: () => 0,
  takeWeaponSlot: () => -1,
};

function driveForward(s, seconds, steerFn) {
  const input = { ...FAKE, drive: () => ({ throttle: 1, steer: steerFn ? steerFn(s.time) : 0, brake: false, boost: true }) };
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) stepSim(s, input, STEP);
}

function idle(s, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) stepSim(s, FAKE, STEP);
}

export function stageShot(name, s) {
  resetRun(s);
  s.cash = 12480; s.respect = 35; s.save.cash = 12480; s.save.respect = 35;
  s.screen = 'play';
  if (name === 'chase') {
    // Cover: third-person chase down a downtown avenue, three cruisers on the
    // tail, CONDOR-1 overhead with its spotlight, a roadblock and an explosion
    // ahead, job 3 in its delivery stage.
    startJob(s, 2);
    s.mission.stage = 1;
    s.player.x = 0; s.player.z = -90; s.player.heading = 0;
    const car = s.parked[0];
    car.x = 0; car.z = -90; car.heading = 0; car.speed = 30;
    s.player.car = car; s.player.inCar = car;
    s.police.wanted = 3; s.police.heat = 1; s.police.lastCrime = s.time;
    for (let i = 0; i < 3; i += 1) {
      const u = spawnPoliceUnit(s.THREE, s.police, -8 + i * 8, -130 - i * 16, s.random);
      u.car.speed = 34; s.r.scene.add(u.car.mesh);
    }
    s.r.shake = 0;
    driveForward(s, 5, (t) => Math.sin(t * 0.7) * 0.12);
    // Explosion ahead, staged after the drive so it is mid-blast in the frame.
    const ex = spawnExplosion(s.r.scene, s.THREE, 6, s.player.z + 34, true);
    ex.t = 0.55; ex.group.scale.set(1.9, 1.45, 1.9);
    s.explosions.push(ex);
    s.r.shake = 0;
    return 'play';
  }
  if (name === 'foot') {
    // On foot at the marina pier: pistol out, four Harbor Boys ahead, two
    // stars, job 4 running, objective beacon on the pier.
    startJob(s, 3);
    s.player.x = -240; s.player.z = 262; s.player.heading = 0;
    s.loadout.slot = 1;
    s.police.wanted = 2; s.police.heat = 1; s.police.lastCrime = s.time;
    // Fire a few real shots so the muzzle flash and a falling enemy are in frame.
    const input = { ...FAKE, shooting: () => true };
    const steps = Math.round(2.2 / STEP);
    for (let i = 0; i < steps; i += 1) stepSim(s, input, STEP);
    s.r.shake = 0;
    return 'play';
  }
  if (name === 'garage') {
    // A different system: job 2 just completed at Deacon's garage, the upgrade
    // shop open beside the fresh Stingray, save indicator on screen.
    startJob(s, 1);
    s.mission.stage = 1;
    s.player.x = 108; s.player.z = -48; s.player.heading = Math.PI * 0.75;
    const car = s.parked[1];
    car.x = 120; car.z = -60; car.heading = Math.PI / 2; car.speed = 0;
    s.player.car = null; s.player.inCar = null;
    s.cash += 2500; s.respect += 15;
    s.garageOpen = true;
    s.banner = { text: 'JOB COMPLETE — FIRST WHEELS', sub: '+$2,500 · +15 REP · STINGRAY S added to your garage', until: 9999 };
    s.r.shake = 0;
    idle(s, 1.2);
    return 'play';
  }
  // Title: the start screen over a living city at dusk — traffic rolling,
  // camera high over downtown, mission list and save line on show.
  s.screen = 'play';
  s.player.x = 0; s.player.z = 120; s.player.heading = 0;
  idle(s, 3);
  s.r.camPos.set(60, 90, -140);
  s.r.camLook.set(0, 0, 40);
  s.r.camera.position.copy(s.r.camPos);
  s.r.camera.lookAt(s.r.camLook);
  s.screen = 'title';
  return 'title';
}
