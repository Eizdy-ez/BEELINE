// Sound, synthesised live with WebAudio: no audio files, nothing to load. A soft pentatonic
// pluck climbs with the combo when nectar lands, a filtered-noise whoosh rides the dash, the
// bee carries a faint buzz, and a slow pad warms the meadow under everything. The context is
// created lazily on the first user gesture, as browsers require.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let padNodes = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
    return true;
  }

  function tone({ frequency, end = null, type = 'sine', seconds = 0.18, volume = 0.2, delay = 0 }) {
    if (!context || muted) return;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (end) osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), start + seconds);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  function noise({ seconds = 0.25, volume = 0.16, from = 500, to = 2400, delay = 0 }) {
    if (!context || muted) return;
    const start = context.currentTime + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + seconds);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
  }

  const PLUCK_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

  return {
    /** Call from any confirm press: wakes the context and starts the meadow pad once. */
    unlock() {
      if (!ensure()) return;
      if (padNodes || muted) return;
      const gain = context.createGain();
      gain.gain.value = 0.045;
      const oscs = [196.0, 246.94, 293.66].map((frequency) => {
        const osc = context.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        osc.connect(gain);
        osc.start();
        return osc;
      });
      gain.connect(master);
      padNodes = { gain, oscs };
    },
    sip(combo) {
      const note = PLUCK_SCALE[Math.min(combo, PLUCK_SCALE.length - 1)];
      tone({ frequency: note, type: 'triangle', seconds: 0.22, volume: 0.22 });
      tone({ frequency: note * 2, type: 'sine', seconds: 0.3, volume: 0.07 });
    },
    trapSip() {
      tone({ frequency: 392, type: 'triangle', seconds: 0.2, volume: 0.2 });
      tone({ frequency: 587.33, type: 'triangle', seconds: 0.3, volume: 0.18, delay: 0.07 });
    },
    dash() {
      noise({ seconds: 0.22, volume: 0.14, from: 600, to: 2600 });
    },
    stun() {
      tone({ frequency: 220, end: 90, type: 'square', seconds: 0.16, volume: 0.12 });
    },
    hurt() {
      tone({ frequency: 320, end: 70, type: 'sawtooth', seconds: 0.35, volume: 0.22 });
      noise({ seconds: 0.2, volume: 0.1, from: 900, to: 200 });
    },
    gust() {
      noise({ seconds: 1.4, volume: 0.07, from: 300, to: 900 });
    },
    levelClear() {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) =>
        tone({ frequency, type: 'triangle', seconds: 0.35, volume: 0.18, delay: i * 0.09 }),
      );
    },
    gameOver() {
      [392, 329.63, 261.63, 196].forEach((frequency, i) =>
        tone({ frequency, type: 'triangle', seconds: 0.4, volume: 0.16, delay: i * 0.16 }),
      );
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((frequency, i) =>
        tone({ frequency, type: 'triangle', seconds: 0.5, volume: 0.18, delay: i * 0.11 }),
      );
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
