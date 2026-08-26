"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom } from "@/app/actions";
import { rememberIdentity } from "@/lib/identity";
import { SUPPORTED_LLM_MODELS, type Language } from "@/lib/types";
import { useT, useLang, LangToggle, ThemeToggle, LANGS, LANG_LABELS, LANG_FLAGS } from "@/lib/i18n";
import {
  PageShell,
  Brand,
  Card,
  Button,
  Field,
  TextInput,
  Select,
  Notice,
} from "@/components/ui";

export default function HostPage() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const [hostName, setHostName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [language, setLanguage] = useState<Language>(lang);
  const [model, setModel] = useState("gemini-3.5-flash-lite");
  const [maxScore, setMaxScore] = useState(100);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setError(null);
    setBusy(true);
    const res = await createRoom({
      hostName,
      roomName,
      isPrivate,
      settings: { language, llm_model: model, max_score: maxScore },
    });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    rememberIdentity(res.data.code, res.data.playerId, hostName.trim());
    router.push(`/room/${res.data.code}`);
  }

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between">
        <Brand small />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LangToggle />
        </div>
      </div>
      <h1 className="font-display font-semibold text-ink text-2xl mb-1">{t("host.title")}</h1>
      <p className="text-ink-soft text-sm mb-6">{t("host.subtitle")}</p>

      <Card>
        <div className="flex flex-col gap-4">
          <Field label={t("field.yourName")}>
            <TextInput
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder={t("field.yourName_ph")}
              maxLength={40}
              autoFocus
            />
          </Field>
          <Field label={t("host.roomName")}>
            <TextInput
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={t("host.roomName_ph")}
              maxLength={40}
            />
          </Field>

          <Field label={t("host.whoCanJoin")} hint={isPrivate ? t("host.private_hint") : t("host.public_hint")}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold border transition ${!isPrivate ? "bg-accent text-white border-accent" : "bg-surface text-ink-soft border-border-strong"}`}
              >
                {t("host.public")}
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold border transition ${isPrivate ? "bg-accent text-white border-accent" : "bg-surface text-ink-soft border-border-strong"}`}
              >
                {t("host.private")}
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("field.language")}>
              <Select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                {LANGS.map((code) => (
                  <option key={code} value={code}>
                    {LANG_FLAGS[code]} {LANG_LABELS[code]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("host.winScore")}>
              <TextInput
                type="number"
                inputMode="numeric"
                min={10}
                max={1000}
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label={t("host.model")} hint={t("host.model_hint")}>
            <Select value={model} onChange={(e) => setModel(e.target.value)}>
              {Object.entries(SUPPORTED_LLM_MODELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {error ? <Notice>{t(error)}</Notice> : null}

          <Button size="lg" full onClick={handleCreate} disabled={busy}>
            {busy ? t("host.creating") : t("host.create")}
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}
