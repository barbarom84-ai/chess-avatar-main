import Image from "next/image";
import type { ReactNode } from "react";
import {
  getPieceImagePath,
  type PieceSet,
} from "@/contexts/ChessboardSettingsContext";
import { localizeSan } from "@/lib/localized-san";

const EN_PIECE = new Set(["N", "B", "R", "Q", "K"]);
const FR_PIECE = new Set(["C", "F", "T", "D", "R"]);

const FR_LETTER_TO_TYPE: Record<string, "n" | "b" | "r" | "q" | "k"> = {
  C: "n",
  F: "b",
  T: "r",
  D: "q",
  R: "k",
};

const EN_LETTER_TO_TYPE: Record<string, "n" | "b" | "r" | "q" | "k"> = {
  N: "n",
  B: "b",
  R: "r",
  Q: "q",
  K: "k",
};

/** Promotion en fin de coup (FR : C,F,T,D ; R anglais = tour, pas roi). */
function promoLetterToType(
  letter: string,
  lang: "fr" | "en"
): "n" | "b" | "r" | "q" | "k" {
  const u = letter.toUpperCase();
  if (lang === "fr") {
    const fr: Record<string, "n" | "b" | "r" | "q" | "k"> = {
      C: "n",
      F: "b",
      T: "r",
      D: "q",
      N: "n",
      B: "b",
      R: "r",
      Q: "q",
      K: "k",
    };
    return fr[u] ?? "q";
  }
  return EN_LETTER_TO_TYPE[u] ?? "q";
}

function sideFromMovePrefix(prefix: string): "w" | "b" | undefined {
  if (!prefix) return undefined;
  if (prefix.includes("...")) return "b";
  if (/^\d+\.$/.test(prefix.trim())) return "w";
  return undefined;
}

