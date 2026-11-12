/* ------------------------------------------------------------------ *
 *  DEAD AIR — procedural audio
 *  Every sound is synthesised at runtime with the Web Audio API, so the
 *  game stays a single static bundle with no audio downloads.
 * ------------------------------------------------------------------ */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (a, b) => a + Math.random() * (b - a);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.muted = false;
    this.paused = false;
    this.area = 'room';
    this.noise = null;
    this.stepDist = 0;
    this.stepSide = 1;
    this.ambTimer = 2.2;
    this.heartTimer = 0;
    this.heartSide = 1;
    this.creatureTimer = 3.5;
    this.breathTimer = 0;
    this.growlTimer = 4;
    this.awake = false;
    this.counters = { steps: 0, creature: 0, ambient: 0, heartbeats: 0, stingers: 0 };
  }

  /* ---------------------------------------------------------------- */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.82;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);

    this.noise = this._makeNoise(3.2);
    this._startAmbience();
    this.ready = true;
  }

  _makeNoise(seconds) {
    const ctx = this.ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = clamp(last * 3.1, -1, 1);
      }
    }
    return buffer;
  }

  _loopNoise(gainValue, filterType, frequency, q = 0.8, pan = 0) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    let tail = gain;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      gain.connect(p);
      tail = p;
    }
    src.connect(filter).connect(gain);
    tail.connect(this.master);
    src.start();
    return { src, filter, gain };
  }

  _startAmbience() {
    const ctx = this.ctx;

    // subterranean hum: three detuned low sines
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 210;
    droneFilter.Q.value = 0.9;
    this.droneGain.connect(droneFilter);
    droneFilter.connect(this.master);

    for (const [f, g, d] of [[41.2, 0.5, 0], [54.9, 0.32, 0.6], [82.4, 0.14, -0.8]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = d;
      const og = ctx.createGain();
      og.gain.value = g;
      osc.connect(og).connect(this.droneGain);
      osc.start();
    }
    this.droneGain.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 3);

    // room air — a wide, slowly breathing bed of filtered noise
    const air = this._loopNoise(0.0, 'lowpass', 420, 0.7, 0);
    air.gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 4);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.022;
    lfo.connect(lfoGain).connect(air.gain.gain);
    lfo.start();

    // thin high whistle that makes the safehouse feel wrong
    const hiss = this._loopNoise(0.0, 'bandpass', 1650, 8, -0.15);
    hiss.gain.gain.linearRampToValueAtTime(0.008, ctx.currentTime + 6);
    const hissLfo = ctx.createOscillator();
    hissLfo.frequency.value = 0.09;
    const hissLfoGain = ctx.createGain();
    hissLfoGain.gain.value = 0.006;
    hissLfo.connect(hissLfoGain).connect(hiss.gain.gain);
    hissLfo.start();

    // electrical buzz from the dying fixtures
    const buzz = this._loopNoise(0.0, 'bandpass', 110, 22, 0.2);
    buzz.gain.gain.value = 0.007;
    const buzzLfo = ctx.createOscillator();
    buzzLfo.frequency.value = 0.31;
    const buzzLfoGain = ctx.createGain();
    buzzLfoGain.gain.value = 0.006;
    buzzLfo.connect(buzzLfoGain).connect(buzz.gain.gain);
    buzzLfo.start();
  }

  setArea(area) {
    this.area = area;
    this.stepDist = 0;
    this.ambTimer = 1.4;
    this.creatureTimer = 2.5;
    if (!this.ctx) return;
    const target = area === 'lab' ? 0.09 : area === 'lot' ? 0.065 : 0.055;
    this.droneGain?.gain.cancelScheduledValues(this.ctx.currentTime);
    this.droneGain?.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 2.5);
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : this.paused ? 0.4 : 0.82, this.ctx.currentTime + 0.25);
  }

  setPaused(paused) {
    if (paused === this.paused) return;
    this.paused = paused;
    if (!this.ctx) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : paused ? 0.4 : 0.82, this.ctx.currentTime + 0.3);
  }

  /* ----------------------------- voices ----------------------------- */
  _env(node, peak, attack, decay, when = 0) {
    const t = this.ctx.currentTime + when;
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(0.0001, t);
    node.gain.linearRampToValueAtTime(peak, t + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return t;
  }

  _noiseBurst({ gain = 0.15, attack = 0.006, decay = 0.16, filter = 'bandpass', freq = 800, q = 1, pan = 0, playback = 1, when = 0 }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = playback;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const t = this._env(g, gain, attack, decay, when);
    src.connect(f).connect(g);
    let tail = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p);
      tail = p;
    }
    tail.connect(this.sfx);
    src.start(t, Math.random() * 2.4, Math.min(2.5, attack + decay + 0.08));
  }

  _tone({ freq = 80, endFreq = 60, type = 'sine', gain = 0.1, attack = 0.01, decay = 0.5, pan = 0, when = 0, filter = 0, filterType = 'lowpass' }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq && endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(8, endFreq), t + attack + decay);
    const g = ctx.createGain();
    this._env(g, gain, attack, decay, when);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = filter;
      f.Q.value = 0.8;
      node = node.connect(f);
    }
    node.connect(g);
    let tail = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p);
      tail = p;
    }
    tail.connect(this.sfx);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  /* --------------------------- player ------------------------------- */
  footstep(running = false) {
    if (!this.ctx || this.paused) return;
    this.stepSide *= -1;
    const pan = this.stepSide * 0.22 + rand(-0.05, 0.05);
    const pitch = running ? 0.9 : 1.05;
    this._noiseBurst({
      gain: running ? 0.21 : 0.14,
      attack: 0.004,
      decay: running ? 0.2 : 0.15,
      filter: 'bandpass',
      freq: (running ? 480 : 720) * rand(0.9, 1.1),
      q: 0.75,
      pan,
      playback: pitch * rand(0.94, 1.06),
    });
    this._tone({
      freq: running ? 58 : 66,
      endFreq: 38,
      gain: running ? 0.11 : 0.075,
      attack: 0.004,
      decay: running ? 0.14 : 0.1,
      pan,
    });
    this.counters.steps++;
  }

  heartbeat(intensity = 1) {
    if (!this.ctx || this.paused) return;
    const g = 0.045 + intensity * 0.075;
    const pan = this.heartSide * 0.12;
    this.heartSide *= -1;
    this._tone({ freq: 57, endFreq: 34, gain: g, attack: 0.012, decay: 0.16, pan });
    this._tone({ freq: 49, endFreq: 31, gain: g * 0.7, attack: 0.012, decay: 0.19, pan, when: 0.17 });
    this.counters.heartbeats++;
  }

  pickup() {
    if (!this.ctx) return;
    this._noiseBurst({ gain: 0.09, attack: 0.005, decay: 0.17, filter: 'bandpass', freq: 2300, q: 0.8, pan: rand(-0.2, 0.2) });
    this._noiseBurst({ gain: 0.05, attack: 0.01, decay: 0.3, filter: 'bandpass', freq: 900, q: 1.6, when: 0.08 });
    this._tone({ freq: 180, endFreq: 130, type: 'triangle', gain: 0.04, attack: 0.01, decay: 0.35 });
  }

  door() {
    if (!this.ctx) return;
    this._tone({ freq: 92, endFreq: 55, gain: 0.13, attack: 0.005, decay: 0.42 });
    this._noiseBurst({ gain: 0.1, attack: 0.01, decay: 0.55, filter: 'lowpass', freq: 900, q: 0.6 });
    this._noiseBurst({ gain: 0.045, attack: 0.15, decay: 0.8, filter: 'highpass', freq: 2600, when: 0.25 });
  }

  /* --------------------------- creature ----------------------------- */
  growl(volume = 1, pan = 0) {
    if (!this.ctx || volume <= 0.02) return;
    const v = clamp(volume, 0, 1);
    this._tone({ freq: rand(52, 66), endFreq: rand(30, 38), type: 'sawtooth', gain: 0.13 * v, attack: 0.14, decay: 1.05, pan, filter: 260 });
    this._noiseBurst({ gain: 0.07 * v, attack: 0.2, decay: 0.9, filter: 'bandpass', freq: rand(220, 330), q: 1.8, pan, playback: 0.7 });
    this._tone({ freq: rand(74, 92), endFreq: rand(44, 55), type: 'triangle', gain: 0.06 * v, attack: 0.1, decay: 0.8, pan, filter: 500, when: 0.08 });
    this.counters.creature++;
  }

  screech(volume = 1, pan = 0) {
    if (!this.ctx || volume <= 0.02) return;
    const v = clamp(volume, 0, 1);
    this._tone({ freq: rand(880, 1080), endFreq: rand(230, 330), type: 'sawtooth', gain: 0.095 * v, attack: 0.015, decay: 0.62, pan, filter: 2600 });
    this._tone({ freq: rand(1180, 1360), endFreq: rand(420, 520), type: 'square', gain: 0.03 * v, attack: 0.01, decay: 0.48, pan });
    this._noiseBurst({ gain: 0.085 * v, attack: 0.01, decay: 0.5, filter: 'highpass', freq: 1100, pan, playback: 1.3 });
    this.counters.creature++;
  }

  breath(volume = 1, pan = 0) {
    if (!this.ctx || volume <= 0.02) return;
    const v = clamp(volume, 0, 1);
    this._noiseBurst({ gain: 0.075 * v, attack: 0.16, decay: 0.5, filter: 'bandpass', freq: rand(420, 620), q: 1.1, pan, playback: 0.8 });
    this._noiseBurst({ gain: 0.04 * v, attack: 0.1, decay: 0.4, filter: 'bandpass', freq: rand(900, 1200), q: 2.4, pan, when: 0.62 });
    this.counters.creature++;
  }

  stinger() {
    if (!this.ctx) return;
    this._tone({ freq: 48, endFreq: 26, gain: 0.2, attack: 0.006, decay: 1.6 });
    this.screech(1, rand(-0.3, 0.3));
    this._noiseBurst({ gain: 0.16, attack: 0.005, decay: 0.9, filter: 'highpass', freq: 800, playback: 1.4 });
    this.counters.stingers++;
  }

  caught() {
    if (!this.ctx) return;
    this._tone({ freq: 66, endFreq: 24, gain: 0.24, attack: 0.004, decay: 1.9 });
    this.screech(1, 0.15);
    this._noiseBurst({ gain: 0.2, attack: 0.003, decay: 1.1, filter: 'lowpass', freq: 3800, playback: 1.2 });
    this._tone({ freq: 1600, endFreq: 180, type: 'sawtooth', gain: 0.05, attack: 0.01, decay: 1.3, when: 0.12 });
    this.counters.stingers++;
  }

  /* ------------------------- ambience events ------------------------ */
  creak(pan = 0, volume = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rand(0.7, 1.1);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 16;
    const t = ctx.currentTime;
    const base = rand(300, 520);
    f.frequency.setValueAtTime(base, t);
    f.frequency.linearRampToValueAtTime(base * rand(0.6, 1.8), t + rand(0.5, 1.2));
    const g = ctx.createGain();
    this._env(g, 0.035 * volume, 0.18, rand(0.5, 1.3));
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(f).connect(g);
    if (p) { p.pan.value = clamp(pan, -1, 1); g.connect(p).connect(this.sfx); } else g.connect(this.sfx);
    src.start(t, Math.random() * 2, 1.8);
    this.counters.ambient++;
  }

  whisper(pan = 0, volume = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rand(0.8, 1.05);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 7;
    const t = ctx.currentTime;
    const base = rand(1200, 1900);
    f.frequency.setValueAtTime(base, t);
    f.frequency.linearRampToValueAtTime(base * 0.55, t + 0.9);
    f.frequency.linearRampToValueAtTime(base * 1.15, t + 1.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035 * volume, t + 0.25);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.6);
    const amp = ctx.createOscillator();
    amp.frequency.value = rand(4.5, 7.5);
    const ampGain = ctx.createGain();
    ampGain.gain.value = 0.016 * volume;
    amp.connect(ampGain).connect(g.gain);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.connect(f).connect(g);
    if (p) { p.pan.value = clamp(pan, -1, 1); g.connect(p).connect(this.sfx); } else g.connect(this.sfx);
    src.start(t, Math.random() * 2, 1.9);
    amp.start(t); amp.stop(t + 1.9);
    this.counters.ambient++;
  }

  metalGroan(pan = 0, volume = 1) {
    if (!this.ctx) return;
    this._tone({ freq: rand(150, 210), endFreq: rand(75, 95), type: 'sawtooth', gain: 0.028 * volume, attack: 0.25, decay: rand(0.8, 1.6), pan, filter: 420 });
    this._tone({ freq: rand(430, 560), endFreq: rand(240, 310), type: 'triangle', gain: 0.018 * volume, attack: 0.2, decay: 1.2, pan, when: 0.12 });
    this.counters.ambient++;
  }

  knock(pan = 0, volume = 1) {
    if (!this.ctx) return;
    this._tone({ freq: 74, endFreq: 44, gain: 0.1 * volume, attack: 0.004, decay: 0.3, pan });
    this._noiseBurst({ gain: 0.045 * volume, attack: 0.004, decay: 0.22, filter: 'lowpass', freq: 500, q: 0.7, pan });
    this.counters.ambient++;
  }

  distantScreech(pan = 0, volume = 1) {
    if (!this.ctx) return;
    this.screech(volume * 0.32, pan);
    this._tone({ freq: 52, endFreq: 33, gain: 0.035 * volume, attack: 0.2, decay: 1.4, pan });
    this.counters.ambient++;
  }

  ambientEvent() {
    if (!this.ctx) return;
    const pan = rand(-0.75, 0.75);
    const close = this.area === 'lab' ? 1 : 0.7;
    const roll = Math.random();
    if (this.area === 'lab' && this.awake) {
      if (roll < 0.34) this.metalGroan(pan, close);
      else if (roll < 0.6) this.creak(pan, close);
      else if (roll < 0.82) this.distantScreech(pan, close);
      else this.whisper(pan, close);
      return;
    }
    if (roll < 0.3) this.creak(pan, close);
    else if (roll < 0.52) this.whisper(pan, close * 0.9);
    else if (roll < 0.7) this.metalGroan(pan, close);
    else if (roll < 0.86) this.knock(pan, close);
    else this._noiseBurst({ gain: 0.02, attack: 0.3, decay: 1.4, filter: 'highpass', freq: 2200, pan, playback: 0.8 });
    this.counters.ambient++;
  }

  /* ----------------------------- update ----------------------------- */
  update(dt, state = {}) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume();

    const { area = this.area, moved = 0, running = false, creatureDistance = 99, awake = false, paused = false, ended = false } = state;
    this.area = area;
    this.awake = awake;
    this.setPaused(paused || ended);

    if (!paused && !ended) {
      // Player footsteps are driven by actual metres travelled, so they
      // stop dead against walls and match the new movement speeds.
      if (moved > 0.0005) {
        this.stepDist += moved;
        const stride = running ? 2.5 : 1.7;
        while (this.stepDist >= stride) {
          this.stepDist -= stride;
          this.footstep(running);
        }
      } else if (!paused) {
        this.stepDist = Math.min(this.stepDist, 0.5);
      }
    }

    // ambient one-shots
    this.ambTimer -= dt;
    if (this.ambTimer <= 0) {
      this.ambientEvent();
      const base = area === 'lab' ? (awake ? 3.4 : 4.8) : 6.2;
      this.ambTimer = base + Math.random() * (area === 'lab' ? 4.2 : 6.5);
    }

    if (area !== 'lab' || paused || ended) {
      this.creatureTimer = Math.min(this.creatureTimer, 2.5);
      this.heartTimer = 0;
      return;
    }

    const dist = Math.max(0, creatureDistance);

    // before it wakes, the tank itself is not silent: shallow breathing,
    // a low growl, the occasional thump against the glass
    if (!awake) {
      this.creatureTimer -= dt;
      if (this.creatureTimer <= 0) {
        if (dist < 11) {
          const near = 1 - dist / 11;
          if (dist < 6.5) this.breath(0.16 + near * 0.16, clamp((Math.random() - 0.5), -0.6, 0.6));
          else if (Math.random() < 0.45) this.knock(rand(-0.4, 0.4), 0.35 + near * 0.4);
          else this.growl(0.08 + near * 0.08, rand(-0.4, 0.4));
        }
        this.creatureTimer = 5.5 + Math.random() * 5.5;
      }
      this.heartTimer = 0;
      return;
    }

    const proximity = clamp(1 - dist / 26, 0, 1);
    const pan = clamp((Math.random() - 0.5) * 2.2, -1, 1);

    // growls / screeches, more frequent and louder as it closes in
    this.creatureTimer -= dt;
    if (this.creatureTimer <= 0) {
      if (dist < 18) {
        if (dist < 6 || Math.random() < 0.38) this.screech(0.35 + proximity * 0.65, pan);
        else this.growl(0.3 + proximity * 0.7, pan);
      } else {
        this.growl(0.12 + proximity * 0.18, pan);
      }
      this.creatureTimer = (dist < 7 ? 1.4 : dist < 14 ? 2.4 : 4.2) + Math.random() * 2.2;
    }

    // ragged breathing when it is right behind you
    this.breathTimer -= dt;
    if (dist < 7.5 && this.breathTimer <= 0) {
      this.breath(0.75 + proximity * 0.25, pan * 0.4);
      this.breathTimer = 1.1 + Math.random() * 0.7;
    }

    // heartbeat ramps up with proximity and cuts out when it is far away
    if (dist < 19) {
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) {
        this.heartbeat(clamp(1 - dist / 19, 0.15, 1));
        this.heartTimer = 0.42 + (dist / 19) * 0.9;
      }
    } else {
      this.heartTimer = 0;
    }
  }
}

export const audio = new AudioEngine();
