"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "vn";
export const LANGS: Lang[] = ["en", "vn"];
export const LANG_LABELS: Record<Lang, string> = { en: "English", vn: "Tiếng Việt" };
export const LANG_FLAGS: Record<Lang, string> = { en: "🇬🇧", vn: "🇻🇳" };

type Dict = Record<string, string>;

const EN: Dict = {
  // Entry
  "home.tagline": "A game about how well your friends really get you. Answer, guess, laugh.",
  "home.create": "Create room",
  "home.join": "Join room",
  "home.rules": "Quick rules",
  "home.rule1": "Each round, one storyteller picks a theme & question.",
  "home.rule2": "Everyone writes one answer to that same question.",
  "home.rule3": "Listeners guess which answer is the storyteller's.",
  "home.rule4": "Correct guesses score points; reach the target to win.",
  "home.footer": "3+ players · play on phone or computer",

  // Host
  "host.title": "Create room",
  "host.subtitle": "You're the host — pick language, model, and target score.",
  "field.yourName": "Your name",
  "field.yourName_ph": "e.g. Alex",
  "host.roomName": "Room name",
  "host.roomName_ph": "e.g. Friday night",
  "host.whoCanJoin": "Who can join",
  "host.public": "🌐 Public",
  "host.private": "🔒 Private",
  "host.public_hint": "Listed publicly so anyone can join.",
  "host.private_hint": "Only people with the code can join.",
  "field.language": "Language",
  "host.winScore": "Win score",
  "host.model": "AI model",
  "host.model_hint": "Generates questions. Changeable later.",
  "host.create": "Create room →",
  "host.creating": "Creating…",

  // Join
  "join.title": "Join room",
  "join.subtitle": "Pick a public room, or enter a private room code.",
  "join.code": "Room code",
  "join.code_hint": "Use this for private rooms.",
  "join.enter": "Enter",
  "join.publicRooms": "Public rooms",
  "join.refresh": "⟳ refresh",
  "join.loading": "Loading…",
  "join.noRooms": "No public rooms are open right now.",
  "join.noRooms_hint": "Create a room or enter a private code.",
  "join.players_n": "{n} players",
  "join.enterArrow": "Enter →",

  // Lobby
  "lobby.copyLink": "Copy invite link",
  "lobby.copied": "Link copied ✓",
  "lobby.players": "Players",
  "lobby.needMin": "need ≥ {n}",
  "lobby.host": "host",
  "lobby.remove": "remove",
  "lobby.you": "(you)",
  "lobby.model": "AI model",
  "lobby.winScore": "Win score",
  "lobby.start": "Start game →",
  "lobby.starting": "Starting…",
  "lobby.waitMin": "Waiting for {n} players",
  "lobby.waitHost": "Waiting for the host to start…",
  "lobby.closeRoom": "Close room & leave",
  "lobby.leaveRoom": "Leave room",

  // Live badge
  "live.on": "live",
  "live.off": "connecting…",

  // Room states
  "room.loading": "Loading room…",
  "room.notFound": "Room “{code}” not found.",
  "room.notFound_sub": "It may have closed, or the code is wrong.",
  "room.home": "← Back home",
  "room.notIn": "You're not in this room yet.",
  "room.notIn_sub": "Join “{name}” with code {code}.",
  "room.notIn_join": "Join room →",
  "room.resume": "Rejoin “{name}”",
  "room.resume_sub": "The game is in progress. Who are you?",

  // Board
  "board.round": "Round {n} · win at {max}",
  "board.youStory": "You're the storyteller 🎙️",
  "board.storyteller": "Storyteller: {name}",

  // Waiting
  "wait.theme": "{name} is picking a theme…",
  "wait.level": "{name} is picking a depth…",
  "wait.question": "{name} is preparing a question…",

  // Phases
  "phase.question": "Question",
  "theme.title": "Pick a theme",
  "theme.subtitle": "You're the storyteller this round.",
  "theme.or": "or type your own",
  "theme.custom_ph": "Your own theme…",
  "theme.custom_use": "Use",
  "level.themeIs": "Theme: {theme}",
  "level.title": "Pick a depth",
  "level.shallow": "Light",
  "level.shallow_hint": "Fun, quick, easy to guess · points ×1",
  "level.deep": "Deep",
  "level.deep_hint": "Reflective, more personal · points ×2",
  "level.shallow_word": "Light 🫧",
  "level.deep_word": "Deep 🌊",
  "back.theme": "← Change theme",
  "back.level": "← Change depth",
  "q.title": "This round's question",
  "q.thinking": "AI is thinking of a question…",
  "q.regen": "🔄 Another",
  "q.regening": "Changing…",
  "q.edit": "✏️ Edit",
  "q.use": "Use this →",
  "q.cancel": "Cancel",

  // Answer
  "answer.info": "Everyone writes one answer (storyteller too). Don't reveal who wrote what.",
  "answer.yours": "Your answer",
  "answer.editShort": "Edit",
  "answer.ph": "Your answer…",
  "answer.update": "Update",
  "answer.submit": "Submit answer →",
  "answer.suggest": "✨ AI suggestion",
  "answer.suggesting": "Thinking…",
  "answer.forceGuess": "(Host) Start guessing now",
  "progress.answered": "answered",
  "progress.guessed": "guessed",
  "progress.waitingOn": "Waiting on",
  "feedback.report": "🚩 Report question",
  "feedback.reported": "Reported — thanks ✓",
  "feedback.like": "👍 Good question",
  "feedback.liked": "Thanks ✓",

  // Guess
  "guess.storyWait": "Everyone's guessing which answer is yours…",
  "guess.prompt": "Which answer is the storyteller's?",
  "guess.yourOwn": "yours",
  "guess.forceReveal": "(Host) Reveal now",

  // Reveal
  "reveal.title": "The reveal",
  "reveal.trueAnswer": "✓ real answer",
  "reveal.guessedBy": "guessed by: {names}",
  "reveal.points": "Points this round",
  "reveal.winnerNote": "🏆 Someone hit the target! Continue to see results.",
  "reveal.seeResults": "See results →",
  "reveal.nextRound": "Next round →",
  "reveal.waitNext": "Waiting for {name} to start the next round…",

  // Results
  "results.over": "Game over",
  "results.noWinner": "No winner",
  "results.reasonWinner": "Someone hit the {max}-point target 🎉",
  "results.reasonHost": "The host ended the game early.",
  "results.reasonDefault": "The game has ended.",
  "results.backLobby": "Back to lobby (play again)",
  "results.waitHost": "Waiting for the host to start a new game…",

  // Host controls
  "hc.controls": "⚙️ Host controls",
  "hc.confirmEnd": "End the game now? The highest score wins.",
  "hc.no": "No",
  "hc.endConfirm": "End & see results",
  "hc.skip": "⏭️ Skip this turn (if the storyteller left or is stuck)",
  "hc.endEarly": "🏁 End this game early",
  "hc.close": "close",
  "game.reconnect": "Disconnected — retrying…",

  // Server errors (returned by actions as keys)
  "err.needName": "Please enter your name.",
  "err.needRoomName": "Please enter a room name.",
  "err.createFailed": "Couldn't create the room.",
  "err.codeFailed": "Couldn't generate a room code, please try again.",
  "err.needCode": "Please enter a room code.",
  "err.roomNotFound": "No room found with that code.",
  "err.alreadyStarted": "The game has already started.",
  "err.joinFailed": "Couldn't join the room.",
  "err.hostOnly": "Only the host can do this.",
  "err.cantRemoveHost": "Can't remove the host.",
  "err.needMinPlayers": "Need at least {n} players to start.",
  "err.storytellerOnly": "Only the storyteller can choose.",
  "err.badTheme": "Invalid theme.",
  "err.badLevel": "Invalid depth.",
  "err.storytellerOnlyQ": "Only the storyteller can set the question.",
  "err.questionShort": "That question is a bit short.",
  "err.notAnswerTime": "It's not answering time yet.",
  "err.emptyAnswer": "Your answer is empty.",
  "err.roundNotReady": "The round isn't ready yet.",
  "err.duplicateAnswer": "Same as someone else's answer — try rewording it.",
  "err.hostForceOnly": "Only the host can force this.",
  "err.notGuessTime": "It's not guessing time yet.",
  "err.storytellerNoGuess": "The storyteller doesn't guess.",
  "err.badOption": "Invalid choice.",
  "err.cantPickOwn": "You can't pick your own answer.",
  "err.waitStorytellerNext": "Wait for the storyteller to start the next round.",
  "err.hostEndOnly": "Only the host can end the game.",
  "err.storytellerGenOnly": "Only the storyteller can generate a question.",
  "err.noThemeLevel": "Theme/depth not chosen yet.",
  "err.genFailed": "Couldn't generate a question. Try again.",
  "err.regenFailed": "Couldn't change the question. Try again.",
  "err.noQuestion": "No question yet.",
  "err.suggestFailed": "Couldn't suggest an answer.",
  "err.generic": "Something went wrong.",
};

