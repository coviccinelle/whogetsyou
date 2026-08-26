"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinRoom, listPublicRooms, type PublicRoom } from "@/app/actions";
import { rememberIdentity } from "@/lib/identity";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useT, LangToggle } from "@/lib/i18n";
import { PageShell, Brand, Card, Button, Field, TextInput, Notice } from "@/components/ui";

export default function JoinPage() {
  const router = useRouter();
  const t = useT();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c) setCode(c.toUpperCase());
  }, []);

  const refreshRooms = useCallback(async () => {
    const list = await listPublicRooms();
    setRooms(list);
    setLoadingRooms(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshRooms();
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("public-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => void refreshRooms())
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => void refreshRooms())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshRooms]);

  const join = useCallback(
    async (roomCode: string) => {
      if (!name.trim()) {
        setError("err.needName");
        return;
      }
      setError(null);
      setBusy(true);
      const res = await joinRoom({ code: roomCode, name });
      if (!res.ok) {
        setError(res.error);
        setBusy(false);
        return;
      }
      rememberIdentity(res.data.code, res.data.playerId, name.trim());
      router.push(`/room/${res.data.code}`);
    },
    [name, router],
  );

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between">
        <Brand small />
        <LangToggle />
      </div>
      <h1 className="font-display font-semibold text-ink text-2xl mb-1">{t("join.title")}</h1>
      <p className="text-ink-soft text-sm mb-6">{t("join.subtitle")}</p>

      <Card className="mb-5">
        <div className="flex flex-col gap-4">
          <Field label={t("field.yourName")}>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("field.yourName_ph")}
              maxLength={40}
              autoFocus
            />
          </Field>
          <Field label={t("join.code")} hint={t("join.code_hint")}>
            <div className="flex gap-2">
              <TextInput
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="K7QP"
                maxLength={6}
                autoCapitalize="characters"
                className="font-mono tracking-[0.3em] text-lg"
              />
              <Button onClick={() => join(code)} disabled={busy || !code.trim()}>
                {t("join.enter")}
              </Button>
            </div>
          </Field>
          {error ? <Notice>{t(error)}</Notice> : null}
        </div>
      </Card>

      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="font-display font-semibold text-ink text-lg">{t("join.publicRooms")}</h2>
        <button onClick={refreshRooms} className="text-xs text-ink-faint hover:text-ink cursor-pointer">
          {t("join.refresh")}
        </button>
      </div>

      {loadingRooms ? (
        <Card className="text-center py-6 text-ink-faint text-sm">{t("join.loading")}</Card>
      ) : rooms.length === 0 ? (
        <Card className="text-center py-6">
          <p className="text-ink-soft text-sm">{t("join.noRooms")}</p>
          <p className="text-ink-faint text-xs mt-1">{t("join.noRooms_hint")}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rooms.map((r) => (
            <button
              key={r.code}
              onClick={() => join(r.code)}
              disabled={busy}
              className="flex items-center gap-3 text-left bg-surface border border-border rounded-2xl px-4 py-3 hover:border-accent transition disabled:opacity-50 cursor-pointer"
            >
              <span className="text-xl">🎭</span>
              <span className="flex-1 min-w-0">
                <span className="block text-ink font-semibold truncate">{r.name}</span>
                <span className="block text-xs text-ink-faint font-mono">
                  {r.code} · {t("join.players_n", { n: r.playerCount })}
                </span>
              </span>
              <span className="text-accent-ink text-sm font-semibold">{t("join.enterArrow")}</span>
            </button>
          ))}
        </div>
      )}
    </PageShell>
  );
}
