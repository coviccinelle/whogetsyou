"use client";

import { useState, useEffect, useRef } from "react";
import {
  selectTheme,
  selectLevel,
  setQuestion,
  backToPhase,
  submitAnswer,
  submitGuess,
  forceGuessing,
  forceReveal,
  nextTurn,
  finishGameEarly,
} from "@/app/game-actions";
import { generateQuestion, regenerateQuestion, suggestMyAnswer } from "@/app/llm-actions";
import { endGame } from "@/app/actions";
import { DEFAULT_THEMES, LEVELS } from "@/lib/game/themes";
import { useT } from "@/lib/i18n";
import type { Guess, Player, Room, Round, Submission } from "@/lib/types";
import { PageShell, Brand, Card, Button, Notice, LiveBadge } from "@/components/ui";

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface GameProps {
  room: Room;
  players: Player[];
  round: Round | null;
  submissions: Submission[];
  guesses: Guess[];
  identity: { playerId: string; name: string };
  live: boolean;
}

export default function Game(props: GameProps) {
  const { room, players, identity } = props;
  const t = useT();
  const storytellerId = room.storyteller_order[room.turn_index] ?? null;
  const isStoryteller = identity.playerId === storytellerId;
  const isHost = identity.playerId === room.host_id;
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? "…";

  const ctx: Ctx = { ...props, storytellerId, isStoryteller, isHost, nameOf, t };

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-4">
        <Brand small />
        <LiveBadge live={props.live} />
      </div>

      {!props.live ? (
        <div className="mb-3 text-xs text-center text-warn bg-warn/10 border border-warn/30 rounded-lg py-1.5">
          {t("game.reconnect")}
        </div>
      ) : null}

      {room.phase !== "results" ? <Board {...ctx} /> : null}

      <div className="mt-4 wg-phase" key={room.phase ?? "none"}>
        {room.phase === "theme_selection" && <ThemePhase {...ctx} />}
        {room.phase === "level_selection" && <LevelPhase {...ctx} />}
        {room.phase === "question_generation" && <QuestionPhase {...ctx} />}
        {room.phase === "answer_entry" && <AnswerPhase {...ctx} />}
        {room.phase === "guessing" && <GuessPhase {...ctx} />}
        {room.phase === "reveal" && <RevealPhase {...ctx} />}
        {room.phase === "results" && <ResultsView {...ctx} />}
      </div>

      {isHost && room.phase !== "results" ? <HostControls {...ctx} /> : null}
    </PageShell>
  );
}

type Ctx = GameProps & {
  storytellerId: string | null;
  isStoryteller: boolean;
  isHost: boolean;
  nameOf: (id: string | null) => string;
  t: TFn;
};

function levelWord(t: TFn, level: string | null): string {
  return level === "deep" ? t("level.deep_word") : t("level.shallow_word");
}

// --------------------------------------------------------------------------
function Board({ room, players, storytellerId, identity, nameOf, t }: Ctx) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const meIsStory = identity.playerId === storytellerId;
  return (
    <Card className="!p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-ink-faint">
          {t("board.round", { n: room.round, max: room.settings.max_score })}
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-md"
          style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
        >
          {meIsStory ? t("board.youStory") : t("board.storyteller", { name: nameOf(storytellerId) })}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ranked.map((p) => {
          const isStory = p.id === storytellerId;
          const me = p.id === identity.playerId;
          return (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-lg border"
              style={{ borderColor: me ? "var(--accent)" : "var(--border)", background: "var(--surface-2)" }}
            >
              {isStory ? "🎙️" : ""}
              <span className="text-ink font-medium">{p.name}</span>
              <span className="font-mono font-semibold text-ink-soft tabular-nums">{p.score}</span>
            </span>
          );
        })}
      </div>
    </Card>
  );
}

function WaitingCard({ text }: { text: string }) {
  return (
    <Card className="text-center py-8">
      <div className="text-2xl mb-2 animate-pulse">⏳</div>
      <p className="text-ink-soft text-sm">{text}</p>
    </Card>
  );
}

