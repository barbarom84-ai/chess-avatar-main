"use client";

import Link from "next/link";
import Image from "next/image";
import { Gamepad2, Search, Swords, Users, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

export default function HomePage() {
  const { lang, t } = useLanguage();

  const steps = [
    {
      num: "1",
      title: lang === "fr" ? "Analysez" : "Analyze",
      text:
        lang === "fr"
          ? "Entrez votre pseudo Lichess ou Chess.com"
          : "Enter your Lichess or Chess.com username",
    },
    {
      num: "2",
      title: lang === "fr" ? "Créez" : "Build",
      text:
        lang === "fr"
          ? "Votre clone IA est prêt en quelques secondes"
          : "Your AI clone is ready in seconds",
    },
    {
      num: "3",
      title: lang === "fr" ? "Jouez" : "Play",
      text:
        lang === "fr"
          ? "Affrontez-le sur le site — ou en PvP"
          : "Challenge it on the site — or play PvP",
    },
  ];

  const modes = [
    {
      href: "/play",
      icon: Gamepad2,
      title: lang === "fr" ? "Contre un avatar" : "Vs an avatar",
      text:
        lang === "fr"
          ? "Votre clone ou la bibliothèque publique"
          : "Your clone or the public library",
    },
    {
      href: "/online",
      icon: Users,
      title: lang === "fr" ? "PvP en ligne" : "Online PvP",
      text:
        lang === "fr"
          ? "Matchmaking, amis et parties en cours"
          : "Matchmaking, friends, and active games",
    },
    {
      href: "/arena",
      icon: Swords,
      title: lang === "fr" ? "Arène" : "Arena",
      text:
        lang === "fr"
          ? "Avatar contre avatar en spectateur"
          : "Avatar vs avatar, spectator mode",
    },
    {
      href: "/games",
      icon: Sparkles,
      title: lang === "fr" ? "Analyser une partie" : "Review a game",
      text:
        lang === "fr"
          ? "Import PGN et revue coup par coup"
          : "PGN import and move-by-move review",
    },
  ];

  return (
    <main className="min-h-screen theme-gradient theme-text-primary">
      {/* HERO — one composition: brand, headline, support, CTAs */}
      <section className="relative overflow-hidden min-h-[calc(100dvh-4rem)] flex items-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute w-[28rem] h-[28rem] -top-40 -left-40 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute w-[32rem] h-[32rem] -bottom-48 -right-40 bg-blue-600/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-20 w-full text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/knight-logo.png"
              alt=""
              width={112}
              height={112}
              priority
              className="drop-shadow-2xl w-24 h-24 md:w-28 md:h-28"
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-5">
            <span className="bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Chess Avatar
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-cyan-100/90 max-w-2xl mx-auto font-medium">
            {lang === "fr"
              ? "Une IA qui joue exactement comme vous"
              : "An AI that plays exactly like you"}
          </p>

          <p className="mt-4 text-base md:text-lg text-slate-400 max-w-xl mx-auto">
            {lang === "fr"
              ? "Analysez votre profil Lichess ou Chess.com, puis affrontez votre clone."
              : "Analyze your Lichess or Chess.com profile, then challenge your clone."}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center pt-10">
            <Link href="/analyze">
              <Button
                size="lg"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-base md:text-lg px-8 py-6 shadow-xl shadow-cyan-950/40 border border-cyan-400/20"
              >
                <Search className="mr-2 h-5 w-5" />
                {lang === "fr" ? "Créer mon avatar" : "Build my avatar"}
              </Button>
            </Link>

            <Link href="/play">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-400 font-semibold text-base md:text-lg px-8 py-6"
              >
                <Gamepad2 className="mr-2 h-5 w-5" />
                {lang === "fr" ? "Jouer contre un avatar" : "Play vs an avatar"}
              </Button>
            </Link>
          </div>

          <p className="pt-6 text-sm text-slate-500">
            {lang === "fr"
              ? "Aucune inscription requise pour tester"
              : "No registration required to try"}
            <span className="mx-2 text-slate-700" aria-hidden>
              ·
            </span>
            <Link
              href="/online"
              className="text-cyan-400/80 hover:text-cyan-300 transition-colors"
            >
              {lang === "fr" ? "Ou jouer en PvP" : "Or play PvP"}
            </Link>
          </p>
        </div>
      </section>

      {/* HOW IT WORKS — 3 steps, product funnel */}
      <section className="border-t border-slate-800/80 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-cyan-300 mb-12">
            {t.howItWorks.title}
          </h2>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((step, idx) => (
              <li key={step.num} className="relative text-center md:text-left">
                <div className="flex md:block items-start gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 font-bold">
                    {step.num}
                  </span>
                  <div className="md:mt-4">
                    <h3 className="text-lg font-semibold text-slate-100">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">{step.text}</p>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <span
                    className="hidden md:block absolute top-5 right-0 translate-x-1/2 text-cyan-500/25 text-xl"
                    aria-hidden
                  >
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* MODES — secondary destinations, not a feature dump */}
      <section className="border-t border-slate-800/80 bg-slate-950/40 py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-cyan-300 mb-3">
            {lang === "fr" ? "Continuer à jouer" : "Keep playing"}
          </h2>
          <p className="text-center text-slate-400 text-sm mb-10 max-w-lg mx-auto">
            {lang === "fr"
              ? "Une fois votre avatar créé, choisissez comment l’utiliser."
              : "Once your avatar is ready, choose how to use it."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {modes.map((mode) => {
              const Icon = mode.icon;
              return (
                <Link
                  key={mode.href}
                  href={mode.href}
                  className="group flex gap-4 items-start rounded-lg p-3 -mx-3 transition-colors hover:bg-slate-900/60"
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 group-hover:border-cyan-500/40 transition-colors">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {mode.title}
                    </span>
                    <span className="block text-sm text-slate-400 mt-0.5">
                      {mode.text}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          <p className="mt-10 text-center">
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              {lang === "fr"
                ? "Ouvertures, puzzles et Ascension"
                : "Openings, puzzles, and Ascension"}
            </Link>
          </p>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="border-t border-slate-800/80 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-5">
          <h2 className="text-2xl md:text-3xl font-bold text-cyan-200">
            {lang === "fr"
              ? "Prêt à créer votre avatar ?"
              : "Ready to create your avatar?"}
          </h2>
          <p className="text-slate-400">
            {lang === "fr"
              ? "Quelques secondes, aucune inscription requise."
              : "A few seconds, no registration required."}
          </p>
          <Link href="/analyze">
            <Button
              size="lg"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-10 py-6"
            >
              <Search className="mr-2 h-5 w-5" />
              {lang === "fr" ? "Commencer" : "Get started"}
            </Button>
          </Link>
        </div>
      </section>

      <footer className="bg-slate-950/80 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-semibold text-slate-300 mb-3">
                {lang === "fr" ? "Navigation" : "Navigation"}
              </h4>
              <div className="flex flex-col gap-2 text-slate-500">
                <Link href="/analyze" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr" ? "Créer" : "Build"}
                </Link>
                <Link href="/play" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr" ? "Jouer" : "Play"}
                </Link>
                <Link href="/online" className="hover:text-cyan-400 transition-colors">
                  PvP
                </Link>
                <Link href="/games" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr" ? "Parties" : "Games"}
                </Link>
                <Link href="/guide" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr" ? "Guide d'installation" : "Installation Guide"}
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-300 mb-3">
                {lang === "fr" ? "Légal" : "Legal"}
              </h4>
              <div className="flex flex-col gap-2 text-slate-500">
                <Link href="/terms" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr" ? "Conditions générales" : "Terms of Service"}
                </Link>
                <Link href="/privacy" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr"
                    ? "Politique de confidentialité"
                    : "Privacy Policy"}
                </Link>
                <Link href="/refund" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr"
                    ? "Politique de remboursement"
                    : "Refund Policy"}
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-300 mb-3">Contact</h4>
              <div className="flex flex-col gap-2 text-slate-500">
                <Link href="/contact" className="hover:text-cyan-400 transition-colors">
                  {lang === "fr" ? "Nous contacter" : "Contact Us"}
                </Link>
                <a
                  href="https://www.youtube.com/@ChessAvatarDotNet/videos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400 transition-colors inline-flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4 text-red-500"
                    aria-hidden="true"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.546 15.568V8.432L15.818 12l-6.272 3.568z" />
                  </svg>
                  {lang === "fr" ? "Chaîne YouTube" : "YouTube Channel"}
                </a>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 pt-6 border-t border-slate-800 text-slate-600 text-xs">
            © 2026 Chess Avatar •{" "}
            {lang === "fr"
              ? "Créez votre clone IA aux échecs"
              : "Create your chess AI clone"}
          </div>
        </div>
      </footer>
    </main>
  );
}
