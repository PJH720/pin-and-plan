/**
 * Five procedural WebAudio cues (AC-15, DESIGN.md). No audio files are loaded.
 */
let audioContext: AudioContext | null = null;

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

function playTone(
  startFreq: number,
  endFreq: number,
  durationSec: number,
  type: OscillatorType,
  gainPeak = 0.12,
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
    gain.gain.linearRampToValueAtTime(gainPeak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.01);
  } catch {
    // Ignore audio errors if the browser blocks autoplay before a gesture.
  }
}

/** Soft tick on token grab. */
export function playGrabSound(): void {
  playTone(520, 560, 0.035, 'triangle', 0.09);
}

/** Crisp click on snap into a block slot. */
export function playSnapSound(): void {
  playTone(660, 880, 0.065, 'sine', 0.13);
}

/** Low tone when a drop is refused because the block holds two pins (AC-2). */
export function playRefusedSound(): void {
  playTone(190, 135, 0.15, 'triangle', 0.14);
}

/** Rising blip when an agent move starts (AC-5, AC-15). */
export function playAgentMoveSound(): void {
  playTone(440, 660, 0.095, 'sine', 0.11);
}

/** Short chord when all six tasks are placed and phase becomes "done" (AC-9, AC-15). */
export function playFinishSound(): void {
  playTone(523.25, 523.25, 0.24, 'sine', 0.09, 0);
  playTone(659.25, 659.25, 0.24, 'sine', 0.09, 0.03);
  playTone(783.99, 783.99, 0.26, 'sine', 0.1, 0.06);
}
