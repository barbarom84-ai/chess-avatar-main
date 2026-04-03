"use client";

import { useLanguage } from "@/lib/language-context";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Trash2, AlertCircle } from "lucide-react";
import { Chess } from "chess.js";

const UCI_REG = /^[a-h][1-8][a-h][1-8]([qrbn])?$/i;

function isValidUci(s: string): boolean {
  return UCI_REG.test(s.trim());
}

function computeForcedLinePreview(
  movesArray: string[],
  variant: "full" | "bot-only"
): string {
  if (variant === "bot-only") {
    return movesArray.join(", ") || "—";
  }
  try {
    const chess = new Chess();
    const san: string[] = [];
    for (const uciMove of movesArray) {
      const result = chess.move(uciMove);
      if (!result) return "❌ Séquence invalide";
      san.push(result.san);
    }
    return san.join(" ");
  } catch {
    return "❌ Erreur de validation";
  }
}

interface ForcedLineEditorProps {
  forcedLine?: string[];
  onLineChange: (line: string[]) => void;
  /** Titre affiché (ex. "Ligne forcée (Blancs)") */
  title?: string;
  /** Description courte */
  description?: string;
  /** "bot-only" = coups du bot uniquement (blanc ou noir), pas de rejeu partie complète */
  variant?: "full" | "bot-only";
}

export default function ForcedLineEditor({ forcedLine = [], onLineChange, title, description, variant = "full" }: ForcedLineEditorProps) {
  const { t } = useLanguage();
  const [moves, setMoves] = useState<string[]>(forcedLine);
  const [newMove, setNewMove] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    setMoves(forcedLine);
    setPreview(computeForcedLinePreview(forcedLine, variant));
  }, [forcedLine, variant]);

  const addMove = () => {
    if (!newMove.trim()) return;

    if (variant === "bot-only") {
      const u = newMove.trim();
      if (!isValidUci(u)) {
        setError(`Format UCI invalide : ${u} (ex. e2e4, g1f3)`);
        return;
      }
      const uciNorm = u.toLowerCase().slice(0, 5);
      const updatedMoves = [...moves, uciNorm];
      setMoves(updatedMoves);
      onLineChange(updatedMoves);
      setNewMove("");
      setError("");
      setPreview(computeForcedLinePreview(updatedMoves, variant));
      return;
    }

    try {
      const chess = new Chess();
      for (const move of moves) chess.move(move);
      const result = chess.move(newMove.trim());
      if (!result) {
        setError(`${t.forcedLine.invalidMove}: ${newMove}`);
        return;
      }
      const uciMove = result.from + result.to + (result.promotion || "");
      const updatedMoves = [...moves, uciMove];
      setMoves(updatedMoves);
      onLineChange(updatedMoves);
      setNewMove("");
      setError("");
      setPreview(computeForcedLinePreview(updatedMoves, variant));
    } catch (err: unknown) {
      setError((err as Error)?.message || t.forcedLine.invalidMove);
    }
  };

  const removeMove = (index: number) => {
    const updatedMoves = moves.filter((_, i) => i !== index);
    setMoves(updatedMoves);
    onLineChange(updatedMoves);
    setPreview(computeForcedLinePreview(updatedMoves, variant));
  };

  const clearAll = () => {
    setMoves([]);
    onLineChange([]);
    setError("");
    setPreview("");
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-cyan-400 flex items-center gap-2">
          <span>🎯</span> {title ?? t.forcedLine.customTitle}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {description ?? "Définissez une séquence de coups que le bot jouera obligatoirement à ses tours. Le bot suivra cette séquence dans l'ordre."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Liste des coups */}
        {moves.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">
                Séquence ({moves.length} coup{moves.length > 1 ? 's' : ''})
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Tout effacer
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {moves.map((move, index) => (
                <Badge
                  key={index}
                  className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 flex items-center gap-2 px-3 py-1"
                >
                  <span className="font-mono">{index + 1}. {move}</span>
                  <button
                    type="button"
                    onClick={() => removeMove(index)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Prévisualisation */}
            {preview && !preview.includes("❌") && (
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <p className="text-xs text-slate-500 mb-1">{variant === "bot-only" ? t.forcedLine.uciSequence : t.forcedLine.sanNotation}</p>
                <p className="text-sm text-green-400 font-mono">{preview}</p>
              </div>
            )}
          </div>
        )}

        {/* Ajout de coup */}
        <div>
          <p className="text-sm text-slate-400 mb-2">Ajouter un coup</p>
          <div className="flex gap-2">
            <Input
              placeholder={variant === "bot-only" ? "e2e4, g1f3 (UCI)" : "e2e4 ou e4 (UCI ou SAN)"}
              value={newMove}
              onChange={(e) => {
                setNewMove(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && addMove()}
              className="bg-slate-950 border-slate-700 font-mono"
            />
            <Button
              type="button"
              onClick={addMove}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Exemples (masqués en mode bot-only, géré par les deux éditeurs blanc/noir) */}
        {variant !== "bot-only" && (
          <div className="bg-slate-950 p-3 rounded border border-slate-800">
            <p className="text-xs text-slate-500 mb-2">💡 Exemples de séquences (coups du bot uniquement)</p>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  const line = ["e2e4", "g1f3", "f1c4"];
                  setMoves(line);
                  onLineChange(line);
                  setPreview(computeForcedLinePreview(line, variant));
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 block"
              >
                • {t.forcedLineEditor.presetWhiteItalian}
              </button>
              <button
                type="button"
                onClick={() => {
                  const line = ["e7e5", "b8c6", "g8f6"];
                  setMoves(line);
                  onLineChange(line);
                  setPreview(computeForcedLinePreview(line, variant));
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 block"
              >
                • {t.forcedLineEditor.presetBlackDefense}
              </button>
              <button
                type="button"
                onClick={() => {
                  const line = ["d2d4", "c2c4", "b1c3", "g1f3"];
                  setMoves(line);
                  onLineChange(line);
                  setPreview(computeForcedLinePreview(line, variant));
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 block"
              >
                • {t.forcedLineEditor.presetWhiteIndian}
              </button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-950/30 border border-blue-800/50 p-3 rounded text-sm text-blue-200">
          <p className="font-semibold mb-1">ℹ️ {t.forcedLineEditor.howItWorks}</p>
          <ul className="space-y-1 text-xs list-disc list-inside">
            <li>{t.forcedLineEditor.howItWorksLine1}</li>
            <li>{t.forcedLineEditor.howItWorksLine2}</li>
            <li>{t.forcedLineEditor.howItWorksLine3}</li>
            <li>{t.forcedLineEditor.howItWorksLine4}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