function stripSanMarks(san: string): string {
  return san.trim().replace(/[+#?!]+$/g, "");
}

/** Qxg7 / Dxg7 / Qg7 — so the played ply is recognized even if the coach omits or adds `x`. */
export function aliasesForPlayedSan(san: string): string[] {
  const stripped = stripSanMarks(san);
  if (!stripped) return [];
  const variants = new Set<string>();
  const add = (value: string) => {
    const next = stripSanMarks(value);
    if (!next) return;
    variants.add(next);
    variants.add(next.toLowerCase());
  };
  add(stripped);
  add(localizeSan(stripped, "fr"));
  add(localizeSan(stripped, "en"));
  for (const value of [...variants]) {
    if (value.includes("x")) add(value.replace("x", ""));
    else {
      const m = value.match(/^([NBRQKCFTDnbrqkftd][a-h]?[1-8]?)([a-h][1-8])$/);
      if (m) add(`${m[1]}x${m[2]}`);
    }
  }
  return [...variants];
}

export function colorForPlayedSanBody(
  body: string,
  defaultColor: "w" | "b",
  playedAliases?: Set<string>,
  playedColor?: "w" | "b"
): "w" | "b" {
  if (!playedAliases?.size || !playedColor) return defaultColor;
  return resolveInlineSanColor(body, defaultColor, [
    { aliases: playedAliases, color: playedColor },
  ]);
}

export function resolveInlineSanColor(
  body: string,
  defaultColor: "w" | "b",
  groups: Array<{ aliases: Set<string>; color: "w" | "b" }>
): "w" | "b" {
  const key = stripSanMarks(body);
  for (const group of groups) {
    if (group.aliases.has(key) || group.aliases.has(key.toLowerCase())) {
      return group.color;
    }
  }
  return defaultColor;
}

function tryParsePieceLedMove(
  s: string,
  i: number,
  lang: "fr" | "en"
): { end: number; prefix: string; body: string; pieceLetter: string; lang: "fr" | "en" } | null {
  if (i > 0) {
    const prev = s[i - 1];
    if (/[A-Za-zÀ-ÿ]/.test(prev)) return null;
  }

  let pos = i;
  const numM = s.slice(pos).match(/^(\d+\.(?:\.\.)?)/);
  let prefix = "";
  if (numM) {
    prefix = numM[1];
    pos += numM[0].length;
  }

  const slice = s.slice(pos);
  const pieceRe =
    lang === "en"
      ? /^([NBRQK])([a-h]?[1-8]?)(x?)([a-h][1-8])(=[NBRQK])?([+#?!]*)/
      : /^([CFTDR])([a-h]?[1-8]?)(x?)([a-h][1-8])(=[CFTDNBRQK])?([+#?!]*)/i;

  const m = slice.match(pieceRe);
  if (!m) return null;

  const pieceLetter = m[1].toUpperCase();
  if (lang === "en" && !EN_PIECE.has(pieceLetter)) return null;
  if (lang === "fr" && !FR_PIECE.has(pieceLetter)) return null;

  const body = m[0];
  return { end: pos + body.length, prefix, body, pieceLetter, lang };
}

function tryParsePieceLedMoveEither(
  s: string,
  i: number,
  preferred: "fr" | "en"
) {
  return (
    tryParsePieceLedMove(s, i, preferred) ??
    tryParsePieceLedMove(s, i, preferred === "fr" ? "en" : "fr")
  );
}

function tryParsePawnCapture(
  s: string,
  i: number,
  lang: "fr" | "en"
): { end: number; prefix: string; body: string } | null {
  if (i > 0) {
    const prev = s[i - 1];
    if (/[A-Za-zÀ-ÿ0-9]/.test(prev) && prev !== ".") return null;
  }
  let pos = i;
  const numM = s.slice(pos).match(/^(\d+\.(?:\.\.)?)/);
  let prefix = "";
  if (numM) {
    prefix = numM[1];
    pos += numM[0].length;
  }
  const slice = s.slice(pos);
  const promoClass =
    lang === "fr" ? "[NBRQKCFDT]" : "[NBRQK]";
  const m = slice.match(
    new RegExp(
      `^([a-h])x([a-h][1-8])(=${promoClass})?([+#?!]*)`,
      "i"
    )
  );
  if (!m) return null;
  const body = m[0];
  return { end: pos + body.length, prefix, body };
}

function PieceLedInline({
  prefix,
  body,
  pieceLetter,
  lang,
  defaultPieceColor,
  pieceSet,
  colorGroups,
}: {
  prefix: string;
  body: string;
  pieceLetter: string;
  lang: "fr" | "en";
  defaultPieceColor: "w" | "b";
  pieceSet: PieceSet;
  colorGroups?: Array<{ aliases: Set<string>; color: "w" | "b" }>;
}) {
  const type =
    lang === "fr"
      ? FR_LETTER_TO_TYPE[pieceLetter]
      : EN_LETTER_TO_TYPE[pieceLetter];
  if (!type) {
    return (
      <span className="font-mono">
        {prefix}
        {body}
      </span>
    );
  }

  const side =
    sideFromMovePrefix(prefix) ??
    resolveInlineSanColor(body, defaultPieceColor, colorGroups ?? []);
  const src = getPieceImagePath(pieceSet, side, type.toUpperCase());
  const rest = body.slice(1);
  const px = 14;

  return (
    <span className="inline-flex flex-wrap items-center gap-0.5 align-middle font-mono leading-relaxed">
      {prefix ? <span>{prefix}</span> : null}
      <Image
        src={src}
        alt=""
        width={px}
        height={px}
        className="object-contain shrink-0 align-middle"
        unoptimized
      />
      <span>{rest}</span>
    </span>
  );
}

/** Pion en capture : icône + SAN complète (ex. exd5). */
function PawnCaptureInline({
  prefix,
  body,
  lang,
  defaultPieceColor,
  pieceSet,
  colorGroups,
}: {
  prefix: string;
  body: string;
  lang: "fr" | "en";
  defaultPieceColor: "w" | "b";
  pieceSet: PieceSet;
  colorGroups?: Array<{ aliases: Set<string>; color: "w" | "b" }>;
}) {
  const side =
    sideFromMovePrefix(prefix) ??
    resolveInlineSanColor(body, defaultPieceColor, colorGroups ?? []);
  const pawnSrc = getPieceImagePath(pieceSet, side, "P");
  const px = 14;
  const eq = body.indexOf("=");
  const beforeEq = eq === -1 ? body : body.slice(0, eq);
  const afterEq = eq === -1 ? "" : body.slice(eq + 1);
  const promoM = afterEq.match(
    lang === "fr" ? /^([NBRQKCFDT])/i : /^([NBRQK])/i
  );
  const promoLetter = promoM?.[1];
  const tailAfterPromo = promoLetter ? afterEq.slice(1) : afterEq;

  return (
    <span className="inline-flex flex-wrap items-center gap-0.5 align-middle font-mono leading-relaxed">
      {prefix ? <span>{prefix}</span> : null}
      <Image
        src={pawnSrc}
        alt=""
        width={px}
        height={px}
        className="object-contain shrink-0 align-middle"
        unoptimized
      />
      <span>{beforeEq}</span>
      {promoLetter ? (
        <>
          <span>=</span>
          <Image
            src={getPieceImagePath(
              pieceSet,
              side,
              promoLetterToType(promoLetter, lang).toUpperCase()
            )}
            alt=""
            width={px}
            height={px}
            className="object-contain shrink-0 align-middle"
            unoptimized
          />
          <span>{tailAfterPromo}</span>
        </>
      ) : null}
    </span>
  );
}

export function commentTextToNodes(
  text: string,
  lang: "fr" | "en",
  defaultPieceColor: "w" | "b",
  pieceSet: PieceSet,
  playedMoves?: Array<{ san?: string | null; color?: "w" | "b" }>
): ReactNode[] {
  const colorGroups = (playedMoves ?? [])
    .filter((m): m is { san: string; color: "w" | "b" } => Boolean(m.san && m.color))
    .map((m) => ({
      aliases: new Set(aliasesForPlayedSan(m.san)),
      color: m.color,
    }));
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < text.length) {
    const pawn = tryParsePawnCapture(text, i, lang) ??
      tryParsePawnCapture(text, i, lang === "fr" ? "en" : "fr");
    const pieceLed = tryParsePieceLedMoveEither(text, i, lang);

    type Choice =
      | { kind: "pawn"; data: NonNullable<typeof pawn> }
      | { kind: "piece"; data: NonNullable<typeof pieceLed> };

    let chosen: Choice | null = null;
    if (pawn && pieceLed) {
      chosen =
        pieceLed.end >= pawn.end
          ? { kind: "piece", data: pieceLed }
          : { kind: "pawn", data: pawn };
    } else if (pieceLed) chosen = { kind: "piece", data: pieceLed };
    else if (pawn) chosen = { kind: "pawn", data: pawn };

    if (!chosen) {
      out.push(text[i]);
      i += 1;
      continue;
    }

    if (chosen.kind === "piece") {
      const d = chosen.data;
      out.push(
        <PieceLedInline
          key={key++}
          prefix={d.prefix}
          body={d.body}
          pieceLetter={d.pieceLetter}
          lang={d.lang}
          defaultPieceColor={defaultPieceColor}
          pieceSet={pieceSet}
          colorGroups={colorGroups}
        />
      );
      i = d.end;
    } else {
      const d = chosen.data;
      out.push(
        <PawnCaptureInline
          key={key++}
          prefix={d.prefix}
          body={d.body}
          lang={lang}
          defaultPieceColor={defaultPieceColor}
          pieceSet={pieceSet}
          colorGroups={colorGroups}
        />
      );
      i = d.end;
    }
  }

  return out;
}
