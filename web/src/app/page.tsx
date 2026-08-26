"use client";

import Link from "next/link";
import { PageShell, Card } from "@/components/ui";
import { useT, LangToggle, ThemeToggle } from "@/lib/i18n";

export default function Home() {
  const t = useT();
  return (
    <PageShell>
      <div className="flex justify-end items-center gap-2 pt-2">
        <ThemeToggle />
        <LangToggle />
      </div>
      <div className="flex-1 flex flex-col justify-center gap-8 py-6">
        <header className="text-center flex flex-col items-center gap-4">
          <span className="text-5xl">🎭</span>
          <h1 className="font-display font-semibold text-ink text-4xl leading-tight tracking-tight text-balance">
            Who Gets You?
          </h1>
          <p className="text-ink-soft text-[1.02rem] max-w-xs">{t("home.tagline")}</p>
        </header>

        <div className="flex flex-col gap-3">
          <Link
            href="/host"
            className="w-full text-center bg-accent text-white font-semibold rounded-xl px-5 py-4 text-base no-underline hover:brightness-110 transition"
          >
            {t("home.create")}
          </Link>
          <Link
            href="/join"
            className="w-full text-center bg-surface-2 text-ink border border-border-strong font-semibold rounded-xl px-5 py-4 text-base no-underline hover:border-accent transition"
          >
            {t("home.join")}
          </Link>
        </div>

        <Card className="!p-4">
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-ink">
              {t("home.rules")}
              <span className="text-ink-faint group-open:rotate-180 transition-transform">⌄</span>
            </summary>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
              <li>• {t("home.rule1")}</li>
              <li>• {t("home.rule2")}</li>
              <li>• {t("home.rule3")}</li>
              <li>• {t("home.rule4")}</li>
            </ul>
          </details>
        </Card>
      </div>

      <footer className="text-center text-xs text-ink-faint font-mono pt-6">{t("home.footer")}</footer>
    </PageShell>
  );
}
