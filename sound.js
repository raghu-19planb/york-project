// Sound for Next Stop, Toronto: a fiddle tune and a few small effects, all made in the browser. No recordings.
//
// The tune is a reel in D written for this game. It is in the manner of the fiddle music played for dancing in
// Upper Canada, but it is not a period tune and is not copied from one. The fiddle is a sawtooth wave with a slow
// vibrato, pushed through filters that stand in for the body of the instrument; a soft thump keeps time like a
// foot on a floorboard. Sound starts only after a tap or click, and the choice to mute is remembered.
(function () {
  window.YP = window.YP || {};
  let ac = null, master = null, body = null, meter = null, timer = 0, step = 0, nextAt = 0, playing = false;
  let muted = false; try { muted = localStorage.getItem('yp-sound') === 'off'; } catch (e) { /* private mode */ }
  const SEMI = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  const hz = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return 440 * Math.pow(2, (SEMI[m[1]] + (m[2] - 4) * 12) / 12); };
  const EIGHTH = 0.158; // seconds: a steady reel, not a race
  // Two strains of eight bars, each bar eight eighth-notes; '-' holds the note before it.
  const A = 'D4 F#4 A4 F#4 D5 A4 F#4 A4 | B4 A4 F#4 D4 E4 F#4 A4 F#4 | G4 B4 D5 B4 E5 D5 B4 D5 | C#5 A4 E4 A4 C#5 E5 D5 C#5 | D5 F#5 A5 F#5 D5 A4 F#4 A4 | B4 D5 B4 A4 F#4 A4 D5 F#5 | E5 C#5 A4 C#5 E5 G5 F#5 E5 | D5 A4 F#4 A4 D5 - D4 -';
  const B = 'F#5 A5 F#5 D5 A4 D5 F#5 A5 | G5 B5 G5 E5 B4 E5 G5 B5 | A5 F#5 D5 F#5 A5 F#5 D5 A4 | E5 C#5 A4 C#5 E5 F#5 G5 E5 | F#5 A5 F#5 D5 B4 D5 G5 B5 | A5 F#5 D5 A4 B4 D5 E5 F#5 | G5 E5 C#5 A4 C#5 E5 A5 G5 | F#5 D5 A4 F#4 D4 - D5 -';
  const TUNE = [A, A, B, B].join(' | ').split(/\s+/).filter(s => s !== '|');
  const DRONE = ['D3', 'D3', 'G3', 'A3', 'D3', 'D3', 'A3', 'D3']; // the open string under each bar

  function ready() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ac.destination);
    meter = ac.createAnalyser(); meter.fftSize = 2048; master.connect(meter); // a test hook only: lets the level be read from the console
    // the body of the fiddle: thin out the bottom, lift the wood and the bite, round off the top
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 190;
    const wood = ac.createBiquadFilter(); wood.type = 'peaking'; wood.frequency.value = 290; wood.Q.value = 2; wood.gain.value = 5;
    const bite = ac.createBiquadFilter(); bite.type = 'peaking'; bite.frequency.value = 2600; bite.Q.value = 1.2; bite.gain.value = 6;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    hp.connect(wood); wood.connect(bite); bite.connect(lp); lp.connect(master); body = hp;
    return true;
  }
  function bow(freq, at, dur, vol, slideTo) { // one bowed note
    const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), depth = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(freq, at); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur * 0.8);
    lfo.frequency.value = 5.6; depth.gain.setValueAtTime(0, at); depth.gain.linearRampToValueAtTime(freq * 0.006, at + Math.min(dur, 0.2)); lfo.connect(depth); depth.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 0.028); g.gain.setValueAtTime(vol * 0.82, at + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(body); o.start(at); lfo.start(at); o.stop(at + dur + 0.03); lfo.stop(at + dur + 0.03);
  }
  function pluck(freq, at, vol) { // a plucked string, for the small effects
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + 0.55);
  }
  function thump(at, vol) { // a foot on the floor
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(96, at); o.frequency.exponentialRampToValueAtTime(48, at + 0.09);
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12); o.connect(g); g.connect(master); o.start(at); o.stop(at + 0.14);
  }
  function click(at, vol) { // the conductor's punch
    const n = ac.createBufferSource(), buf = ac.createBuffer(1, 1200, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = 2400; g.gain.value = vol; n.buffer = buf; n.connect(f); f.connect(g); g.connect(master); n.start(at);
  }
  function schedule() { // keep a third of a second of the tune queued ahead of the clock
    while (playing && nextAt < ac.currentTime + 0.32) {
      const i = step % TUNE.length, name = TUNE[i], inBar = i % 8;
      if (name !== '-') { let len = 1; while (TUNE[(i + len) % TUNE.length] === '-' && len < 4) len++; bow(hz(name), nextAt, EIGHTH * len * 0.96, inBar % 4 === 0 ? 0.105 : inBar % 2 === 0 ? 0.085 : 0.07); }
      if (inBar === 0) bow(hz(DRONE[Math.floor(i / 8) % 8]), nextAt, EIGHTH * 7.6, 0.03);
      if (inBar % 4 === 0) thump(nextAt, inBar === 0 ? 0.2 : 0.13);
      step++; nextAt += EIGHTH;
    }
  }
  const fx = fn => { if (ready() && ac.state === 'running') fn(ac.currentTime + 0.01); };
  YP.sound = {
    get state() { return ac ? ac.state : 'none'; },
    level() { if (!meter) return 0; const d = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; return Math.sqrt(s / d.length); }, // how loud it is right now, 0 to 1
    get muted() { return muted; },
    setMuted(on) { muted = on; try { localStorage.setItem('yp-sound', on ? 'off' : 'on'); } catch (e) { /* private mode */ } if (master) master.gain.setTargetAtTime(on ? 0 : 0.9, ac.currentTime, 0.03); },
    unlock() { if (ready() && ac.state === 'suspended') ac.resume(); },
    start(fromTop) { if (!ready()) return; this.unlock(); if (fromTop) step = 0; if (playing) return; playing = true; nextAt = ac.currentTime + 0.12; clearInterval(timer); timer = setInterval(schedule, 90); schedule(); },
    stop() { playing = false; clearInterval(timer); },
    jump() { fx(t => bow(392, t, 0.13, 0.05, 587)); },                                   // a quick slide up the string
    catch() { fx(t => { click(t, 0.16); pluck(hz('A5'), t + 0.02, 0.16); pluck(hz('D6'), t + 0.12, 0.16); }); }, // punch, then two plucked notes
    hit() { fx(t => { bow(110, t, 0.3, 0.12, 82); bow(116, t, 0.3, 0.09, 87); }); },      // a low scrape
    ride() { fx(t => { bow(hz('D4'), t, 0.55, 0.07); bow(hz('A4'), t, 0.55, 0.07); }); }, // two open strings together: a new ride
    end(won) { fx(t => (won ? ['D4', 'F#4', 'A4', 'D5', 'F#5'] : ['A4', 'F#4', 'D4']).forEach((n, i) => bow(hz(n), t + i * 0.16, won ? 0.5 : 0.4, 0.09))); }
  };
})();
