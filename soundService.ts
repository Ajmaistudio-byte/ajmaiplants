
// Synthesized Sound Effects using Web Audio API
// This avoids loading external mp3 files and keeps the app self-contained.

let audioCtx: AudioContext | null = null;

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

type SoundType = 'startup' | 'click' | 'tap' | 'cancel' | 'scan' | 'success';

export const playSound = (type: SoundType) => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'startup':
        // Sci-fi power up swell
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 1.5);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2);
        osc.start(now);
        osc.stop(now + 2);
        break;

      case 'click':
        // Sharp high-tech confirm chirp
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'tap':
        // Soft mechanical tick
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;

      case 'cancel':
        // Low abort thud
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.15);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
        
      case 'scan':
        // Data processing trill
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        osc.frequency.linearRampToValueAtTime(400, now + 0.2);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'success':
        // Positive chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.setValueAtTime(800, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
    }
  } catch (e) {
    console.error("Audio playback error", e);
  }
};
