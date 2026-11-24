// The HUD: a DOM overlay on all four corners, never canvas-drawn, so every
// panel stays crisp and readable in a screenshot. updateHud refreshes the
// mission card, the ABPD dispatch panel, wanted stars, cash, weapons, health,
// speed, radio and the minimap from the sim state; showBanner flashes the big
// centre text (JOB COMPLETE, WASTED, BUSTED); setScreen swaps title / play /
// pause / game-over. The minimap is a small 2D canvas: streets, the beach,
// the player arrow, the objective marker and police dots.
import { MISSIONS } from './missions.js';
import { WEAPONS, RADIO, DISTRICT_NAMES, districtStanding } from './config.js';
import { respectRank } from './save.js';

function el(id) { return document.getElementById(id); }
function stars(n) { return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n)); }

export function createHud() {
  return {
    mission: el('mission-card'), dispatch: el('dispatch-panel'), stars: el('wanted-stars'),
    cash: el('cash'), respect: el('respect'), district: el('district'), health: el('health-fill'),
    armour: el('armour-fill'), healthText: el('health-text'), weapons: el('weapon-slots'),
    speed: el('speed'), carName: el('car-name'), carCond: el('car-cond'),
    radio: el('radio'), minimap: el('minimap'), banner: el('banner'), bannerSub: el('banner-sub'),
    title: el('title-screen'), pause: el('pause-screen'), over: el('over-screen'),
    missionList: el('mission-list'), saveLine: el('save-line'), objective: el('objective-line'),
    timer: el('mission-timer'), stage: el('mission-stage'), contact: el('contact-line'),
    crew: el('crew-abilities'), winlose: el('winlose-line'),
    districtPanel: el('district-panel'), titleDistricts: el('title-districts'),
  };
}

export function updateHud(h, s) {
  // Mission card, top-left.
  const m = s.mission;
  if (m) {
    h.mission.querySelector('.job-no').textContent = `JOB ${m.index + 1}/10`;
    h.mission.querySelector('.job-title').textContent = m.def.title;
    h.mission.querySelector('.job-contact').textContent = `${m.def.contact.toUpperCase()} — ${s.contactRole}`;
    h.mission.querySelector('.job-dialogue').textContent = `“${m.def.dialogue}”`;
    h.objective.textContent = m.done ? 'JOB COMPLETE — collect your pay' : (m.failed ? 'JOB FAILED — press M to retry' : s.objective);
    const st = m.def.stages[m.stage];
    h.stage.textContent = st ? `STAGE ${m.stage + 1}/${m.def.stages.length} — NEXT: ${st.label}` : '';
    h.timer.textContent = (st && (st.type === 'race' || st.type === 'survive')) ? `⏱ ${Math.max(0, Math.ceil(m.timer))}s` : `REWARD $${m.def.reward.toLocaleString()}`;
    h.mission.style.display = 'block';
  } else {
    h.mission.style.display = 'none';
  }
  // Wanted stars + cash + respect, top-right.
  h.stars.textContent = stars(s.wanted);
  h.stars.style.color = s.wanted >= 3 ? '#ff4040' : '#ffd94d';
  h.cash.textContent = `$${Math.floor(s.cash).toLocaleString()}`;
  h.respect.textContent = `${respectRank(s.respect)} · ${s.respect} REP`;
  h.district.textContent = `${s.district} · ${s.timeOfDay}`;
  // District standing panel: all five districts, current one marked.
  if (h.districtPanel && s.standing) {
    let dh = '<div class="dp-title">DISTRICT STANDING</div>';
    for (const name of DISTRICT_NAMES) {
      const pts = s.standing[name] || 0;
      const lvl = districtStanding(pts);
      const here = name === s.district ? ' ◉ YOU' : '';
      dh += `<div class="dp-row${name === s.district ? ' here' : ''}"><b>${name}</b> · ${lvl} · ${pts} PTS${here}</div>`;
    }
    h.districtPanel.innerHTML = dh;
  }
  // Dispatch panel: named units, distance in metres, role.
  let html = '<div class="dp-title">ABPD DISPATCH — AZURE BAY PD</div>';
  if (s.units.length === 0 && !s.heli) html += '<div class="dp-row">ALL UNITS CLEAR — NO ACTIVE PURSUIT</div>';
  for (const u of s.units) html += `<div class="dp-row"><b>${u.name}</b> · ${u.dist}m · <span class="tag">${u.role}</span></div>`;
  if (s.heli) html += `<div class="dp-row"><b>CONDOR-1</b> · AIR SUPPORT · <span class="tag">SPOTLIGHT</span></div>`;
  for (const rb of s.roadblocks) html += `<div class="dp-row"><b>ROADBLOCK</b> · ${rb.dist}m · <span class="tag">ROADBLOCK</span></div>`;
  h.dispatch.innerHTML = html;
  // Health, armour, weapons, bottom-left / bottom-right.
  h.health.style.width = `${Math.max(0, s.health)}%`;
  h.armour.style.width = `${Math.max(0, s.armour)}%`;
  h.healthText.textContent = `HP ${Math.ceil(s.health)} · ARMOUR ${Math.ceil(s.armour)}`;
  let wh = '';
  WEAPONS.forEach((w, i) => {
    const ammo = s.ammo[i] === Infinity ? '∞' : s.ammo[i];
    wh += `<div class="wslot${i === s.slot ? ' active' : ''}${w.locked ? ' locked' : ''}">${w.key} ${w.name} <span>${w.locked ? 'LOCKED' : ammo}</span></div>`;
  });
  h.weapons.innerHTML = wh;
  // Car panel, bottom-centre.
  if (s.inCar) {
    h.speed.textContent = `${Math.round(Math.abs(s.carSpeed) * 2.24)} MPH`;
    h.carName.textContent = s.carName;
    h.carCond.textContent = `CONDITION ${Math.round(s.carCond)}%`;
  } else {
    h.speed.textContent = 'ON FOOT';
    h.carName.textContent = 'AZURE BAY — ON FOOT';
    h.carCond.textContent = 'PRESS E NEAR A CAR TO STEAL IT';
  }
  h.radio.textContent = `${RADIO[s.station].station} — “${RADIO[s.station].song}”`;
  // Crew abilities with hotkeys.
  h.crew.innerHTML = `<div class="crew-card">Q — CREW: DEACON'S RAM ${s.crewReady ? 'READY' : 'RECHARGING'}</div><div class="crew-card">R — RADIO · H — HORN · P — PAUSE</div>`;
  h.winlose.textContent = 'WIN: finish the job and reach the marker · LOSE: busted by ABPD or wasted';
  drawMinimap(h.minimap, s);
}

