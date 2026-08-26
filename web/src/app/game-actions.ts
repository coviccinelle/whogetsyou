"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { computeScoring, type ScoringOption } from "@/lib/game/scoring";
import { DEFAULT_THEMES } from "@/lib/game/themes";
import type { Level, Room } from "@/lib/types";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

interface RoundRow {
  id: string;
  room_id: string;
  round_no: number;
  storyteller_id: string | null;
  theme: string | null;
  level: string | null;
  question: { question: string; question_en: string; angle_key: string } | null;
  options: OptionRow[] | null;
  summary: unknown;
}

interface OptionRow {
  submission_id: string;
  owner_id: string;
  is_storyteller: boolean;
  label: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------
async function loadRoom(code: string): Promise<Room | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle<Room>();
  return data ?? null;
}

function storytellerId(room: Room): string | null {
  return room.storyteller_order[room.turn_index] ?? null;
}

async function ensureRound(room: Room): Promise<RoundRow> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("rounds")
    .select("*")
    .eq("room_id", room.id)
    .eq("round_no", room.round)
    .maybeSingle<RoundRow>();
  if (existing) return existing;
  const { data: created } = await supabase
    .from("rounds")
    .insert({
      room_id: room.id,
      round_no: room.round,
      storyteller_id: storytellerId(room),
    })
    .select("*")
    .single<RoundRow>();
  return created!;
}

async function getRound(roomId: string, roundNo: number): Promise<RoundRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("rounds")
    .select("*")
    .eq("room_id", roomId)
    .eq("round_no", roundNo)
    .maybeSingle<RoundRow>();
  return data ?? null;
}