const VN: Dict = {
  "home.tagline": "Trò chơi xem bạn bè “hiểu” nhau đến mức nào. Trả lời, đoán, và cười.",
  "home.create": "Tạo phòng",
  "home.join": "Vào phòng",
  "home.rules": "Luật chơi nhanh",
  "home.rule1": "Mỗi vòng có một người kể chuyện chọn chủ đề & câu hỏi.",
  "home.rule2": "Mọi người viết một câu trả lời cho cùng câu hỏi đó.",
  "home.rule3": "Người nghe đoán đâu là câu trả lời thật của người kể chuyện.",
  "home.rule4": "Đoán đúng được điểm; đủ điểm mục tiêu là thắng.",
  "home.footer": "cần tối thiểu 3 người · chơi trên điện thoại hoặc máy tính",

  "host.title": "Tạo phòng",
  "host.subtitle": "Bạn sẽ là chủ phòng — chọn ngôn ngữ, model và điểm mục tiêu.",
  "field.yourName": "Tên của bạn",
  "field.yourName_ph": "VD: Thảo",
  "host.roomName": "Tên phòng",
  "host.roomName_ph": "VD: Tối thứ 6",
  "host.whoCanJoin": "Ai được vào",
  "host.public": "🌐 Công khai",
  "host.private": "🔒 Riêng tư",
  "host.public_hint": "Hiện ở danh sách phòng công khai để mọi người vào.",
  "host.private_hint": "Chỉ người có mã mới vào được.",
  "field.language": "Ngôn ngữ",
  "host.winScore": "Điểm thắng",
  "host.model": "Model AI",
  "host.model_hint": "Sinh câu hỏi. Có thể đổi sau.",
  "host.create": "Tạo phòng →",
  "host.creating": "Đang tạo…",

  "join.title": "Vào phòng",
  "join.subtitle": "Chọn một phòng công khai, hoặc nhập mã phòng riêng.",
  "join.code": "Mã phòng",
  "join.code_hint": "Dùng khi phòng ở chế độ riêng tư.",
  "join.enter": "Vào",
  "join.publicRooms": "Phòng công khai",
  "join.refresh": "⟳ làm mới",
  "join.loading": "Đang tải…",
  "join.noRooms": "Chưa có phòng công khai nào đang mở.",
  "join.noRooms_hint": "Tạo phòng mới hoặc nhập mã phòng riêng.",
  "join.players_n": "{n} người",
  "join.enterArrow": "Vào →",

  "lobby.copyLink": "Sao chép link mời",
  "lobby.copied": "Đã sao chép link ✓",
  "lobby.players": "Người chơi",
  "lobby.needMin": "cần ≥ {n}",
  "lobby.host": "chủ phòng",
  "lobby.remove": "xoá",
  "lobby.you": "(bạn)",
  "lobby.model": "Model AI",
  "lobby.winScore": "Điểm thắng",
  "lobby.start": "Bắt đầu ván →",
  "lobby.starting": "Đang bắt đầu…",
  "lobby.waitMin": "Chờ đủ {n} người",
  "lobby.waitHost": "Chờ chủ phòng bắt đầu…",
  "lobby.closeRoom": "Đóng phòng & rời đi",
  "lobby.leaveRoom": "Rời phòng",

  "live.on": "trực tiếp",
  "live.off": "đang kết nối…",

  "room.loading": "Đang tải phòng…",
  "room.notFound": "Không tìm thấy phòng “{code}”.",
  "room.notFound_sub": "Có thể phòng đã đóng hoặc mã sai.",
  "room.home": "← Về trang chủ",
  "room.notIn": "Bạn chưa ở trong phòng này.",
  "room.notIn_sub": "Vào phòng “{name}” bằng mã {code}.",
  "room.notIn_join": "Vào phòng →",
  "room.resume": "Vào lại phòng “{name}”",
  "room.resume_sub": "Ván đang diễn ra. Bạn là ai?",

  "board.round": "Vòng {n} · điểm thắng {max}",
  "board.youStory": "Bạn kể chuyện 🎙️",
  "board.storyteller": "Kể chuyện: {name}",

  "wait.theme": "{name} đang chọn chủ đề…",
  "wait.level": "{name} đang chọn mức độ…",
  "wait.question": "{name} đang soạn câu hỏi…",

  "phase.question": "Câu hỏi",
  "theme.title": "Chọn chủ đề",
  "theme.subtitle": "Bạn là người kể chuyện vòng này.",
  "theme.or": "hoặc tự nhập",
  "theme.custom_ph": "Chủ đề của riêng bạn…",
  "theme.custom_use": "Dùng",
  "level.themeIs": "Chủ đề: {theme}",
  "level.title": "Chọn mức độ",
  "level.shallow": "Nhẹ nhàng",
  "level.shallow_hint": "Vui, nhanh, dễ đoán · điểm ×1",
  "level.deep": "Sâu sắc",
  "level.deep_hint": "Suy ngẫm, cá nhân hơn · điểm ×2",
  "level.shallow_word": "Nhẹ nhàng 🫧",
  "level.deep_word": "Sâu sắc 🌊",
  "back.theme": "← Đổi chủ đề",
  "back.level": "← Đổi mức độ",
  "q.title": "Câu hỏi cho vòng này",
  "q.thinking": "AI đang nghĩ câu hỏi…",
  "q.regen": "🔄 Câu khác",
  "q.regening": "Đang đổi…",
  "q.edit": "✏️ Sửa",
  "q.use": "Dùng câu này →",
  "q.cancel": "Huỷ",

  "answer.info": "Mọi người viết một câu trả lời (kể cả người kể chuyện). Đừng để lộ ai viết gì nhé.",
  "answer.yours": "Câu trả lời của bạn",
  "answer.editShort": "Sửa",
  "answer.ph": "Câu trả lời của bạn…",
  "answer.update": "Cập nhật",
  "answer.submit": "Nộp câu trả lời →",
  "answer.suggest": "✨ Gợi ý từ AI",
  "answer.suggesting": "Đang nghĩ…",
  "answer.forceGuess": "(Chủ phòng) Bắt đầu đoán ngay",
  "progress.answered": "đã trả lời",
  "progress.guessed": "đã đoán",
  "progress.waitingOn": "Còn chờ",
  "feedback.report": "🚩 Báo câu hỏi lỗi",
  "feedback.reported": "Đã báo — cảm ơn ✓",
  "feedback.like": "👍 Câu hỏi hay",
  "feedback.liked": "Cảm ơn ✓",

  "guess.storyWait": "Mọi người đang đoán đâu là câu của bạn…",
  "guess.prompt": "Đâu là câu trả lời của người kể chuyện?",
  "guess.yourOwn": "của bạn",
  "guess.forceReveal": "(Chủ phòng) Lật bài ngay",

  "reveal.title": "Lật bài",
  "reveal.trueAnswer": "✓ câu thật",
  "reveal.guessedBy": "đoán bởi: {names}",
  "reveal.points": "Điểm vòng này",
  "reveal.winnerNote": "🏆 Có người đạt điểm thắng! Bấm tiếp để xem kết quả.",
  "reveal.seeResults": "Xem kết quả →",
  "reveal.nextRound": "Vòng tiếp theo →",
  "reveal.waitNext": "Chờ {name} sang vòng mới…",

  "results.over": "Kết thúc",
  "results.noWinner": "Không có người thắng",
  "results.reasonWinner": "Đã có người cán mốc {max} điểm 🎉",
  "results.reasonHost": "Chủ phòng kết thúc sớm.",
  "results.reasonDefault": "Ván đã kết thúc.",
  "results.backLobby": "Về lobby (chơi lại)",
  "results.waitHost": "Chờ chủ phòng bắt đầu ván mới…",

  "hc.controls": "⚙️ Điều khiển chủ phòng",
  "hc.confirmEnd": "Kết thúc ván ngay bây giờ? Người điểm cao nhất sẽ thắng.",
  "hc.no": "Không",
  "hc.endConfirm": "Kết thúc & xem kết quả",
  "hc.skip": "⏭️ Bỏ qua lượt này (nếu người kể chuyện rời đi / bị kẹt)",
  "hc.endEarly": "🏁 Kết thúc sớm ván này",
  "hc.close": "đóng",
  "game.reconnect": "Mất kết nối — đang thử lại…",

  "err.needName": "Cần nhập tên của bạn.",
  "err.needRoomName": "Cần nhập tên phòng.",
  "err.createFailed": "Không tạo được phòng.",
  "err.codeFailed": "Không tạo được mã phòng, thử lại nhé.",
  "err.needCode": "Cần nhập mã phòng.",
  "err.roomNotFound": "Không tìm thấy phòng với mã này.",
  "err.alreadyStarted": "Ván đã bắt đầu rồi.",
  "err.joinFailed": "Không vào được phòng.",
  "err.hostOnly": "Chỉ chủ phòng mới làm được việc này.",
  "err.cantRemoveHost": "Không thể tự xoá chủ phòng.",
  "err.needMinPlayers": "Cần ít nhất {n} người để bắt đầu.",
  "err.storytellerOnly": "Chỉ người kể chuyện mới chọn được.",
  "err.badTheme": "Chủ đề không hợp lệ.",
  "err.badLevel": "Mức độ không hợp lệ.",
  "err.storytellerOnlyQ": "Chỉ người kể chuyện mới đặt câu hỏi.",
  "err.questionShort": "Câu hỏi hơi ngắn.",
  "err.notAnswerTime": "Chưa tới lúc trả lời.",
  "err.emptyAnswer": "Câu trả lời trống.",
  "err.roundNotReady": "Vòng chơi chưa sẵn sàng.",
  "err.duplicateAnswer": "Trùng câu trả lời của người khác — thử cách diễn đạt khác.",
  "err.hostForceOnly": "Chỉ chủ phòng mới ép được.",
  "err.notGuessTime": "Chưa tới lúc đoán.",
  "err.storytellerNoGuess": "Người kể chuyện không đoán.",
  "err.badOption": "Lựa chọn không hợp lệ.",
  "err.cantPickOwn": "Không thể chọn chính câu của bạn.",
  "err.waitStorytellerNext": "Chờ người kể chuyện sang vòng mới.",
  "err.hostEndOnly": "Chỉ chủ phòng mới kết thúc được.",
  "err.storytellerGenOnly": "Chỉ người kể chuyện mới sinh câu hỏi.",
  "err.noThemeLevel": "Chưa chọn chủ đề/mức độ.",
  "err.genFailed": "Không sinh được câu hỏi. Thử lại nhé.",
  "err.regenFailed": "Không đổi được câu hỏi. Thử lại nhé.",
  "err.noQuestion": "Chưa có câu hỏi.",
  "err.suggestFailed": "Không gợi ý được câu trả lời.",
  "err.generic": "Có lỗi xảy ra.",
};

