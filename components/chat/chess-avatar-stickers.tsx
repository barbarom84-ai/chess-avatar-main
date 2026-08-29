import type { ReactNode } from "react";
import type { StickerEmojiId } from "@/lib/chat-emojis";

const CYAN = "#00FFFF";
const NAVY = "#071525";
const PURPLE = "#8A2BE2";
const GOLD = "#F5C542";
const RED = "#F87171";
const ORANGE = "#FB923C";

function StickerSvg({ children, title }: { children: ReactNode; title: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="100%"
      height="100%"
      role="img"
      className="drop-shadow-[0_0_5px_rgba(0,255,255,0.75)]"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

export function ChessAvatarSticker({
  id,
  title,
  className,
}: {
  id: StickerEmojiId;
  title?: string;
  className?: string;
}) {
  const label = title ?? id;
  return (
    <span className={className} style={{ display: "inline-block", lineHeight: 0 }}>
      {id === "check" && (
        <StickerSvg title={label}>
          <path
            d="M10 27h12c1 0 2-1 2-2V12l-8-7-8 7v13c0 1 1 2 2 2z"
            fill={NAVY}
            stroke={GOLD}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M16 8v4M12 14h8M14 18h4" stroke={GOLD} strokeWidth="0.9" />
          <circle cx="16" cy="12.2" r="1.15" fill={GOLD} />
          <path d="M16 16.2v5" stroke={GOLD} strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="16" cy="23.4" r="1.1" fill={GOLD} />
        </StickerSvg>
      )}
      {id === "brilliancy" && (
        <StickerSvg title={label}>
          <path
            d="M16 3.5l2.4 6.8 7.1.4-5.5 4.4 1.8 6.8L16 18.2 9.2 21.9l1.8-6.8-5.5-4.4 7.1-.4z"
            fill={NAVY}
            stroke={CYAN}
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="13.2" r="2.2" fill={CYAN} />
          <path d="M16 8v10M11 13h10" stroke={NAVY} strokeWidth="0.7" />
        </StickerSvg>
      )}
      {id === "blunder" && (
        <StickerSvg title={label}>
          <path
            d="M9 26h14l-1.6-9.2-4.2 2.2L16 8.5l-1.3 10.5-4.1-2.2z"
            fill={NAVY}
            stroke={RED}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <path d="M12 11l8 9M20 11l-8 9" stroke={RED} strokeWidth="1.7" strokeLinecap="round" />
        </StickerSvg>
      )}
      {id === "trophy" && (
        <StickerSvg title={label}>
          <path
            d="M10.5 7.5h11v6.2c0 3.6-2.6 5.6-5.5 5.6s-5.5-2-5.5-5.6z"
            fill={NAVY}
            stroke={GOLD}
            strokeWidth="1.45"
          />
          <path
            d="M10.5 10H7.4v2.6c1.8 1.8 3.1 1.6 3.1-.2V10zm11 0h3.1v2.6c-1.8 1.8-3.1 1.6-3.1-.2V10z"
            fill="none"
            stroke={GOLD}
            strokeWidth="1.2"
          />
          <path d="M14.2 20h3.6v2.4h-3.6z" fill={NAVY} stroke={GOLD} strokeWidth="1.2" />
          <path d="M11.5 26h9" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16" cy="12.4" r="1.2" fill={GOLD} />
        </StickerSvg>
      )}
      {id === "fire" && (
        <StickerSvg title={label}>
          <path
            d="M16 5c2 4-1 6 1 9 3-1 6 2 6 7 0 5-3.2 8-7 8s-7-3-7-8c0-4 3-7 5-9 0-3 1-5 2-7z"
            fill={NAVY}
            stroke={ORANGE}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M16 14c1.4 2 3 3.4 3 6.2 0 2.4-1.4 4-3 4s-3-1.6-3-4c0-2 1.2-3.4 3-6.2z" fill={CYAN} opacity="0.85" />
        </StickerSvg>
      )}
      {id === "think" && (
        <StickerSvg title={label}>
          <circle cx="16" cy="14" r="8.2" fill={NAVY} stroke={CYAN} strokeWidth="1.45" />
          <path d="M16 10.2v5.2l3.2 2" fill="none" stroke={CYAN} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 25h8l-1.4 3H13.4z" fill={NAVY} stroke={PURPLE} strokeWidth="1.2" />
          <circle cx="16" cy="14" r="1.15" fill={CYAN} />
        </StickerSvg>
      )}
    </span>
  );
}
