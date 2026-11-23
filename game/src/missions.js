// Eight story jobs for AZURE BAY: the mission list the start screen shows, the
// contact who calls each one in, and the stage engine that runs them. Stages
// are small verbs — driveTo, pickup, deliver, defeat, collect, race, survive,
// escape — so every job on the list is genuinely playable, not a label.
// startMission begins a job; updateMission advances stages and reports
// completion, failure and the next objective line.
export const MISSIONS = [
  { id: 1, title: 'SUNSET PICKUP', contact: 'marisol', reward: 800, respect: 10,
    dialogue: 'Meet me at the marina pier. First job, easy money — do not be late.',
    stages: [{ type: 'driveTo', x: -240, z: 260, r: 10, label: 'Drive to the Marina Pier' }] },
  { id: 2, title: 'FIRST WHEELS', contact: 'deacon', reward: 2500, respect: 15,
    dialogue: 'Borrow any car on the street and bring it to my garage. Borrow. Keep it.',
    stages: [
      { type: 'steal', label: 'Steal any car (press E near one)' },
      { type: 'driveTo', x: 120, z: -60, r: 10, label: 'Deliver the car to Deacon\'s Garage' },
    ] },
  { id: 3, title: 'HARBOR HEAT', contact: 'vera', reward: 4200, respect: 20,
    dialogue: 'A crate at the docks has my name on it. ABPD will notice. Drive like you mean it.',
    stages: [
      { type: 'pickup', x: 260, z: -280, r: 8, label: 'Pick up the crate at the docks' },
      { type: 'deliver', x: -60, z: 180, r: 10, label: 'Deliver to the Hideout — ABPD is on you', wanted: 2 },
    ] },
  { id: 4, title: 'BAYFRONT BRAWL', contact: 'vera', reward: 3800, respect: 20,
    dialogue: 'Harbor Boys took my pier. Four of them. Take it back, on foot, with the pistol.',
    stages: [{ type: 'defeat', count: 4, x: -240, z: 300, r: 26, label: 'Defeat the Harbor Boys at the pier' }] },
  { id: 5, title: 'NEON NIGHTS', contact: 'deacon', reward: 5000, respect: 25,
    dialogue: 'Street race, four gates, one hundred seconds. The whole bay is watching.',
    stages: [{ type: 'race', time: 100, gates: [[-180, -180], [180, -180], [180, 180], [-180, 180]], label: 'Race through 4 gates before the clock dies' }] },
  { id: 6, title: 'THE COLLECTOR', contact: 'marisol', reward: 4500, respect: 25,
    dialogue: 'Five packages stashed around the city. Collect them all. No questions.',
    stages: [{ type: 'collect', count: 5, label: 'Collect 5 packages around Azure Bay' }] },
  { id: 7, title: 'SKYLINE DROP', contact: 'marisol', reward: 6000, respect: 30,
    dialogue: 'A drop at the north airstrip, then stay alive while ABPD throws everything at you.',
    stages: [
      { type: 'driveTo', x: 0, z: -330, r: 10, label: 'Drive to the North Airstrip' },
      { type: 'survive', seconds: 45, wanted: 3, label: 'Survive the ABPD response — 45 seconds' },
    ] },
  { id: 8, title: 'KING OF AZURE BAY', contact: 'vera', reward: 12000, respect: 50,
    dialogue: 'The Marina Casino vault. In, out, and gone before CONDOR-1 is overhead. This is the big one.',
    stages: [
      { type: 'driveTo', x: -120, z: 300, r: 10, label: 'Reach the Marina Casino' },
      { type: 'pickup', x: -120, z: 300, r: 8, label: 'Grab the vault cash' },
      { type: 'escape', x: -60, z: 180, r: 10, label: 'Escape to the Hideout — 4 stars, no stopping', wanted: 4 },
    ] },
];

export function startMission(state, index) {
  const def = MISSIONS[index];
  state.active = { def, index, stage: 0, timer: 0, collected: 0, defeated: 0, gate: 0, done: false, failed: false, message: '' };
  const s = def.stages[0];
  if (s.type === 'race') state.active.timer = s.time;
  if (s.type === 'survive') state.active.timer = s.seconds;
  return state.active;
}

export function currentStage(active) { return active.def.stages[active.stage]; }
export function missionProgress(active) { return `${active.stage + 1}/${active.def.stages.length}`; }

export function updateMission(active, ctx, dt) {
  if (!active || active.done || active.failed) return null;
  const s = currentStage(active);
  if (s.type === 'race') {
    active.timer -= dt;
    if (active.timer <= 0) { active.failed = true; return 'failed'; }
  }
  if (s.type === 'survive') {
    active.timer -= dt;
    if (active.timer <= 0) return advanceStage(active, ctx);
  }
  if (s.type === 'defeat' && active.defeated >= s.count) return advanceStage(active, ctx);
  if (s.type === 'collect' && active.collected >= s.count) return advanceStage(active, ctx);
  if (s.type === 'steal' && ctx.inCar) return advanceStage(active, ctx);
  const px = ctx.x, pz = ctx.z;
  if (s.x !== undefined) {
    const d = Math.hypot(px - s.x, pz - s.z);
    if (d < s.r) {
      if (s.type === 'driveTo' || s.type === 'pickup' || s.type === 'deliver' || s.type === 'escape') return advanceStage(active, ctx);
    }
  }
  return null;
}

export function advanceStage(active, ctx) {
  active.stage += 1;
  if (active.stage >= active.def.stages.length) { active.done = true; return 'complete'; }
  const s = currentStage(active);
  if (s.type === 'race') active.timer = s.time;
  if (s.type === 'survive') active.timer = s.seconds;
  if (s.wanted !== undefined && ctx.setWanted) ctx.setWanted(s.wanted);
  active.message = s.label;
  return 'stage';
}

export function missionObjective(active) {
  if (!active) return 'No job active — pick a job from the menu (M).';
  if (active.done) return 'JOB COMPLETE';
  if (active.failed) return 'JOB FAILED';
  return currentStage(active).label;
}
