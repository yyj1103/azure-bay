// Boot and the one loop: AZURE BAY. Input is read every frame, the sim
// advances in fixed 1/60 s steps, the renderer paints what is there, and the
// DOM HUD refreshes ten times a second. The game moves between four screens:
// title, play, paused and game over.
//
// ?seed=N fixes the city. ?shot=chase|foot|garage|title (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createSim, startJob, stepSim, getHudState, resetRun } from './sim.js';
import { createHud, updateHud, showBanner, setScreen } from './hud.js';
import { stageShot } from './shots.js';
import { renderFrame } from './render.js';
import { MISSIONS } from './missions.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const sim = createSim(canvas, seed);
const hud = createHud();
const input = createInput(canvas);
const statusEl = document.getElementById('status');

function announce(message) { statusEl.textContent = message; }
function paintHud() { updateHud(hud, getHudState(sim)); }

function runShot(name) {
  const screen = stageShot(name, sim);
  if (screen === 'title') setScreen(hud, 'title', sim.save);
  else setScreen(hud, '', sim.save);
  document.getElementById('hud').style.display = screen === 'title' ? 'none' : 'block';
  if (screen === 'title') {
    // Title shot: hide the HUD, show the title screen over the city.
    sim.r.camera.position.copy(sim.r.camPos);
    sim.r.camera.lookAt(sim.r.camLook);
  }
  paintHud();
  if (sim.banner) {
    hud.banner.textContent = sim.banner.text;
    hud.bannerSub.textContent = sim.banner.sub || '';
    hud.banner.parentElement.style.display = 'block';
  }
  document.getElementById('garage-panel').style.display = sim.garageOpen ? 'block' : 'none';
  let painted = 0;
  function paint() {
    renderFrame(sim.r, window.innerWidth, window.innerHeight);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotInfo = { shot: name, seed, ready: true };
      window.__shotReady = true;
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = 'title';
  let accumulator = 0;
  let last = performance.now();
  let hudTimer = 0;
  sim.screen = 'title';
  setScreen(hud, 'title', sim.save);

  function enterPlay() {
    resetRun(sim);
    sim.screen = 'play'; screen = 'play';
    setScreen(hud, '', sim.save);
    document.getElementById('hud').style.display = 'block';
    announce('Playing. AZURE BAY. WASD to move, E to steal a car.');
    sim.audio.unlock();
  }

  function showPause() {
    sim.screen = 'pause'; screen = 'pause';
    setScreen(hud, 'pause', sim.save);
    document.getElementById('hud').style.display = 'none';
    announce('Paused.');
  }

  function showOver() {
    screen = 'over';
    setScreen(hud, 'over', sim.save);
    document.getElementById('over-title').textContent = sim.overReason || 'WASTED';
    document.getElementById('over-sub').textContent = `Cash kept: $${Math.floor(sim.cash).toLocaleString()} · Jobs done: ${sim.save.jobsDone.length}/10`;
    document.getElementById('hud').style.display = 'none';
  }

  // Title screen: click a job to start it, or free-roam.
  hud.missionList.addEventListener('click', (event) => {
    const row = event.target.closest('.ml-row');
    if (!row) return;
    const index = Number.parseInt(row.dataset.job, 10);
    if (!Number.isInteger(index)) return;
    enterPlay();
    startJob(sim, index);
    showBanner(hud, `JOB ${index + 1}/10 — ${MISSIONS[index].title}`, MISSIONS[index].dialogue, 4000);
  });
  document.getElementById('start-roam').addEventListener('click', () => { enterPlay(); });
  document.getElementById('resume-btn').addEventListener('click', () => {
    sim.screen = 'play'; screen = 'play'; setScreen(hud, '', sim.save);
    document.getElementById('hud').style.display = 'block';
  });
  document.getElementById('quit-title-btn').addEventListener('click', () => {
    sim.screen = 'title'; screen = 'title'; setScreen(hud, 'title', sim.save);
  });
  document.getElementById('restart-btn').addEventListener('click', () => { enterPlay(); });
  document.getElementById('over-restart-btn').addEventListener('click', () => { enterPlay(); });
  document.getElementById('over-title-btn').addEventListener('click', () => {
    sim.screen = 'title'; screen = 'title'; setScreen(hud, 'title', sim.save);
  });
  // Garage upgrades.
  document.querySelectorAll('#garage-panel [data-upgrade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.upgrade;
      const price = Number.parseInt(btn.dataset.price, 10);
      if (sim.cash < price) { showBanner(hud, 'NOT ENOUGH CASH', `You need $${price.toLocaleString()} for this upgrade.`, 2200); return; }
      sim.cash -= price; sim.save.cash = sim.cash;
      if (kind === 'armor') sim.player.armour = Math.min(100, sim.player.armour + 50);
      if (kind === 'engine' && sim.player.car) sim.player.car.def.topSpeed += 6;
      if (kind === 'tires' && sim.player.car) sim.player.car.def.grip += 0.4;
      showBanner(hud, 'UPGRADE INSTALLED', `${btn.dataset.name} — $${price.toLocaleString()}`, 2200);
    });
  });
  document.getElementById('garage-close').addEventListener('click', () => {
    document.getElementById('garage-panel').style.display = 'none'; sim.garageOpen = false;
  });
  window.addEventListener('keydown', () => sim.audio.unlock(), { once: true });
  window.addEventListener('pointerdown', () => sim.audio.unlock(), { once: true });

  function frame(now) {
    requestAnimationFrame(frame);
    const frameDt = Math.min((now - last) / 1000, 0.25);
    accumulator += frameDt;
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      if (screen === 'title') enterPlay();
      else if (screen === 'over') enterPlay();
      else if (screen === 'pause') {
        sim.screen = 'play'; screen = 'play'; setScreen(hud, '', sim.save);
        document.getElementById('hud').style.display = 'block';
      }
    } else if (actions & ACTION_PAUSE) {
      if (screen === 'play') showPause();
      else if (screen === 'pause') {
        sim.screen = 'play'; screen = 'play'; setScreen(hud, '', sim.save);
        document.getElementById('hud').style.display = 'block';
      }
    }
    if (screen === 'play') {
      while (accumulator >= STEP) { stepSim(sim, input, STEP); accumulator -= STEP; }
      if (sim.screen === 'over') showOver();
      if (sim.banner && sim.time < sim.banner.until) {
        hud.banner.textContent = sim.banner.text;
        hud.bannerSub.textContent = sim.banner.sub || '';
        hud.banner.parentElement.style.display = 'block';
      } else if (sim.banner) {
        hud.banner.parentElement.style.display = 'none';
        sim.banner = null;
      }
      document.getElementById('garage-panel').style.display = sim.garageOpen ? 'block' : 'none';
      hudTimer -= frameDt;
      if (hudTimer <= 0) { paintHud(); hudTimer = 0.1; }
      renderFrame(sim.r, window.innerWidth, window.innerHeight);
    } else if (screen === 'title') {
      // Living backdrop: traffic rolls behind the title screen.
      while (accumulator >= STEP) { stepSim(sim, input, STEP); accumulator -= STEP; }
      renderFrame(sim.r, window.innerWidth, window.innerHeight);
    } else {
      accumulator = 0;
      renderFrame(sim.r, window.innerWidth, window.innerHeight);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') showPause();
  });
  announce('AZURE BAY. Pick a job, or start free roam.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
