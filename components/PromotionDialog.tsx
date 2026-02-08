"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Image from "next/image";

interface PromotionDialogProps {
  open: boolean;
  color: 'white' | 'black';
  pieceSetPath?: string;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
}

export default function PromotionDialog({ 
  open, 
  color, 
  pieceSetPath = '/pieces',
  onSelect 
}: PromotionDialogProps) {
  const pieces: ('q' | 'r' | 'b' | 'n')[] = ['q', 'r', 'b', 'n'];
  const colorCode = color === 'white' ? 'w' : 'b';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-xs p-4 bg-slate-900/95 border-cyan-500/30"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Choisir une pièce de promotion</DialogTitle>
        <DialogDescription className="sr-only">
          Sélectionnez une pièce pour promouvoir votre pion
        </DialogDescription>

        <div className="grid grid-cols-4 gap-3">
          {pieces.map((piece) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="relative aspect-square hover:bg-cyan-500/20 rounded-lg transition-all hover:scale-110 cursor-pointer border-2 border-transparent hover:border-cyan-500"
              aria-label={`Promouvoir en ${piece === 'q' ? 'Dame' : piece === 'r' ? 'Tour' : piece === 'b' ? 'Fou' : 'Cavalier'}`}
            >
              <Image
                src={`${pieceSetPath}/${colorCode}${piece.toUpperCase()}.png`}
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
