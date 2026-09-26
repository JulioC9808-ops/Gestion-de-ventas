// Utilidad de audio Web Audio API para efectos sonoros táctiles y agradables (100% offline y sin dependencias externas)

let audioCtx: AudioContext | null = null;

export function areSoundsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem('pos_sound_effects_enabled');
    return val !== 'false';
  } catch {
    return true;
  }
}

export function setSoundsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pos_sound_effects_enabled', enabled ? 'true' : 'false');
  } catch {
    // Ignorar error de almacenamiento
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!areSoundsEnabled()) return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Reproduce el sonido de papelera / desecho ("TRASH / Crumple & Snap")
 */
export function playTrashSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Ruido blanco filtrado (Crumple)
    const bufferSize = Math.floor(ctx.sampleRate * 0.16);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.045));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(450, now + 0.15);
    noiseFilter.Q.setValueAtTime(1.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.16);

    // 2. Tono de impacto suave
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.setValueAtTime(0.35, now + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now + 0.02);
    osc.stop(now + 0.15);
  } catch {
    // Silencio seguro en caso de restricción del navegador
  }
}

/**
 * Sonido suave y gratificante al ingresar producto al almacén o stock de venta ("Stock Entry / Crisp Ding")
 */
export function playStockEntrySound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Primer tono melódico (F#5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(739.99, now); // F#5

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.24);

    // Segundo tono armónico ascendente (B5) con micro retardo
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(987.77, now + 0.06); // B5

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.001, now + 0.06);
    gain2.gain.linearRampToValueAtTime(0.28, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.4);
  } catch {
    // Silencio seguro
  }
}

/**
 * Detecta el período actual si no se proporciona explícitamente
 */
function getCurrentPeriod(): 'morning' | 'afternoon' | 'night' {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 19) return 'afternoon';
  return 'night';
}

/**
 * Sonido armónico de Bienvenida al Iniciar Sesión según el turno:
 * - Mañana: Tono fresco y optimista, brillante acorde mayor (C5 -> E5 -> G5)
 * - Tarde: Acorde cálido, ágil y productivo (D5 -> F#5 -> A5)
 * - Noche: Campana tranquila, suave y relajante (F4 -> A4 -> C5)
 */
export function playLoginSound(shiftPeriod?: 'morning' | 'afternoon' | 'night' | string) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const period =
      shiftPeriod === 'morning' || shiftPeriod === 'afternoon' || shiftPeriod === 'night'
        ? shiftPeriod
        : getCurrentPeriod();

    let freqs: number[];
    let decay: number;
    let waveType: OscillatorType = 'sine';

    if (period === 'morning') {
      // C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
      freqs = [523.25, 659.25, 783.99, 1046.5];
      decay = 0.45;
      waveType = 'sine';
    } else if (period === 'afternoon') {
      // D5 (587.33), F#5 (739.99), A5 (880.00)
      freqs = [587.33, 739.99, 880.0];
      decay = 0.42;
      waveType = 'triangle';
    } else {
      // Noche: Más profundo y acogedor F4 (349.23), A4 (440.00), C5 (523.25), E5 (659.25)
      freqs = [349.23, 440.0, 523.25, 659.25];
      decay = 0.55;
      waveType = 'sine';
    }

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(period === 'night' ? 2400 : 4000, now);

      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      const startTime = now + idx * 0.05;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.18 / (idx === 0 ? 1 : 1.2), startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + decay + 0.05);
    });
  } catch {
    // Silencio seguro
  }
}

/**
 * Sonido de Cierre de Turno / Conclusión exitosa según el turno:
 * - Mañana: Tono de entrega de turno limpio y resonante
 * - Tarde: Acorde de satisfacción y balance
 * - Noche: Campana tranquila de descanso y balance final
 */
export function playShiftCloseSound(shiftPeriod?: 'morning' | 'afternoon' | 'night' | string) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const period =
      shiftPeriod === 'morning' || shiftPeriod === 'afternoon' || shiftPeriod === 'night'
        ? shiftPeriod
        : getCurrentPeriod();

    let chords: number[][];

    if (period === 'morning') {
      // Dos acordes suaves de transición de turno
      chords = [
        [523.25, 659.25], // C5 + E5
        [783.99, 1046.5], // G5 + C6
      ];
    } else if (period === 'afternoon') {
      // Secuencia cálida de finalización
      chords = [
        [440.0, 554.37], // A4 + C#5
        [659.25, 880.0], // E5 + A5
      ];
    } else {
      // Noche: Campana armónica relajante y gratificante
      chords = [
        [392.0, 493.88], // G4 + B4
        [587.33, 783.99], // D5 + G5
      ];
    }

    chords.forEach((chord, stepIdx) => {
      const stepTime = now + stepIdx * 0.18;
      chord.forEach((freq, fIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, stepTime);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.setValueAtTime(0.001, stepTime);
        gain.gain.linearRampToValueAtTime(0.18, stepTime + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(stepTime);
        osc.stop(stepTime + 0.5);
      });
    });
  } catch {
    // Silencio seguro
  }
}

/**
 * Sonido "BIP" profesional de escáner de código de barras / QR (Honeywell/Zebra style)
 * Respeta el interruptor de sonido general: si el sistema está silenciado, no suena.
 */
export function playQrBeepSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frecuencia clásica de confirmación de escáner (2400 Hz)
    osc.frequency.setValueAtTime(2400, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.075);
  } catch {
    // Silencio seguro
  }
}

