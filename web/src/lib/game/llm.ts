import "server-only";
import OpenAI from "openai";

// Routes Gemini models through the OpenAI-compatible endpoint (same as the old
// Python llm_loader), and native OpenAI models through the OpenAI API.

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

// Keep Gemini's thinking budget low: fast + cheap, plenty for short questions.
const THINKING_EFFORT = "low" as const;

interface Resolved {
  client: OpenAI;
  model: string;
}

function resolve(model: string): Resolved {
  const isGemini = model.toLowerCase().startsWith("gemini");
  if (isGemini) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_API_KEY is not set (required for Gemini models).");
    return { client: new OpenAI({ apiKey, baseURL: GEMINI_BASE_URL }), model };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set (required for OpenAI models).");
  return { client: new OpenAI({ apiKey }), model };
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

// JSON-schema shape accepted by the OpenAI-compatible response_format.
export interface JsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

export async function callStructured<T>(
  model: string,
  messages: ChatMessage[],
  jsonSchema: JsonSchema,
): Promise<T> {
  const { client, model: m } = resolve(model);
  const completion = await client.chat.completions.create({
    model: m,
    messages,
    reasoning_effort: THINKING_EFFORT,
    response_format: {
      type: "json_schema",
      json_schema: { name: jsonSchema.name, schema: jsonSchema.schema, strict: true },
    },
  });
  const content = completion.choices[0]?.message?.content ?? "";
  if (!content) throw new Error("LLM returned empty content.");
  return JSON.parse(content) as T;
}

export async function callText(model: string, messages: ChatMessage[]): Promise<string> {
  const { client, model: m } = resolve(model);
  const completion = await client.chat.completions.create({
    model: m,
    messages,
    reasoning_effort: THINKING_EFFORT,
  });
  return (completion.choices[0]?.message?.content ?? "").trim();
}