function drawMinimap(canvas, s) {
  const g = canvas.getContext('2d'); if (!g) return;
  const W = canvas.width, H = canvas.height, sc = W / 760;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#16222e'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1e7f8e'; g.fillRect(0, (252 + 380) * sc, W, H);
  g.fillStyle = '#e8c98f'; g.fillRect(0, (252 + 380) * sc - 8, W, 8);
  g.strokeStyle = '#5a6472'; g.lineWidth = 5;
  for (let k = -6; k <= 6; k += 1) {
    g.beginPath(); g.moveTo((k * 60 + 380) * sc, 0); g.lineTo((k * 60 + 380) * sc, H); g.stroke();
    g.beginPath(); g.moveTo(0, (k * 60 + 380) * sc); g.lineTo(W, (k * 60 + 380) * sc); g.stroke();
  }
  const px = (s.x + 380) * sc, py = (s.z + 380) * sc;
  if (s.objectivePos) {
    const ox = (s.objectivePos.x + 380) * sc, oy = (s.objectivePos.z + 380) * sc;
    const pulse = 6 + Math.sin(performance.now() / 240) * 2;
    g.fillStyle = '#ffd94d'; g.beginPath(); g.arc(ox, oy, pulse, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#101820'; g.font = 'bold 11px sans-serif'; g.fillText('★', ox - 4, oy + 4);
  }
  for (const u of s.units) {
    g.fillStyle = '#4d8dff'; g.beginPath(); g.arc((u.x + 380) * sc, (u.z + 380) * sc, 3, 0, Math.PI * 2); g.fill();
  }
  g.save(); g.translate(px, py); g.rotate(s.heading);
  g.fillStyle = '#ff5c8a'; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = '#f4f1e8'; g.font = 'bold 12px sans-serif'; g.fillText('N', W - 14, 16);
}

export function showBanner(h, text, sub, ms = 2600) {
  h.banner.textContent = text; h.bannerSub.textContent = sub || '';
  h.banner.parentElement.style.display = 'block';
  clearTimeout(h.banner._t);
  h.banner._t = setTimeout(() => { h.banner.parentElement.style.display = 'none'; }, ms);
}

export function setScreen(h, name, save) {
  h.title.style.display = name === 'title' ? 'flex' : 'none';
  h.pause.style.display = name === 'pause' ? 'flex' : 'none';
  h.over.style.display = name === 'over' ? 'flex' : 'none';
  if (name === 'title' && save) {
    h.saveLine.textContent = `SAVE — $${save.cash.toLocaleString()} · ${save.jobsDone.length}/10 JOBS DONE · ${respectRank(save.respect)}`;
    h.missionList.innerHTML = MISSIONS.map((m, i) => {
      const done = save.jobsDone.includes(m.id);
      return `<div class="ml-row${done ? ' done' : ''}" data-job="${i}"><b>${m.id}.</b> ${m.title} <span>${done ? '✓ DONE' : `$${m.reward.toLocaleString()} · ${m.contact.toUpperCase()}`}</span></div>`;
    }).join('');
    if (h.titleDistricts && save.standing) {
      h.titleDistricts.innerHTML = DISTRICT_NAMES.map((name) => {
        const pts = save.standing[name] || 0;
        return `<div class="ml-row"><b>${name}</b> — ${districtStanding(pts)} <span>${pts} PTS</span></div>`;
      }).join('');
    }
  }
}
