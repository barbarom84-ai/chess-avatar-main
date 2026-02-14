"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Image from "next/image";
import { useChessboardSettings, getPieceImagePath } from "@/contexts/ChessboardSettingsContext";
import { useLanguage } from "@/lib/language-context";

interface PromotionDialogProps {
  open: boolean;
  color: 'white' | 'black';
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
}

export default function PromotionDialog({ 
  open, 
  color, 
  onSelect 
}: PromotionDialogProps) {
  const { t } = useLanguage();
  const { settings } = useChessboardSettings();
  const pieces: ('q' | 'r' | 'b' | 'n')[] = ['q', 'r', 'b', 'n'];
  const colorCode = color === 'white' ? 'w' : 'b';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-xs p-4 bg-slate-900/95 border-cyan-500/30"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{t.promotion.choosePromotion}</DialogTitle>
        <DialogDescription className="sr-only">
          {t.promotion.selectPiece}
        </DialogDescription>

        <div className="grid grid-cols-4 gap-3">
          {pieces.map((piece) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="relative aspect-square hover:bg-cyan-500/20 rounded-lg transition-all hover:scale-110 cursor-pointer border-2 border-transparent hover:border-cyan-500"
              aria-label={`${piece === 'q' ? t.promotion.queen : piece === 'r' ? t.promotion.rook : piece === 'b' ? t.promotion.bishop : t.promotion.knight}`}
            >
              <Image
                src={getPieceImagePath(settings.pieceSet, colorCode, piece.toUpperCase())}
                alt={piece}
                fill
                sizes="64px"
                className="object-contain p-2"
                draggable={false}
                unoptimized
              />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
