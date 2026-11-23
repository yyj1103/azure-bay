// AZURE BAY — every tuning number, colour and name in one place. A sun-soaked
// coastal city on a 720 x 720 grid: streets every 60 units, a beach and water to
// the south, a harbour to the east, downtown towers in the middle.
export const STEP = 1 / 60;
export const CITY = { size: 720, half: 360, pitch: 60, road: 12, beachZ: 252 };
export const SAVE_KEY = 'azure-bay.save.v1';

export const PALETTE = {
  skyTop: '#ff9a5c', skyMid: '#ffb37a', skyLow: '#ffd9a0', sun: '#fff3c4',
  water: '#1e7f8e', sand: '#e8c98f', grass: '#7fae62',
  road: '#3a3f4a', roadLine: '#e8d47a', sidewalk: '#9a938a',
  building: ['#e07856', '#e8a05c', '#d95f6e', '#c96f4a', '#e8b4b8', '#f2c14e', '#7fb3a3', '#5b7fa6'],
  glass: '#7fc4d6', roof: '#5a4a52', palm: '#3f7d4e', trunk: '#8a6b4f',
  police: '#1d4e9e', policeWhite: '#eef2f5', taxi: '#f2c14e',
  player: '#ff5c8a', hud: '#101820', hudText: '#f4f1e8', accent: '#ffb347',
};

export const DISTRICTS = [
  { name: 'MARINA', x0: -360, z0: 240, x1: 360, z1: 360 },
  { name: 'DOWNTOWN', x0: -120, z0: -120, x1: 120, z1: 120 },
  { name: 'HARBOR', x0: 180, z0: -360, x1: 360, z1: 240 },
  { name: 'OLD TOWN', x0: -360, z0: -360, x1: -120, z1: 240 },
  { name: 'HILLS', x0: -120, z0: -360, x1: 180, z1: -120 },
];

export const VEHICLES = {
  comet: { name: 'COMET GT', color: '#e8452c', topSpeed: 46, accel: 22, grip: 2.6, price: 0 },
  stingray: { name: 'STINGRAY S', color: '#2c9de8', topSpeed: 52, accel: 26, grip: 2.9, price: 8500 },
  hauler: { name: 'HAULER 4x4', color: '#5a7d4f', topSpeed: 38, accel: 17, grip: 2.2, price: 6200 },
  taxi: { name: 'BAY TAXI', color: '#f2c14e', topSpeed: 40, accel: 18, grip: 2.4, price: 0 },
  cruiser: { name: 'ABPD CRUISER', color: '#1d4e9e', topSpeed: 48, accel: 25, grip: 2.8, price: 0 },
};

export const WEAPONS = [
  { name: 'FISTS', key: '1', damage: 12, rate: 0.45, range: 2.2, ammo: Infinity, locked: false },
  { name: 'PISTOL', key: '2', damage: 22, rate: 0.28, range: 55, ammo: 120, locked: false },
  { name: 'SMG', key: '3', damage: 14, rate: 0.09, range: 48, ammo: 240, locked: false },
  { name: 'SHOTGUN', key: '4', damage: 65, rate: 0.9, range: 26, ammo: 40, locked: false },
  { name: 'RIFLE', key: '5', damage: 42, rate: 0.14, range: 90, ammo: 90, locked: true },
  { name: 'LAUNCHER', key: '6', damage: 150, rate: 1.4, range: 70, ammo: 6, locked: true },
];

export const RADIO = [
  { station: 'AZURE 98.5 FM', song: 'Neon Coastline — PALM STATIC' },
  { station: 'AZURE 98.5 FM', song: 'Sunset Overdrive — THE MARINAS' },
  { station: 'BAY WAVE 101', song: 'Golden Hour — SOLSTICE' },
  { station: 'BAY WAVE 101', song: 'Chrome Hearts — VELVET RAY' },
];

export const CONTACTS = {
  marisol: { name: 'MARISOL', role: 'Fixer', color: '#ff5c8a', line: 'You drive, I plan. Do not scratch the paint.' },
  deacon: { name: 'DEACON', role: 'Crew Chief', color: '#ffb347', line: 'Keep it clean, keep it fast. ABPD is everywhere tonight.' },
  vera: { name: 'VERA', role: 'Harbor Boss', color: '#7fb3a3', line: 'The docks are mine. The cops are yours. Deal?' },
};