function QuestionBanner({ text, label }: { text: string; label: string }) {
  return (
    <div className="rounded-2xl p-4 mb-4 border" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
      <p className="text-xs font-mono uppercase tracking-wider text-accent-ink mb-1">{label}</p>
      <p className="text-ink font-display font-semibold text-lg leading-snug">{text}</p>
    </div>
  );
}

// --------------------------------------------------------------------------
function ThemePhase({ room, identity, isStoryteller, nameOf, storytellerId, t }: Ctx) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!isStoryteller) return <WaitingCard text={t("wait.theme", { name: nameOf(storytellerId) })} />;
  return (
    <div>
      <h2 className="font-display font-semibold text-ink text-xl mb-1">{t("theme.title")}</h2>
      <p className="text-ink-soft text-sm mb-4">{t("theme.subtitle")}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {DEFAULT_THEMES.map((theme) => (
          <button
            key={theme}
            disabled={!!busy}
            onClick={async () => {
              setBusy(theme);
              await selectTheme({ code: room.code, playerId: identity.playerId, theme });
            }}
            className="text-left bg-surface border border-border rounded-2xl px-4 py-3.5 text-ink font-medium hover:border-accent transition disabled:opacity-50 cursor-pointer"
          >
            {theme}
          </button>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
function LevelPhase({ room, identity, isStoryteller, nameOf, storytellerId, t }: Ctx) {
  const [busy, setBusy] = useState(false);
  if (!isStoryteller) return <WaitingCard text={t("wait.level", { name: nameOf(storytellerId) })} />;
  return (
    <div>
      <p className="text-sm text-ink-soft mb-1">{t("level.themeIs", { theme: room.selected_theme ?? "" })}</p>
      <h2 className="font-display font-semibold text-ink text-xl mb-4">{t("level.title")}</h2>
      <div className="flex flex-col gap-3">
        {LEVELS.map((lvl) => (
          <button
            key={lvl.key}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await selectLevel({ code: room.code, playerId: identity.playerId, level: lvl.key });
            }}
            className="text-left bg-surface border border-border rounded-2xl px-4 py-4 hover:border-accent transition disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xl">{lvl.emoji}</span>
              <span className="text-ink font-semibold">{t(`level.${lvl.key}`)}</span>
            </div>
            <p className="text-xs text-ink-faint">{t(`level.${lvl.key}_hint`)}</p>
          </button>
        ))}
      </div>
      <BackRow code={room.code} playerId={identity.playerId} to="theme_selection" label={t("back.theme")} />
    </div>
  );
}

function BackRow({ code, playerId, to, label }: { code: string; playerId: string; to: "theme_selection" | "level_selection"; label: string }) {
  return (
    <button
      onClick={() => backToPhase({ code, playerId, phase: to })}
      className="mt-4 text-sm text-ink-faint hover:text-accent-ink cursor-pointer"
    >
      {label}
    </button>
  );
}

// --------------------------------------------------------------------------
function QuestionPhase({ room, identity, isStoryteller, nameOf, storytellerId, t }: Ctx) {
  const question = room.question?.question ?? "";
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "gen" | "regen" | "confirm">(null);
  const requested = useRef(false);

  useEffect(() => {
    if (!isStoryteller || question || requested.current) return;
    requested.current = true;
    setBusy("gen");
    generateQuestion({ code: room.code, playerId: identity.playerId }).then((res) => {
      if (!res.ok) setError(res.error);
      setBusy(null);
    });
  }, [isStoryteller, question, room.code, identity.playerId]);

  if (!isStoryteller) return <WaitingCard text={t("wait.question", { name: nameOf(storytellerId) })} />;

  async function regen() {
    setError(null);
    setBusy("regen");
    const res = await regenerateQuestion({ code: room.code, playerId: identity.playerId });
    if (!res.ok) setError(res.error);
    setBusy(null);
  }

  async function confirm(text: string) {
    setError(null);
    setBusy("confirm");
    const res = await setQuestion({ code: room.code, playerId: identity.playerId, question: text });
    if (!res.ok) {
      setError(res.error);
      setBusy(null);
    }
  }

  const header = (
    <>
      <p className="text-sm text-ink-soft mb-1">
        {room.selected_theme} · {levelWord(t, room.selected_level)}
      </p>
      <h2 className="font-display font-semibold text-ink text-xl mb-3">{t("q.title")}</h2>
    </>
  );

  if (busy === "gen" && !question) {
    return (
      <div>
        {header}
        <Card className="text-center py-8">
          <div className="text-2xl mb-2 animate-pulse">🤖</div>
          <p className="text-ink-soft text-sm">{t("q.thinking")}</p>
        </Card>
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        {header}
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={3}
          maxLength={200}
          autoFocus
          className="w-full bg-surface border border-border-strong rounded-xl px-3.5 py-3 text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent resize-none"
        />
        {error ? <div className="mt-3"><Notice>{t(error)}</Notice></div> : null}
        <div className="flex gap-2 mt-3">
          <Button variant="secondary" onClick={() => setEditing(false)}>{t("q.cancel")}</Button>
          <Button full onClick={() => confirm(editText)} disabled={busy === "confirm" || editText.trim().length < 4}>
            {busy === "confirm" ? "…" : t("q.use")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <QuestionBanner text={question || "…"} label={t("phase.question")} />
      {error ? <div className="mb-3"><Notice>{t(error)}</Notice></div> : null}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Button variant="secondary" onClick={regen} disabled={!!busy || !question}>
          {busy === "regen" ? t("q.regening") : t("q.regen")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setEditText(question);
            setEditing(true);
          }}
          disabled={!!busy || !question}
        >
          {t("q.edit")}
        </Button>
      </div>
      <Button size="lg" full onClick={() => confirm(question)} disabled={!!busy || !question}>
        {busy === "confirm" ? "…" : t("q.use")}
      </Button>
      <BackRow code={room.code} playerId={identity.playerId} to="level_selection" label={t("back.level")} />
    </div>
  );
}

// --------------------------------------------------------------------------
function AnswerPhase({ room, players, submissions, identity, isHost, t }: Ctx) {
  const mine = submissions.find((s) => s.player_id === identity.playerId);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(!mine);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const question = room.question?.question ?? "";

  async function suggest() {
    setSuggesting(true);
    const res = await suggestMyAnswer({ code: room.code, playerId: identity.playerId });
    if (res.ok) setText(res.data.answer);
    else setError(res.error);
    setSuggesting(false);
  }

  async function send() {
    setError(null);
    setBusy(true);
    const res = await submitAnswer({ code: room.code, playerId: identity.playerId, text });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    setEditing(false);
    setBusy(false);
  }

  return (
    <div>
      <QuestionBanner text={question} label={t("phase.question")} />
      <p className="text-sm text-ink-soft mb-3">{t("answer.info")}</p>

      {mine && !editing ? (
        <Card className="mb-3">
          <p className="text-xs text-ink-faint mb-1">{t("answer.yours")}</p>
          <p className="text-ink font-medium">{mine.text}</p>
          <button
            onClick={() => {
              setText(mine.text);
              setEditing(true);
            }}
            className="mt-2 text-sm text-accent-ink cursor-pointer"
          >
            {t("answer.editShort")}
          </button>
        </Card>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("answer.ph")}
            rows={2}
            maxLength={200}
            className="w-full bg-surface border border-border-strong rounded-xl px-3.5 py-3 text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent resize-none"
          />
          {error ? <div className="mt-3"><Notice>{t(error)}</Notice></div> : null}
          <div className="flex justify-end mt-2">
            <button onClick={suggest} disabled={suggesting} className="text-sm text-accent-ink hover:underline cursor-pointer disabled:opacity-50">
              {suggesting ? t("answer.suggesting") : t("answer.suggest")}
            </button>
          </div>
          <Button size="lg" full className="mt-1" onClick={send} disabled={busy || !text.trim()}>
            {busy ? "…" : mine ? t("answer.update") : t("answer.submit")}
          </Button>
        </>
      )}

      <ProgressRow done={submissions.length} total={players.length} label={t("progress.answered")} />

      {isHost && submissions.length >= 2 ? (
        <button
          onClick={() => forceGuessing({ code: room.code, hostId: identity.playerId })}
          className="mt-3 w-full text-center text-sm text-ink-faint hover:text-accent-ink cursor-pointer"
        >
          {t("answer.forceGuess")}
        </button>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------
function GuessPhase({ room, round, guesses, identity, isStoryteller, isHost, t }: Ctx) {
  const options = round?.options ?? [];
  const myGuess = guesses.find((g) => g.player_id === identity.playerId);
  const listenerTotal = room.storyteller_order.length - 1;
  const [busy, setBusy] = useState(false);

  async function pick(submissionId: string) {
    setBusy(true);
    await submitGuess({ code: room.code, playerId: identity.playerId, submissionId });
    setBusy(false);
  }

  return (
    <div>
      <QuestionBanner text={room.question?.question ?? ""} label={t("phase.question")} />
      {isStoryteller ? (
        <Card className="mb-3 text-center py-6">
          <div className="text-2xl mb-1">🕵️</div>
          <p className="text-ink-soft text-sm">{t("guess.storyWait")}</p>
        </Card>
      ) : (
        <p className="text-sm text-ink-soft mb-3">{t("guess.prompt")}</p>
      )}

      <div className="flex flex-col gap-2.5">
        {options.map((opt) => {
          const mineOwn = opt.owner_id === identity.playerId;
          const picked = myGuess?.submission_id === opt.submission_id;
          const disabled = isStoryteller || mineOwn || busy;
          return (
            <button
              key={opt.submission_id}
              disabled={disabled}
              onClick={() => pick(opt.submission_id)}
              className="text-left rounded-2xl px-4 py-3.5 border transition disabled:cursor-not-allowed cursor-pointer flex items-center gap-3"
              style={{
                borderColor: picked ? "var(--accent)" : "var(--border)",
                background: picked ? "var(--accent-soft)" : "var(--surface)",
                opacity: mineOwn && !isStoryteller ? 0.55 : 1,
              }}
            >
              <span className="font-mono font-semibold text-ink-faint">{opt.label}</span>
              <span className="text-ink flex-1">{opt.text}</span>
              {mineOwn ? <span className="text-xs text-ink-faint">{t("guess.yourOwn")}</span> : null}
              {picked ? <span className="text-accent-ink">✓</span> : null}
            </button>
          );
        })}
      </div>

      <ProgressRow done={guesses.length} total={listenerTotal} label={t("progress.guessed")} />

      {isHost && guesses.length >= 1 ? (
        <button
          onClick={() => forceReveal({ code: room.code, hostId: identity.playerId })}
          className="mt-3 w-full text-center text-sm text-ink-faint hover:text-accent-ink cursor-pointer"
        >
          {t("guess.forceReveal")}
        </button>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------
function RevealPhase({ room, round, players, identity, isStoryteller, isHost, nameOf, storytellerId, t }: Ctx) {
  const options = round?.options ?? [];
  const summary = round?.summary;
  const deltas = summary?.deltas ?? {};
  const guessesMap = summary?.guesses ?? {};

  const guessersBy: Record<string, string[]> = {};
  for (const [pid, sid] of Object.entries(guessesMap)) {
    (guessersBy[sid] ??= []).push(nameOf(pid));
  }

  const canAdvance = isStoryteller || isHost;

  return (
    <div>
      <QuestionBanner text={room.question?.question ?? ""} label={t("phase.question")} />
      <h2 className="font-display font-semibold text-ink text-xl mb-3">{t("reveal.title")}</h2>

      <div className="flex flex-col gap-2.5 mb-4">
        {options.map((opt) => {
          const guessers = guessersBy[opt.submission_id] ?? [];
          return (
            <div
              key={opt.submission_id}
              className="rounded-2xl px-4 py-3 border"
              style={{
                borderColor: opt.is_storyteller ? "var(--good)" : "var(--border)",
                background: opt.is_storyteller ? "color-mix(in srgb, var(--good) 12%, var(--surface))" : "var(--surface)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-ink-faint">{opt.label}</span>
                <span className="text-ink flex-1">{opt.text}</span>
                {opt.is_storyteller ? (
                  <span className="text-xs font-semibold" style={{ color: "var(--good)" }}>{t("reveal.trueAnswer")}</span>
                ) : (
                  <span className="text-xs text-ink-faint">{nameOf(opt.owner_id)}</span>
                )}
              </div>
              {guessers.length > 0 ? (
                <p className="text-xs text-ink-faint mt-1.5">{t("reveal.guessedBy", { names: guessers.join(", ") })}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <Card className="mb-4">
        <p className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-2">{t("reveal.points")}</p>
        <ul className="flex flex-col gap-1">
          {players.map((p) => {
            const d = deltas[p.id] ?? 0;
            return (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">
                  {p.name}
                  {p.id === storytellerId ? " 🎙️" : ""}
                </span>
                <span className="font-mono font-semibold tabular-nums" style={{ color: d > 0 ? "var(--good)" : "var(--ink-faint)" }}>
                  {d > 0 ? `+${d}` : "0"}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {room.winners.length > 0 ? <Notice tone="info">{t("reveal.winnerNote")}</Notice> : null}

      {canAdvance ? (
        <Button size="lg" full className="mt-3" onClick={() => nextTurn({ code: room.code, playerId: identity.playerId })}>
          {room.winners.length > 0 ? t("reveal.seeResults") : t("reveal.nextRound")}
        </Button>
      ) : (
        <p className="text-center text-sm text-ink-soft mt-3">{t("reveal.waitNext", { name: nameOf(storytellerId) })}</p>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
function ResultsView({ room, players, identity, isHost, t }: Ctx) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;
  const winners = ranked.filter((p) => p.score === top && top > 0);
  const reason =
    room.end_reason === "reason.winner"
      ? t("results.reasonWinner", { max: room.settings.max_score })
      : room.end_reason === "reason.host"
        ? t("results.reasonHost")
        : t("results.reasonDefault");

  return (
    <div>
      <div className="text-center py-4">
        <div className="text-5xl mb-2">🏆</div>
        <p className="text-xs font-mono uppercase tracking-widest text-ink-faint">{t("results.over")}</p>
        <h2 className="font-display font-semibold text-ink text-2xl mt-1">
          {winners.map((w) => w.name).join(" + ") || t("results.noWinner")}
        </h2>
        <p className="text-ink-soft text-sm mt-1">{reason}</p>
      </div>

      <Card className="!p-2 mb-4">
        <ul className="flex flex-col">
          {ranked.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: i === 0 ? "var(--accent-soft)" : "transparent" }}
            >
              <span className="font-mono text-ink-faint w-6 tabular-nums">{i + 1}</span>
              <span className="flex-1 text-ink font-medium">{p.name}</span>
              <span className="font-mono font-semibold text-ink tabular-nums">{p.score}</span>
            </li>
          ))}
        </ul>
      </Card>

      {isHost ? (
        <Button size="lg" full onClick={() => endGame({ code: room.code, hostId: identity.playerId })}>
          {t("results.backLobby")}
        </Button>
      ) : (
        <p className="text-center text-sm text-ink-soft">{t("results.waitHost")}</p>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
function HostControls({ room, identity, t }: Ctx) {
  const [open, setOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-8 pt-4 border-t border-border">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-xs text-ink-faint hover:text-ink cursor-pointer mx-auto block">
          {t("hc.controls")}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {confirmEnd ? (
            <div className="rounded-xl border border-border bg-surface-2 p-3">
              <p className="text-sm text-ink mb-2">{t("hc.confirmEnd")}</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setConfirmEnd(false)}>{t("hc.no")}</Button>
                <Button
                  variant="danger"
                  full
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await finishGameEarly({ code: room.code, hostId: identity.playerId });
                  }}
                >
                  {busy ? "…" : t("hc.endConfirm")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => nextTurn({ code: room.code, playerId: identity.playerId })}
                className="text-sm text-ink-soft hover:text-ink cursor-pointer text-left px-1"
              >
                {t("hc.skip")}
              </button>
              <button
                onClick={() => setConfirmEnd(true)}
                className="text-sm text-[color:var(--accent-ink)] hover:underline cursor-pointer text-left px-1"
              >
                {t("hc.endEarly")}
              </button>
              <button onClick={() => setOpen(false)} className="text-xs text-ink-faint hover:text-ink cursor-pointer mx-auto mt-1">
                {t("hc.close")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
function ProgressRow({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs text-ink-faint mb-1.5">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{done}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--accent)" }} />
      </div>
    </div>
  );
}