const TABLE: Record<Lang, Dict> = { en: EN, vn: VN };

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = TABLE[lang]?.[key] ?? EN[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  locked: boolean;
}

const LangContext = createContext<LangCtx>({ lang: "en", setLang: () => {}, locked: false });

const STORAGE_KEY = "wgy.lang";

/** App-wide language preference (default English), remembered per browser. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (s === "en" || s === "vn") setLangState(s);
    } catch {
      /* ignore */
    }
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };
  return <LangContext.Provider value={{ lang, setLang, locked: false }}>{children}</LangContext.Provider>;
}

/** Force a language for a subtree (used in-room, driven by the room's setting). */
export function LangLock({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={{ lang, setLang: () => {}, locked: true }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export function useT() {
  const { lang } = useContext(LangContext);
  return (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
}

/** Light/dark toggle. Persists an explicit choice; otherwise follows the OS. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    let resolved: "light" | "dark";
    try {
      const saved = localStorage.getItem("wgy.theme");
      resolved = saved === "light" || saved === "dark" ? saved : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(resolved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("wgy.theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="w-8 h-8 grid place-items-center rounded-lg border border-border-strong bg-surface text-ink-soft hover:text-ink cursor-pointer text-sm"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

/** EN | VN switch, hidden when the language is locked by the room. */
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, locked } = useLang();
  if (locked) return null;
  return (
    <div className={`inline-flex rounded-lg border border-border-strong overflow-hidden ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 text-xs font-semibold cursor-pointer transition ${
            lang === l ? "bg-accent text-white" : "bg-surface text-ink-soft hover:text-ink"
          }`}
          aria-pressed={lang === l}
        >
          {LANG_FLAGS[l]} {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
