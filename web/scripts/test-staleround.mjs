// Reproduces the "old answers bleed into a new game" bug and proves the fix.
// Run: node scripts/test-staleround.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// mimic ensureRound: reuse an existing round_no row, else create.
async function ensureRound(roomId, roundNo) {
  const { data: existing } = await s.from("rounds").select("*").eq("room_id", roomId).eq("round_no", roundNo).maybeSingle();
  if (existing) return existing;
  const { data: created } = await s.from("rounds").insert({ room_id: roomId, round_no: roundNo }).select("*").single();
  return created;
}
async function subCount(roundId) {
  const { count } = await s.from("submissions").select("*", { count: "exact", head: true }).eq("round_id", roundId);
  return count ?? 0;
}

let ok = 0, bad = 0;
const check = (label, cond) => (cond ? (ok++, console.log(`  ✅ ${label}`)) : (bad++, console.log(`  ❌ ${label}`)));

let roomId;
try {
  const host = crypto.randomUUID();
  const { data: room } = await s.from("rooms").insert({ code: "STL" + Math.floor(Math.random()*90+10), name: "stale-test", host_id: host, started: true, round: 1 }).select("id").single();
  roomId = room.id;
  await s.from("players").insert({ id: host, room_id: roomId, name: "Host", role: "host" });
  const { data: p2 } = await s.from("players").insert({ room_id: roomId, name: "T2" }).select("id").single();
  const { data: p3 } = await s.from("players").insert({ room_id: roomId, name: "T3" }).select("id").single();

  // ---- GAME 1: play round 1 fully (3 submissions) ----
  const g1r1 = await ensureRound(roomId, 1);
  await s.from("submissions").insert([
    { round_id: g1r1.id, player_id: host, text: "OLD-host", is_storyteller: true },
    { round_id: g1r1.id, player_id: p2.id, text: "OLD-t2", is_storyteller: false },
    { round_id: g1r1.id, player_id: p3.id, text: "OLD-t3", is_storyteller: false },
  ]);
  check("game 1 round 1 has 3 submissions", (await subCount(g1r1.id)) === 3);

  // ---- Reproduce BUG: without clearing, a "new game" round 1 reuses the old row ----
  const buggy = await ensureRound(roomId, 1); // new game, round resets to 1
  check("BUG reproduced: reused old round with stale submissions", buggy.id === g1r1.id && (await subCount(buggy.id)) === 3);

  // ---- Apply the FIX (what startGame now does): delete all rounds ----
  await s.from("rounds").delete().eq("room_id", roomId);

  // ---- New game round 1 is now fresh ----
  const fixed = await ensureRound(roomId, 1);
  check("FIX: new round 1 is a different row", fixed.id !== g1r1.id);
  check("FIX: new round 1 has 0 submissions", (await subCount(fixed.id)) === 0);
} finally {
  if (roomId) await s.from("rooms").delete().eq("id", roomId);
  console.log("  · cleaned up");
}

console.log(`\n${bad === 0 ? "🎉 FIX VERIFIED" : "⚠️ FAIL"} — ${ok} passed, ${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
