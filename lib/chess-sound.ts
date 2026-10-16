/** Court signal audio pour un coup (Web Audio, pas de fichier). */
export function playChessMoveSound(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 520;
    gain.gain.value = 0.04;
    const t0 = ctx.currentTime;
    osc.start(t0);
    osc.stop(t0 + 0.06);
    window.setTimeout(() => void ctx.close(), 120);
  } catch {
    /* navigateur sans audio / autoplay */
  }
}

/** Alerte quand il reste ≤ 20 s sur l'horloge du joueur au trait. */
export function playClockLowTimeWarning(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const playBeep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.value = 0.07;
      osc.start(start);
      osc.stop(start + duration);
    };
    const t0 = ctx.currentTime;
    playBeep(880, t0, 0.08);
    playBeep(660, t0 + 0.12, 0.1);
    window.setTimeout(() => void ctx.close(), 280);
  } catch {
    /* ignore */
  }
}

function playTones(
  type: OscillatorType,
  tones: { freq: number; at: number; duration: number; volume: number }[]
): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;
    let end = 0;
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = tone.freq;
      gain.gain.value = tone.volume;
      osc.start(t0 + tone.at);
      osc.stop(t0 + tone.at + tone.duration);
      end = Math.max(end, tone.at + tone.duration);
    }
    window.setTimeout(() => void ctx.close(), Math.ceil(end * 1000) + 80);
  } catch {
    /* ignore */
  }
}

/** Coup donnant échec : deux notes montantes brèves. */
export function playChessCheckSound(): void {
  playTones("sine", [
    { freq: 620, at: 0, duration: 0.05, volume: 0.04 },
    { freq: 830, at: 0.06, duration: 0.06, volume: 0.04 },
  ]);
}

/** Fin de partie : petit accord descendant. */
export function playChessGameEndSound(): void {
  playTones("triangle", [
    { freq: 784, at: 0, duration: 0.12, volume: 0.05 },
    { freq: 659, at: 0.13, duration: 0.12, volume: 0.05 },
    { freq: 523, at: 0.26, duration: 0.22, volume: 0.05 },
  ]);
}

/** Signal discret pour une demande adversaire (nulle / reprise). */
export function playPvpRequestSound(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const playTone = (freq: number, start: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.start(start);
      osc.stop(start + duration);
    };
    const t0 = ctx.currentTime;
    playTone(740, t0, 0.07, 0.035);
    playTone(988, t0 + 0.09, 0.09, 0.03);
    window.setTimeout(() => void ctx.close(), 260);
  } catch {
    /* ignore */
  }
}
