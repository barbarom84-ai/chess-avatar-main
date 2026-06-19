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
