"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGame } from "@/lib/useGame";
import { getIdentity, rememberIdentity } from "@/lib/identity";
import { useT, LangLock } from "@/lib/i18n";
import { PageShell, Brand, Card } from "@/components/ui";
import Lobby from "@/components/Lobby";
import Game from "@/components/Game";

export default function RoomView({ code }: { code: string }) {
  const { room, players, round, submissions, guesses, live, loading } = useGame(code);
  const t = useT();
  const [identity, setIdentity] = useState<{ playerId: string; name: string } | null>(null);
  const [identityReady, setIdentityReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIdentity(getIdentity(code));
    setIdentityReady(true);
  }, [code]);

  if (loading || !identityReady) {
    return (
      <PageShell>
        <div className="flex-1 grid place-items-center text-ink-faint text-sm">{t("room.loading")}</div>
      </PageShell>
    );
  }

  if (!room) {
    return (
      <PageShell>
        <div className="mb-6"><Brand small /></div>
        <Card>
          <p className="text-ink font-semibold mb-1">{t("room.notFound", { code })}</p>
          <p className="text-ink-soft text-sm mb-4">{t("room.notFound_sub")}</p>
          <Link href="/" className="text-accent-ink font-semibold text-sm">{t("room.home")}</Link>
        </Card>
      </PageShell>
    );
  }

  const inRoom = !!identity && players.some((p) => p.id === identity.playerId);
  if (!inRoom) {
    if (room.started && players.length > 0) {
      return (
        <PageShell>
          <div className="mb-6"><Brand small /></div>
          <Card>
            <p className="text-ink font-semibold mb-1">{t("room.resume", { name: room.name })}</p>
            <p className="text-ink-soft text-sm mb-4">{t("room.resume_sub")}</p>
            <div className="flex flex-col gap-2">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    rememberIdentity(code, p.id, p.name);
                    setIdentity({ playerId: p.id, name: p.name });
                  }}
                  className="text-left bg-surface-2 border border-border-strong rounded-xl px-4 py-3 text-ink font-medium hover:border-accent cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </Card>
        </PageShell>
      );
    }
    return (
      <PageShell>
        <div className="mb-6"><Brand small /></div>
        <Card>
          <p className="text-ink font-semibold mb-1">{t("room.notIn")}</p>
          <p className="text-ink-soft text-sm mb-4">{t("room.notIn_sub", { name: room.name, code })}</p>
          <Link
            href={`/join?code=${code}`}
            className="inline-block bg-accent text-white font-semibold rounded-xl px-4 py-2.5 text-sm no-underline"
          >
            {t("room.notIn_join")}
          </Link>
        </Card>
      </PageShell>
    );
  }

  // In-room: lock the UI language to the host's chosen room language.
  return (
    <LangLock lang={room.settings.language}>
      {room.started ? (
        <Game
          room={room}
          players={players}
          round={round}
          submissions={submissions}
          guesses={guesses}
          identity={identity!}
          live={live}
        />
      ) : (
        <Lobby room={room} players={players} identity={identity!} live={live} />
      )}
    </LangLock>
  );
}
