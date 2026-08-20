import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ game?: string }> };

/** Ancienne URL : redirige vers la page dédiée `/online`. */
export default async function LegacyPlayOnlineRedirect({ searchParams }: Props) {
  const sp = await searchParams;
  const g = sp.game;
  redirect(g ? `/online?game=${encodeURIComponent(g)}` : "/online");
}
