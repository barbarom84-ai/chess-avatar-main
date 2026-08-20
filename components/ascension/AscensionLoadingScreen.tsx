"use client";

import Image from "next/image";

export default function AscensionLoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-32 select-none">
      {/* Outer glow rings */}
      <div className="relative flex items-center justify-center">
        {/* Ring 3 — slowest pulse */}
        <span
          className="absolute rounded-full border border-cyan-400/10 animate-ping"
          style={{ width: 140, height: 140, animationDuration: "3s" }}
        />
        {/* Ring 2 */}
        <span
          className="absolute rounded-full border border-emerald-400/15 animate-ping"
          style={{ width: 110, height: 110, animationDuration: "2.1s", animationDelay: "0.4s" }}
        />
        {/* Ring 1 — closest */}
        <span
          className="absolute rounded-full border border-cyan-400/25 animate-ping"
          style={{ width: 84, height: 84, animationDuration: "1.6s", animationDelay: "0.2s" }}
        />

        {/* Rotating gradient disc behind logo */}
        <span
          className="absolute rounded-full animate-spin"
          style={{
            width: 72,
            height: 72,
            background:
              "conic-gradient(from 0deg, rgba(34,211,238,0.0) 0%, rgba(34,211,238,0.5) 40%, rgba(16,185,129,0.4) 60%, rgba(34,211,238,0.0) 100%)",
            animationDuration: "3s",
          }}
        />

        {/* Logo container */}
        <div
          className="relative z-10 flex items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 shadow-[0_0_40px_rgba(34,211,238,0.25)]"
          style={{ width: 68, height: 68 }}
        >
          <Image
            src="/knight-logo.png"
            alt="Chess Avatar"
            width={44}
            height={44}
            className="drop-shadow-[0_0_12px_rgba(34,211,238,0.7)] animate-pulse"
            style={{ animationDuration: "2s" }}
            unoptimized
          />
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-semibold bg-gradient-to-r from-cyan-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent animate-pulse"
          style={{ animationDuration: "1.8s" }}
        >
          Chess Avatar
        </p>
        <p className="text-xs text-slate-500 tracking-widest uppercase animate-pulse"
          style={{ animationDuration: "2.4s", animationDelay: "0.3s" }}
        >
          Ascension
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-bounce"
            style={{ animationDelay: `${i * 0.18}s`, animationDuration: "0.9s" }}
          />
        ))}
      </div>
    </div>
  );
}