// ---------------------------------------------------------------------------
// Storyteller picks a theme
// ---------------------------------------------------------------------------
export async function selectTheme(input: {
  code: string;
  playerId: string;
  theme: string;
}): Promise<ActionResult<null>> {
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  if (storytellerId(room) !== input.playerId)
    return { ok: false, error: "err.storytellerOnly" };
  if (!DEFAULT_THEMES.includes(input.theme))
    return { ok: false, error: "err.badTheme" };

  const supabase = getSupabaseAdmin();
  await supabase
    .from("rooms")
    .update({ selected_theme: input.theme, phase: "level_selection", updated_at: new Date().toISOString() })
    .eq("id", room.id);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Storyteller picks a level
// ---------------------------------------------------------------------------
export async function selectLevel(input: {
  code: string;
  playerId: string;
  level: Level;
}): Promise<ActionResult<null>> {
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  if (storytellerId(room) !== input.playerId)
    return { ok: false, error: "err.storytellerOnly" };
  if (input.level !== "shallow" && input.level !== "deep")
    return { ok: false, error: "err.badLevel" };

  const supabase = getSupabaseAdmin();
  const round = await ensureRound(room);
  await supabase
    .from("rounds")
    .update({ theme: room.selected_theme, level: input.level, storyteller_id: input.playerId })
    .eq("id", round.id);
  await supabase
    .from("rooms")
    .update({ selected_level: input.level, phase: "question_generation", updated_at: new Date().toISOString() })
    .eq("id", room.id);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Storyteller confirms the question (Phase 2: typed manually; Phase 3: AI)
// ---------------------------------------------------------------------------
export async function setQuestion(input: {
  code: string;
  playerId: string;
  question: string;
}): Promise<ActionResult<null>> {
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  if (storytellerId(room) !== input.playerId)
    return { ok: false, error: "err.storytellerOnlyQ" };
  const text = input.question.trim();
  if (text.length < 4) return { ok: false, error: "err.questionShort" };

  const supabase = getSupabaseAdmin();
  const round = await ensureRound(room);
  // Preserve the AI English canonical + angle from the draft (used for answer
  // suggestions), stripping the transient candidate pool.
  const draft = room.question as (typeof room.question & { angle_key?: string }) | null;
  const questionObj = {
    question: text,
    question_en: draft?.question_en || text,
    angle_key: draft?.angle_key || "",
  };
  await supabase.from("rounds").update({ question: questionObj }).eq("id", round.id);
  await supabase
    .from("rooms")
    .update({ question: questionObj, phase: "answer_entry", updated_at: new Date().toISOString() })
    .eq("id", room.id);
  return { ok: true, data: null };
}

// Storyteller steps back to an earlier phase.
export async function backToPhase(input: {
  code: string;
  playerId: string;
  phase: "theme_selection" | "level_selection";
}): Promise<ActionResult<null>> {
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  if (storytellerId(room) !== input.playerId)
    return { ok: false, error: "err.storytellerOnly" };
  const supabase = getSupabaseAdmin();
  const patch: Record<string, unknown> = { phase: input.phase, updated_at: new Date().toISOString() };
  if (input.phase === "theme_selection") {
    patch.selected_theme = null;
    patch.selected_level = null;
  } else if (input.phase === "level_selection") {
    patch.selected_level = null;
  }
  await supabase.from("rooms").update(patch).eq("id", room.id);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Answer entry — every player submits one answer
// ---------------------------------------------------------------------------
export async function submitAnswer(input: {
  code: string;
  playerId: string;
  text: string;
}): Promise<ActionResult<null>> {
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  if (room.phase !== "answer_entry") return { ok: false, error: "err.notAnswerTime" };
  const text = input.text.trim();
  if (!text) return { ok: false, error: "err.emptyAnswer" };

  const supabase = getSupabaseAdmin();
  const round = await getRound(room.id, room.round);
  if (!round) return { ok: false, error: "err.roundNotReady" };

  // Block exact-duplicate answers from other players.
  const { data: existingSubs } = await supabase
    .from("submissions")
    .select("player_id, text")
    .eq("round_id", round.id);
  const norm = (s: string) => s.trim().toLowerCase();
  const clash = (existingSubs ?? []).some(
    (s) => s.player_id !== input.playerId && norm(s.text) === norm(text),
  );
  if (clash) return { ok: false, error: "err.duplicateAnswer" };

  const isStoryteller = storytellerId(room) === input.playerId;
  const { error } = await supabase
    .from("submissions")
    .upsert(
      { round_id: round.id, player_id: input.playerId, text, is_storyteller: isStoryteller },
      { onConflict: "round_id,player_id" },
    );
  if (error) return { ok: false, error: error.message };

  // Auto-advance once everyone has submitted.
  await maybeEnterGuessing(room);
  return { ok: true, data: null };
}

async function maybeEnterGuessing(room: Room): Promise<void> {
  const supabase = getSupabaseAdmin();
  const round = await getRound(room.id, room.round);
  if (!round) return;
  const { count } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("round_id", round.id);
  const { data: players } = await supabase.from("players").select("id").eq("room_id", room.id);
  if (!players || (count ?? 0) < players.length) return;
  await enterGuessing(room, round.id);
}

// Host can force the guessing phase early.
export async function forceGuessing(input: {
  code: string;
  hostId: string;
}): Promise<ActionResult<null>> {
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  if (room.host_id !== input.hostId)
    return { ok: false, error: "err.hostForceOnly" };
  const round = await getRound(room.id, room.round);
  if (!round) return { ok: false, error: "err.roundNotReady" };
  await enterGuessing(room, round.id);
  return { ok: true, data: null };
}

async function enterGuessing(room: Room, roundId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: subs } = await supabase
    .from("submissions")
    .select("id, player_id, text, is_storyteller")
    .eq("round_id", roundId);
  if (!subs || subs.length === 0) return;

  const shuffled = [...subs];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const options: OptionRow[] = shuffled.map((s, i) => ({
    submission_id: s.id,
    owner_id: s.player_id,
    is_storyteller: s.is_storyteller,
    label: String.fromCharCode(65 + i),
    text: s.text,
  }));
  await supabase.from("rounds").update({ options }).eq("id", roundId);
  await supabase
    .from("rooms")
    .update({ phase: "guessing", updated_at: new Date().toISOString() })
    .eq("id", room.id);
}

// ---------------------------------------------------------------------------
// Guessing — each listener picks the submission they think is the storyteller's
// ---------------------------------------------------------------------------
export async function submitGuess(input: {
  code: string;
  playerId: string;
  submissionId: string;
}): Promise<ActionResult<null>> {
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  if (room.phase !== "guessing") return { ok: false, error: "err.notGuessTime" };
  if (storytellerId(room) === input.playerId)
    return { ok: false, error: "err.storytellerNoGuess" };

  const supabase = getSupabaseAdmin();
  const round = await getRound(room.id, room.round);
  if (!round) return { ok: false, error: "err.roundNotReady" };

  const own = (round.options ?? []).find((o) => o.submission_id === input.submissionId);
  if (!own) return { ok: false, error: "err.badOption" };
  if (own.owner_id === input.playerId)
    return { ok: false, error: "err.cantPickOwn" };

  const { error } = await supabase
    .from("guesses")
    .upsert(
      { round_id: round.id, player_id: input.playerId, submission_id: input.submissionId },
      { onConflict: "round_id,player_id" },
    );
  if (error) return { ok: false, error: error.message };

  await maybeEnterReveal(room);
  return { ok: true, data: null };
}

async function maybeEnterReveal(room: Room): Promise<void> {
  const supabase = getSupabaseAdmin();
  const round = await getRound(room.id, room.round);
  if (!round) return;
  const { count } = await supabase
    .from("guesses")
    .select("*", { count: "exact", head: true })
    .eq("round_id", round.id);
  const listenerCount = room.storyteller_order.length - 1;
  if ((count ?? 0) < listenerCount) return;
  await enterReveal(room, round.id);
}

export async function forceReveal(input: {
  code: string;
  hostId: string;
}): Promise<ActionResult<null>> {
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  if (room.host_id !== input.hostId)
    return { ok: false, error: "err.hostForceOnly" };
  const round = await getRound(room.id, room.round);
  if (!round) return { ok: false, error: "err.roundNotReady" };
  await enterReveal(room, round.id);
  return { ok: true, data: null };
}

async function enterReveal(room: Room, roundId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const round = await getRound(room.id, room.round);
  if (!round || !round.options) return;
  if (room.phase === "reveal" || room.phase === "results") return; // already scored

  const { data: guessRows } = await supabase
    .from("guesses")
    .select("player_id, submission_id")
    .eq("round_id", roundId);
  const guesses: Record<string, string> = {};
  for (const g of guessRows ?? []) guesses[g.player_id] = g.submission_id;

  const { data: players } = await supabase
    .from("players")
    .select("id, score")
    .eq("room_id", room.id);
  const playerIds = (players ?? []).map((p) => p.id);
  const currentScores: Record<string, number> = {};
  for (const p of players ?? []) currentScores[p.id] = p.score;

  const stId = storytellerId(room);
  const options: ScoringOption[] = round.options.map((o) => ({
    submission_id: o.submission_id,
    owner_id: o.owner_id,
    is_storyteller: o.is_storyteller,
  }));

  const result = computeScoring({
    level: (room.selected_level ?? "shallow") as Level,
    storytellerId: stId ?? "",
    playerIds,
    options,
    guesses,
    currentScores,
    maxScore: room.settings.max_score,
  });

  // Persist new scores per player.
  for (const pid of playerIds) {
    await supabase.from("players").update({ score: result.newScores[pid] ?? 0 }).eq("id", pid);
  }
  await supabase
    .from("rounds")
    .update({ summary: { deltas: result.deltas, correct: result.correct, decoy: result.decoyPicks, guesses } })
    .eq("id", roundId);
  await supabase
    .from("rooms")
    .update({
      phase: "reveal",
      winners: result.winners,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id);
}

// ---------------------------------------------------------------------------
// Next turn (storyteller or host) → rotate, or go to results if there's a winner
// ---------------------------------------------------------------------------
export async function nextTurn(input: {
  code: string;
  playerId: string;
}): Promise<ActionResult<null>> {
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  const allowed = storytellerId(room) === input.playerId || room.host_id === input.playerId;
  if (!allowed) return { ok: false, error: "err.waitStorytellerNext" };

  const supabase = getSupabaseAdmin();
  if (room.winners.length > 0) {
    await supabase
      .from("rooms")
      .update({
        phase: "results",
        end_reason: "reason.winner",
        updated_at: new Date().toISOString(),
      })
      .eq("id", room.id);
    return { ok: true, data: null };
  }

  // Advance to the next storyteller who is still in the room (skip anyone who left).
  const { data: players } = await supabase.from("players").select("id").eq("room_id", room.id);
  const present = new Set((players ?? []).map((p) => p.id));
  const order = room.storyteller_order;
  let nextIndex = order.length ? (room.turn_index + 1) % order.length : 0;
  for (let step = 0; step < order.length; step++) {
    if (present.has(order[nextIndex])) break;
    nextIndex = (nextIndex + 1) % order.length;
  }
  await supabase
    .from("rooms")
    .update({
      round: room.round + 1,
      turn_index: nextIndex,
      phase: "theme_selection",
      selected_theme: null,
      selected_level: null,
      question: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Host ends the game early → jump to results with current standings.
// ---------------------------------------------------------------------------
export async function finishGameEarly(input: {
  code: string;
  hostId: string;
}): Promise<ActionResult<null>> {
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  if (room.host_id !== input.hostId)
    return { ok: false, error: "err.hostEndOnly" };

  const supabase = getSupabaseAdmin();
  const { data: players } = await supabase
    .from("players")
    .select("id, score")
    .eq("room_id", room.id);
  const top = Math.max(0, ...(players ?? []).map((p) => p.score));
  const winners = (players ?? []).filter((p) => p.score === top && top > 0).map((p) => p.id);

  await supabase
    .from("rooms")
    .update({
      phase: "results",
      winners,
      end_reason: "reason.host",
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id);
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Question feedback — a player marks the current question good or broken.
// ---------------------------------------------------------------------------
export async function submitQuestionFeedback(input: {
  code: string;
  playerId: string;
  kind: "like" | "report";
}): Promise<ActionResult<null>> {
  if (input.kind !== "like" && input.kind !== "report") return { ok: false, error: "err.generic" };
  const room = await loadRoom(input.code);
  if (!room) return { ok: false, error: "err.roomNotFound" };
  const supabase = getSupabaseAdmin();
  const round = await getRound(room.id, room.round);
  const q = (room.question ?? round?.question ?? null) as
    | { question?: string; question_en?: string }
    | null;
  const { error } = await supabase.from("question_feedback").insert({
    room_id: room.id,
    round_id: round?.id ?? null,
    player_id: input.playerId,
    question: q?.question ?? null,
    question_en: q?.question_en ?? null,
    theme: room.selected_theme ?? round?.theme ?? null,
    level: room.selected_level ?? round?.level ?? null,
    kind: input.kind,
  });
  if (error) return { ok: false, error: "err.generic" };
  return { ok: true, data: null };
}
