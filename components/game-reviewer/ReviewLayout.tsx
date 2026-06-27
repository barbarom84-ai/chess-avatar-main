"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-context";

interface ReviewLayoutProps {
  reviewShellClassName?: string;
  toolbar: ReactNode;
  board: ReactNode;
  boardNav: ReactNode;
  exploration?: ReactNode;
  movesPanel: ReactNode;
  enginePanel: ReactNode;
  detailsPanel: ReactNode;
}

function PanelShell({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`bg-slate-900/60 border-cyan-500/20 flex flex-col min-h-0 h-full overflow-hidden ${className ?? ""}`}>
      <CardHeader className="py-2 px-3 pb-1 shrink-0">
        <CardTitle className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0 flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full pr-2">{children}</ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function ReviewLayout({
  reviewShellClassName = "",
  toolbar,
  board,
  boardNav,
  exploration,
  movesPanel,
  enginePanel,
  detailsPanel,
}: ReviewLayoutProps) {
  const { t } = useLanguage();

  return (
    <div className={`review-shell flex flex-col gap-2 min-h-[520px] ${reviewShellClassName}`}>
      <div className="shrink-0 md:sticky md:top-0 z-10">{toolbar}</div>

      <div className="shrink-0 flex justify-center px-1 sm:px-2">
        <div className="chessboard-frame chessboard-frame--review">
          {board}
        </div>
      </div>

      <div className="shrink-0">{boardNav}</div>

      {exploration ? <div className="shrink-0 px-1">{exploration}</div> : null}

      <div className="hidden md:grid md:grid-cols-3 gap-2 flex-1 min-h-0">
        <PanelShell title={t.review.movesTitle}>{movesPanel}</PanelShell>
        <PanelShell title={t.review.layout.tabEngine}>{enginePanel}</PanelShell>
        <PanelShell title={t.review.layout.tabDetails}>{detailsPanel}</PanelShell>
      </div>

      <Tabs defaultValue="moves" className="md:hidden flex flex-col flex-1 min-h-0">
        <TabsList className="w-full shrink-0 grid grid-cols-3">
          <TabsTrigger value="moves" className="text-xs">
            {t.review.layout.tabMoves}
          </TabsTrigger>
          <TabsTrigger value="engine" className="text-xs">
            {t.review.layout.tabEngine}
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs">
            {t.review.layout.tabDetails}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="moves" className="flex-1 min-h-0 mt-1 data-[state=inactive]:hidden">
          <PanelShell title={t.review.movesTitle} className="h-[min(40dvh,320px)]">
            {movesPanel}
          </PanelShell>
        </TabsContent>
        <TabsContent value="engine" className="flex-1 min-h-0 mt-1 data-[state=inactive]:hidden">
          <PanelShell title={t.review.layout.tabEngine} className="h-[min(40dvh,320px)]">
            {enginePanel}
          </PanelShell>
        </TabsContent>
        <TabsContent value="details" className="flex-1 min-h-0 mt-1 data-[state=inactive]:hidden">
          <PanelShell title={t.review.layout.tabDetails} className="h-[min(40dvh,320px)]">
            {detailsPanel}
          </PanelShell>
        </TabsContent>
      </Tabs>
    </div>
  );
}
