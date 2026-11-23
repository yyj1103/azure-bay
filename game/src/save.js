// Save and load: cash, respect, jobs done, garage cars and the radio station,
// kept in localStorage between visits. saveGame writes it; loadGame reads it
// back or returns the fresh-start defaults. Nothing here ever throws.
import { SAVE_KEY } from './config.js';

export function freshSave() {
  return { cash: 1250, respect: 0, jobsDone: [], garage: ['comet'], station: 0, best: 0, created: Date.now() };
}

export function saveGame(save) {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    const s = JSON.parse(raw);
    return { ...freshSave(), ...s, jobsDone: Array.isArray(s.jobsDone) ? s.jobsDone : [], garage: Array.isArray(s.garage) ? s.garage : ['comet'] };
  } catch { return freshSave(); }
}

export function respectRank(respect) {
  if (respect >= 150) return 'BAY LEGEND';
  if (respect >= 100) return 'KINGPIN';
  if (respect >= 60) return 'BIG SHOT';
  if (respect >= 30) return 'HUSTLER';
  if (respect >= 10) return 'STREET ROOKIE';
  return 'NOBODY';
}
