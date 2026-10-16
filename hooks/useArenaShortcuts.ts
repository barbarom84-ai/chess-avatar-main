"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

type ArenaShortcutHandlers = {
  onToggle?: () => void;
  onStep?: () => void;
  onFlip?: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "BUTTON" ||
    target.getAttribute("role") === "radio" ||
    target.getAttribute("role") === "tab"
  );
}

/** Space = start / pause, ArrowRight = one move, F = flip board. */
export function useArenaShortcuts(handlers: ArenaShortcutHandlers) {
  const ref = useRef(handlers);
  useLayoutEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target)) return;
      const h = ref.current;
      if (e.code === "Space" && h.onToggle) {
        e.preventDefault();
        h.onToggle();
      } else if (e.key === "ArrowRight" && h.onStep) {
        e.preventDefault();
        h.onStep();
      } else if ((e.key === "f" || e.key === "F") && h.onFlip) {
        e.preventDefault();
        h.onFlip();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
