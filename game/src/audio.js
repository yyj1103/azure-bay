// Sound, synthesized in code with WebAudio — no audio files, no network.
// Engine hum, two-tone ABPD siren, gunshots, explosions, pickup chimes, mission
// stings and a little synthwave radio loop. Everything guards a missing or
// suspended AudioContext, so headless screenshots stay silent and error-free.
export function createAudio() {
  const a = { ctx: null, master: null, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null, radioOn: false, radioTimer: 0, radioStep: 0, muted: false };
  a.unlock = function unlock() {
    try {
      if (!a.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        a.ctx = new AC();
        a.master = a.ctx.createGain(); a.master.gain.value = 0.35; a.master.connect(a.ctx.destination);
      }
      if (a.ctx.state === 'suspended') a.ctx.resume();
      a.radioOn = true;
    } catch { /* silent without audio */ }
  };
  a.tone = function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!a.ctx || a.muted) return;
    try {
      const t0 = a.ctx.currentTime + when;
      const o = a.ctx.createOscillator(); const g = a.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(a.master); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch { /* no-op */ }
  };
  a.noise = function noise(dur, vol, low = 400) {
    if (!a.ctx || a.muted) return;
    try {
      const len = Math.floor(a.ctx.sampleRate * dur);
      const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = a.ctx.createBufferSource(); src.buffer = buf;
      const f = a.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
      const g = a.ctx.createGain(); g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(a.master); src.start();
    } catch { /* no-op */ }
  };
  a.engine = function engine(speed01, on) {
    if (!a.ctx || a.muted) return;
    try {
      if (on && !a.engineOsc) {
        a.engineOsc = a.ctx.createOscillator(); a.engineOsc.type = 'sawtooth';
        a.engineGain = a.ctx.createGain(); a.engineGain.gain.value = 0.0;
        const f = a.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
        a.engineOsc.connect(f); f.connect(a.engineGain); a.engineGain.connect(a.master);
        a.engineOsc.start();
      }
      if (!a.engineOsc) return;
      a.engineOsc.frequency.value = 55 + speed01 * 130;
      a.engineGain.gain.value = on ? 0.05 + speed01 * 0.06 : 0.0;
    } catch { /* no-op */ }
  };
  a.siren = function siren(on) {
    if (!a.ctx || a.muted) return;
    try {
      if (on && !a.sirenOsc) {
        a.sirenOsc = a.ctx.createOscillator(); a.sirenOsc.type = 'triangle';
        a.sirenGain = a.ctx.createGain(); a.sirenGain.gain.value = 0.045;
        a.sirenOsc.connect(a.sirenGain); a.sirenGain.connect(a.master); a.sirenOsc.start();
        a.sirenOsc.frequency.setValueAtTime(720, a.ctx.currentTime);
      }
      if (a.sirenOsc) a.sirenOsc.frequency.value = 720 + Math.sin(performance.now() / 380) * 220;
      if (!on && a.sirenOsc) { try { a.sirenOsc.stop(); } catch { /* already stopped */ } a.sirenOsc = null; }
    } catch { /* no-op */ }
  };
  a.gunshot = function gunshot() { a.noise(0.12, 0.5, 2400); a.tone(160, 0.08, 'square', 0.22, 0, 60); };
  a.explosion = function explosion() { a.noise(0.9, 0.8, 500); a.tone(90, 0.7, 'sine', 0.5, 0, 32); };
  a.pickup = function pickup() { a.tone(880, 0.12, 'sine', 0.25); a.tone(1318, 0.18, 'sine', 0.25, 0.1); };
  a.sting = function sting(win) {
    if (win) { a.tone(523, 0.16, 'triangle', 0.3); a.tone(659, 0.16, 'triangle', 0.3, 0.14); a.tone(784, 0.34, 'triangle', 0.3, 0.28); }
    else { a.tone(392, 0.25, 'sawtooth', 0.25); a.tone(311, 0.4, 'sawtooth', 0.25, 0.2); }
  };
  // A tiny synthwave loop: bass, pad and arp, one bar at a time.
  a.radioTick = function radioTick(dt) {
    if (!a.ctx || a.muted || !a.radioOn) return;
    a.radioTimer -= dt;
    if (a.radioTimer > 0) return;
    a.radioTimer = 0.21;
    const bass = [55, 55, 65.4, 49][Math.floor(a.radioStep / 4) % 4];
    a.tone(bass, 0.2, 'triangle', 0.16);
    const arp = [220, 261.6, 329.6, 392, 329.6, 261.6][a.radioStep % 6];
    if (a.radioStep % 2 === 0) a.tone(arp, 0.14, 'square', 0.05);
    if (a.radioStep % 16 === 0) a.tone(110, 1.4, 'sine', 0.08);
    a.radioStep += 1;
  };
  return a;
}
