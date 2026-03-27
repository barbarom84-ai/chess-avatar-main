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
