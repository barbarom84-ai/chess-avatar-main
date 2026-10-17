"use client";

import { useMemo } from "react";
import { Check, Info, Lock, Mountain, Sparkles, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SKILL_TREE, canUnlockSkill, getSkillById } from "@/lib/ascension/skill-tree";
import { useLanguage } from "@/lib/language-context";

interface SkillTreePanelProps {
  unlockedSkills: string[];
  currentXp: number;
  onUnlock: (skillId: string) => Promise<void>;
  unlocking?: string | null;
}

const BRANCHES = ["utility", "fantasy", "terrain", "prestige"] as const;
const BRANCH_ICONS = {
  utility: Zap,
  fantasy: Sparkles,
  terrain: Mountain,
  prestige: Star,
} as const;

export default function SkillTreePanel({
  unlockedSkills,
  currentXp,
  onUnlock,
  unlocking,
}: SkillTreePanelProps) {
  const { lang, t } = useLanguage();
  const uiLang = lang === "fr" ? "fr" : "en";

  const byBranch = useMemo(() => {
    const map: Record<(typeof BRANCHES)[number], typeof SKILL_TREE> = {
      utility: [],
      fantasy: [],
      terrain: [],
      prestige: [],
    };
    for (const skill of SKILL_TREE) map[skill.branch].push(skill);
    for (const branch of BRANCHES) map[branch].sort((a, b) => a.position.y - b.position.y);
    return map;
  }, []);

  const nextAffordable = useMemo(() => {
    const candidates = SKILL_TREE.filter((s) => {
      if (unlockedSkills.includes(s.id) || s.cost <= 0) return false;
      const check = canUnlockSkill(s.id, unlockedSkills, Number.MAX_SAFE_INTEGER);
      return check.ok || check.reason === "INSUFFICIENT_XP";
    }).sort((a, b) => a.cost - b.cost);
    const next = candidates.find((s) => {
      const prereqOk = s.prerequisites.every((p) => unlockedSkills.includes(p));
      return prereqOk;
    });
    if (!next) return null;
    const need = Math.max(0, next.cost - currentXp);
    return { skill: next, need };
  }, [unlockedSkills, currentXp]);

  const branchLabel = (branch: (typeof BRANCHES)[number]) => {
    if (branch === "utility") return t.ascension.skillBranchUtility;
    if (branch === "fantasy") return t.ascension.skillBranchFantasy;
    if (branch === "terrain") return t.ascension.skillBranchTerrain;
    return t.ascension.skillBranchPrestige;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
          <h3 className="text-sm font-semibold text-slate-100">{t.ascension.skillTree}</h3>
          <span className="ml-auto text-xs text-slate-500">{t.ascension.skillTreeHint}</span>
        </div>

        {nextAffordable && (
          <p className="text-[11px] text-amber-300/90 rounded-md border border-amber-600/30 bg-amber-950/20 px-3 py-2">
            {nextAffordable.need === 0
              ? t.ascension.xpReadyToUnlock.replace(
                  "{skill}",
                  nextAffordable.skill.name[uiLang]
                )
              : t.ascension.xpToNextUnlock
                  .replace("{xp}", String(nextAffordable.need))
                  .replace("{skill}", nextAffordable.skill.name[uiLang])}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {BRANCHES.map((branch) => {
            const Icon = BRANCH_ICONS[branch];
            const skills = byBranch[branch];
            const maxY = Math.max(1, ...skills.map((s) => s.position.y));
            const maxX = Math.max(1, ...skills.map((s) => s.position.x), 1);

            return (
              <div key={branch} className="space-y-2">
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-800">
                  <Icon className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-300">{branchLabel(branch)}</span>
                </div>

                {/* Spatial mini-tree */}
                <div
                  className="relative rounded-lg border border-slate-800/80 bg-slate-950/40 mb-2 hidden sm:block"
                  style={{ height: Math.max(72, maxY * 36 + 28) }}
                >
                  {skills.map((skill) => {
                    const unlocked = unlockedSkills.includes(skill.id);
                    const left = `${(skill.position.x / (maxX + 1)) * 100}%`;
                    const top = `${(skill.position.y / (maxY + 1)) * 100}%`;
                    return (
                      <div
                        key={`node-${skill.id}`}
                        title={skill.name[uiLang]}
                        className={`absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                          unlocked
                            ? "bg-emerald-400 border-emerald-200"
                            : "bg-slate-700 border-slate-500"
                        }`}
                        style={{ left, top }}
                      />
                    );
                  })}
                </div>

                <ul className="space-y-1.5">
                  {skills.map((skill) => {
                    const unlocked = unlockedSkills.includes(skill.id);
                    const check = canUnlockSkill(skill.id, unlockedSkills, currentXp);
                    const canBuy = !unlocked && check.ok && skill.cost > 0;
                    const missingPrereq = !unlocked && check.reason === "MISSING_PREREQUISITE";
                    const insufficientXp = !unlocked && check.reason === "INSUFFICIENT_XP";

                    const prereqNames = skill.prerequisites
                      .filter((id) => id !== "root")
                      .map((id) => getSkillById(id)?.name[uiLang] ?? id)
                      .join(", ");

                    const tooltipContent = [
                      skill.description[uiLang],
                      prereqNames
                        ? `${t.ascension.prerequisites}: ${prereqNames}`
                        : null,
                      insufficientXp
                        ? t.ascension.xpRequired.replace("{xp}", String(skill.cost))
                        : null,
                    ]
                      .filter(Boolean)
                      .join("\n\n");

                    return (
                      <li
                        key={skill.id}
                        className={`rounded-lg border px-3 py-2 space-y-1.5 transition-colors ${
                          unlocked
                            ? "border-emerald-500/30 bg-emerald-950/20"
                            : canBuy
                              ? "border-cyan-500/25 bg-slate-900/70 hover:border-cyan-400/50"
                              : "border-slate-700/40 bg-slate-950/30"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {unlocked ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-px" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-px" />
                          )}

                          <span
                            className={`text-xs font-medium leading-snug flex-1 ${
                              unlocked
                                ? "text-emerald-200"
                                : canBuy
                                  ? "text-slate-100"
                                  : "text-slate-500"
                            }`}
                          >
                            {skill.name[uiLang]}
                          </span>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors mt-px"
                                tabIndex={-1}
                                aria-label={t.ascension.skillInfoAria}
                              >
                                <Info className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="whitespace-pre-line">
                              {tooltipContent}
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {(skill.cost > 0 || canBuy || missingPrereq) && (
                          <div className="flex items-center justify-between pl-5">
                            {skill.cost > 0 ? (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-5 ${
                                  unlocked
                                    ? "border-emerald-700/40 text-emerald-400/60"
                                    : insufficientXp
                                      ? "border-red-700/40 text-red-400"
                                      : "border-amber-600/40 text-amber-300"
                                }`}
                              >
                                {skill.cost} XP
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-slate-600">{t.ascension.freeSkill}</span>
                            )}
                            <div className="flex items-center gap-1.5">
                              {canBuy && (
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-[10px]"
                                  disabled={unlocking === skill.id}
                                  onClick={() => void onUnlock(skill.id)}
                                >
                                  {t.ascension.unlock}
                                </Button>
                              )}
                              {missingPrereq && (
                                <span className="text-[10px] text-slate-600">{t.ascension.locked}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
