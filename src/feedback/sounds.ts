/**
 * Five procedural spatial WebAudio cues (AC-15, AC-17).
 * Crafted with harmonic overtones & soft envelopes—zero external audio files.
 */
let audioContext: AudioContext | null = null;

/** Pentatonic scale steps so sequential staged agent moves feel musical. */
const AGENT_PENTATONIC_HZ = [440, 493.88, 554.37, 659.25, 739.99, 880] as const;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (audioContext === null) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (Ctor === undefined) {
      return null;
    }
    try {
      audioContext = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => {});
  }
  return audioContext;
}

/** Unlocks or resumes WebAudio from a user gesture such as Enter AR. */
export function unlockAudio(): void {
  getContext();
}

function playVoice(
  startFreq: number,
  endFreq: number,
  durationSec: number,
  type: OscillatorType,
  gainPeak: number,
  delaySec = 0,
): void {
  const ctx = getContext();
  if (ctx === null) {
    return;
  }
  try {
    const start = ctx.currentTime + delaySec;
    const end = start + durationSec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, start);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, end);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainPeak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.015);
  } catch {
    // Ignore audio errors if the browser blocks autoplay before a gesture.
  }
}

/** Soft tactile glass-wood tick on token grab. */
export function playGrabSound(): void {
  playVoice(580, 720, 0.04, 'sine', 0.08);
  playVoice(1160, 1440, 0.025, 'triangle', 0.025);
}

/** Crisp magnetic snap into a block slot. */
export function playSnapSound(): void {
  playVoice(523.25, 783.99, 0.065, 'sine', 0.11);
  playVoice(1046.5, 1318.5, 0.055, 'sine', 0.035, 0.012);
}

/** Gentle muted double-thud when a drop is refused because the block holds two pins (AC-2). */
export function playRefusedSound(): void {
  playVoice(210, 145, 0.095, 'triangle', 0.11, 0);
  playVoice(165, 118, 0.11, 'sine', 0.09, 0.07);
}

/** Warm rising chime when an agent move starts (AC-5, AC-15). */
export function playAgentMoveSound(stepIndex = 0): void {
  const base =
    AGENT_PENTATONIC_HZ[stepIndex % AGENT_PENTATONIC_HZ.length];
  playVoice(base, base * 1.25, 0.12, 'sine', 0.095);
  playVoice(base * 2, base * 2.5, 0.085, 'sine', 0.028, 0.015);
}

/** Warm Cmaj9 shimmer arpeggio when all six tasks are placed (AC-9, AC-15). */
export function playFinishSound(): void {
  playVoice(523.25, 523.25, 0.36, 'sine', 0.075, 0);
  playVoice(659.25, 659.25, 0.34, 'sine', 0.07, 0.045);
  playVoice(783.99, 783.99, 0.34, 'sine', 0.07, 0.09);
  playVoice(987.77, 987.77, 0.38, 'sine', 0.055, 0.135);
  playVoice(1174.66, 1174.66, 0.42, 'sine', 0.045, 0.18);
}
