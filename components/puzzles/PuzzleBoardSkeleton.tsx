"use client";

export default function PuzzleBoardSkeleton({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 select-none">
      <div className="relative w-full max-w-[min(100%,400px)] mx-auto aspect-square rounded-sm overflow-hidden border border-cyan-500/20 bg-slate-950/60">
        <div className="absolute inset-0 account-skeleton !rounded-none opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            <span
              className="absolute rounded-full border border-cyan-400/20 animate-ping"
              style={{ width: 64, height: 64, animationDuration: "2s" }}
            />
            <span
              className="h-8 w-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin"
              aria-hidden
            />
          </div>
        </div>
      </div>
      {message && (
        <p className="text-xs text-slate-500 tracking-wide animate-pulse">{message}</p>
      )}
    </div>
  );
}
