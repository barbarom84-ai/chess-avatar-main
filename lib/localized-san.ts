const EN_TO_FR_PIECE: Record<string, string> = {
  N: "C",
  B: "F",
  R: "T",
  Q: "D",
  K: "R",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCastleSan(san: string): boolean {
  return /^[O0]-[O0](-[O0])?[+#]*$/.test(san.trim());
}

/** chess.js SAN (KQRBN) → French letters (RDTFC) when lang is `fr`. */
export function localizeSan(san: string, lang: "fr" | "en"): string {
  if (lang !== "fr") return san;
  const raw = san.trim();
  if (!raw || isCastleSan(raw)) return raw;
  return raw.replace(/[NBRQK]/g, (letter, offset, full: string) => {
    if (offset === 0 || full[offset - 1] === "=") {
      return EN_TO_FR_PIECE[letter] ?? letter;
    }
    return letter;
  });
}

/**
 * Rewrite English piece SAN inside a French coach paragraph.
 * `R` is ambiguous (English rook vs French king), so rook moves are only
 * rewritten when they appear in `knownEnglishSans` (played / best move).
 */
export function localizeFrenchCoachText(
  text: string,
  knownEnglishSans: string[] = []
): string {
  let out = text;
  const known = [
    ...new Set(knownEnglishSans.map((s) => s.trim()).filter(Boolean)),
  ].sort((a, b) => b.length - a.length);

  for (const en of known) {
    const fr = localizeSan(en, "fr");
    if (fr === en) continue;
    const escaped = escapeRegExp(en);
    out = out.replace(
      new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "g"),
      fr
    );
  }

  out = out.replace(
    /\b([NBQK])([a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQK])?[+#]*)\b/g,
    (_m, piece: string, rest: string) => localizeSan(`${piece}${rest}`, "fr")
  );
  out = out.replace(/=([NBQK])\b/g, (_m, piece: string) => `=${EN_TO_FR_PIECE[piece]}`);
  return out;
}

export function frenchNotationSystemHint(): string {
  return "Notation obligatoire : lettres françaises R=roi, D=dame, T=tour, F=fou, C=cavalier. Écris Te1 (tour), jamais Re1 (Re1 = roi en e1). Ne pas utiliser K,Q,R,B,N anglais.";
}
