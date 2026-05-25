"use client";

import { useMemo } from "react";
import { Lock, Sparkles, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SKILL_TREE, canUnlockSkill, getSkillById } from "@/lib/ascension/skill-tree";
import { useLanguage } from "@/lib/language-context";

interface SkillTreePanelProps {
  unlockedSkills: string[];
  currentXp: number;
  onUnlock: (skillId: string) => Promise<void>;
  unlocking?: string | null;
}

const BRANCHES = ["utility", "fantasy", "prestige"] as const;

const BRANCH_ICONS = {
  utility: Zap,
  fantasy: Sparkles,
  prestige: Sparkles,
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
      prestige: [],
    };
    for (const skill of SKILL_TREE) {
      map[skill.branch].push(skill);
    }
    for (const branch of BRANCHES) {
      map[branch].sort((a, b) => a.position.y - b.position.y);
    }
    return map;
  }, []);

  const branchLabel = (branch: (typeof BRANCHES)[number]) => {
    if (branch === "utility") return t.ascension.skillBranchUtility;
    if (branch === "fantasy") return t.ascension.skillBranchFantasy;
    return t.ascension.skillBranchPrestige;
  };

  return (
    <Card className="theme-bg-secondary border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          {t.ascension.skillTree}
        </CardTitle>
        <p className="text-sm text-slate-400">{t.ascension.skillTreeHint}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {BRANCHES.map((branch) => {
            const Icon = BRANCH_ICONS[branch];
            return (
              <div key={branch} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Icon className="h-4 w-4 text-cyan-400" />
                  <h4 className="text-sm font-semibold text-slate-200">{branchLabel(branch)}</h4>
                </div>
                <ul className="space-y-3">
                  {byBranch[branch].map((skill) => {
                    const unlocked = unlockedSkills.includes(skill.id);
                    const check = canUnlockSkill(skill.id, unlockedSkills, currentXp);
                    const canBuy = !unlocked && check.ok && skill.cost > 0;
                    const missingPrereq = !unlocked && check.reason === "MISSING_PREREQUISITE";

                    return (
                      <li
                        key={skill.id}
                        className={`rounded-lg border p-4 space-y-2 ${
                          unlocked
                            ? "border-emerald-500/40 bg-emerald-950/20"
                            : canBuy
                              ? "border-cyan-500/30 bg-slate-900/60"
                              : "border-slate-700/60 bg-slate-950/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-100 text-sm leading-snug">
                            {skill.name[uiLang]}
                          </p>
                          {unlocked ? (
                            <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Lock className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {skill.description[uiLang]}
                        </p>
                        {skill.prerequisites.length > 0 && !unlocked && (
                          <p className="text-[10px] text-slate-500">
                            {t.ascension.prerequisites}:{" "}
                            {skill.prerequisites
                              .map((id) => getSkillById(id)?.name[uiLang] ?? id)
                              .join(", ")}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          {skill.cost > 0 ? (
                            <Badge variant="outline" className="text-amber-300 border-amber-600/40">
                              {skill.cost} XP
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-slate-500">{t.ascension.freeSkill}</span>
                          )}
                          {canBuy && (
                            <Button
                              size="sm"
                              className="h-8 text-xs"
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
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
