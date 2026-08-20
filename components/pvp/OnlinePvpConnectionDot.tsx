"use client";

import {
  PVP_CONNECTION_DOT_CLASS,
  type PvpConnectionInfo,
} from "@/lib/pvp-connection";

type OnlinePvpConnectionDotProps = {
  info: PvpConnectionInfo;
  title: string;
};

export default function OnlinePvpConnectionDot({ info, title }: OnlinePvpConnectionDotProps) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${PVP_CONNECTION_DOT_CLASS[info.level]}`}
      title={title}
      aria-label={title}
    />
  );
}
