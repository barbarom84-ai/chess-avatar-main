"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-context";

interface ReviewDetailsPanelProps {
  summary: ReactNode;
  moveDetail: ReactNode;
  evalGraph?: ReactNode;
  savePanel?: ReactNode;
  showGraphTab: boolean;
  showSaveTab: boolean;
}

export default function ReviewDetailsPanel({
  summary,
  moveDetail,
  evalGraph,
  savePanel,
  showGraphTab,
  showSaveTab,
}: ReviewDetailsPanelProps) {
  const { t } = useLanguage();

  const tabCount = 2 + (showGraphTab ? 1 : 0) + (showSaveTab ? 1 : 0);
  const gridCols =
    tabCount === 2
      ? "grid-cols-2"
      : tabCount === 3
        ? "grid-cols-3"
        : "grid-cols-4";

  return (
    <Tabs defaultValue="summary" className="flex flex-col h-full min-h-0">
      <TabsList className={`w-full shrink-0 grid ${gridCols} h-8`}>
        <TabsTrigger value="summary" className="text-[10px] px-1">
          {t.review.layout.tabSummary}
        </TabsTrigger>
        <TabsTrigger value="move" className="text-[10px] px-1">
          {t.review.layout.tabMove}
        </TabsTrigger>
        {showGraphTab && (
          <TabsTrigger value="graph" className="text-[10px] px-1">
            {t.review.layout.tabGraph}
          </TabsTrigger>
        )}
        {showSaveTab && (
          <TabsTrigger value="save" className="text-[10px] px-1">
            {t.review.layout.tabSave}
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent
        value="summary"
        className="flex-1 min-h-0 mt-1 overflow-auto data-[state=inactive]:hidden"
      >
        {summary}
      </TabsContent>
      <TabsContent
        value="move"
        className="flex-1 min-h-0 mt-1 overflow-auto data-[state=inactive]:hidden"
      >
        {moveDetail}
      </TabsContent>
      {showGraphTab && (
        <TabsContent
          value="graph"
          className="flex-1 min-h-0 mt-1 overflow-auto data-[state=inactive]:hidden"
        >
          {evalGraph}
        </TabsContent>
      )}
      {showSaveTab && (
        <TabsContent
          value="save"
          className="flex-1 min-h-0 mt-1 overflow-auto data-[state=inactive]:hidden"
        >
          {savePanel}
        </TabsContent>
      )}
    </Tabs>
  );
}
