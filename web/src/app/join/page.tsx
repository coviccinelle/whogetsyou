"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { joinRoom, listPublicRooms, type PublicRoom } from "@/app/actions";
import { rememberIdentity } from "@/lib/identity";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PageShell, Brand, Card, Button, Field, TextInput, Notice } from "@/components/ui";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Prefill code from a shared link like /join?code=ABCD
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

  // Live list of public rooms.
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
        setError("Nhập tên của bạn trước nhé.");
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
      <div className="mb-6">
        <Brand small />
      </div>
      <h1 className="font-display font-semibold text-ink text-2xl mb-1">Vào phòng</h1>
      <p className="text-ink-soft text-sm mb-6">Chọn một phòng công khai, hoặc nhập mã phòng riêng.</p>

      <Card className="mb-5">
        <div className="flex flex-col gap-4">
          <Field label="Tên của bạn">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Minh"
              maxLength={40}
              autoFocus
            />
          </Field>
          <Field label="Mã phòng" hint="Dùng khi phòng ở chế độ riêng tư.">
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
                Vào
              </Button>
            </div>
          </Field>
          {error ? <Notice>{error}</Notice> : null}
        </div>
      </Card>

      <div className="flex items-center justify-between px-1 mb-2">
        <h2 className="font-display font-semibold text-ink text-lg">Phòng công khai</h2>
        <button onClick={refreshRooms} className="text-xs text-ink-faint hover:text-ink cursor-pointer">
          ⟳ làm mới
        </button>
      </div>

      {loadingRooms ? (
        <Card className="text-center py-6 text-ink-faint text-sm">Đang tải…</Card>
      ) : rooms.length === 0 ? (
        <Card className="text-center py-6">
          <p className="text-ink-soft text-sm">Chưa có phòng công khai nào đang mở.</p>
          <p className="text-ink-faint text-xs mt-1">Tạo phòng mới hoặc nhập mã phòng riêng.</p>
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
                  {r.code} · {r.playerCount} người
                </span>
              </span>
              <span className="text-accent-ink text-sm font-semibold">Vào →</span>
            </button>
          ))}
        </div>
      )}
    </PageShell>
  );
}
