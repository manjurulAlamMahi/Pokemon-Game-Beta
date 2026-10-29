// Tiny synthesised sound effects (Web Audio) — no audio files required.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType, volume: number, slideTo?: number): void {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + duration);
  gain.gain.setValueAtTime(volume, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + duration);
  osc.connect(gain).connect(a.destination);
  osc.start();
  osc.stop(a.currentTime + duration);
}

export const Sfx = {
  bump: () => tone(110, 0.09, 'square', 0.05, 70),
  blip: () => tone(660, 0.03, 'square', 0.015),
  advance: () => tone(880, 0.05, 'triangle', 0.05, 1100),
  door: () => {
    tone(330, 0.08, 'triangle', 0.06, 220);
    setTimeout(() => tone(220, 0.12, 'triangle', 0.05, 160), 70);
  },
  select: () => {
    tone(523, 0.07, 'square', 0.04);
    setTimeout(() => tone(784, 0.1, 'square', 0.04), 60);
  },
  hover: () => tone(440, 0.03, 'triangle', 0.03),

  /** Capsule bursting open: a rising whoosh then a bright pop. */
  ballOpen: () => {
    tone(220, 0.18, 'sawtooth', 0.03, 880);
    setTimeout(() => tone(1320, 0.12, 'triangle', 0.06, 1760), 150);
  },
  /** Light shimmering arpeggio for sparkles. */
  sparkle: () => [1568, 2093, 2637, 3136].forEach((f, i) => setTimeout(() => tone(f, 0.08, 'triangle', 0.025), i * 45)),
  /** Beam back into the capsule. */
  recall: () => tone(1200, 0.25, 'square', 0.025, 300),
  ballThrow: () => tone(500, 0.12, 'triangle', 0.035, 900),
  /** Short "you received a Pokémon" jingle. */
  fanfare: () => {
    const notes: [number, number][] = [[523, 0], [659, 110], [784, 220], [1047, 330], [988, 520], [1047, 640], [1319, 780]];
    notes.forEach(([f, t]) => setTimeout(() => tone(f, t === 780 ? 0.5 : 0.14, 'square', 0.035), t));
  },
  /** Synthesised creature cry from a pitch pattern (see StarterData.cry). */
  cry: (pattern: number[]) =>
    pattern.forEach((f, i) => setTimeout(() => tone(f, 0.14, i % 2 ? 'square' : 'sawtooth', 0.035, f * (i % 2 ? 0.8 : 1.25)), i * 110)),
  laugh: () => [700, 620, 700, 620].forEach((f, i) => setTimeout(() => tone(f, 0.06, 'square', 0.025), i * 90)),
};
