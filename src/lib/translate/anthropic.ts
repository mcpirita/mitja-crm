import Anthropic from "@anthropic-ai/sdk";
import { get as getSettings } from "@/lib/db/settings";

export type TranslateKind = "initial" | "fup1" | "fup2";

export async function translateRuToDe({
  ru_text,
  kind: _kind,
  style,
}: {
  ru_text: string;
  kind?: TranslateKind;
  style?: string;
}): Promise<{ de_text: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY не задан в окружении");
  }

  let systemPrompt = style;
  if (!systemPrompt) {
    const settings = await getSettings();
    systemPrompt = settings.translation_style;
  }

  const client = new Anthropic({ apiKey });

  const result = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: ru_text }],
  });

  const de_text = result.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return { de_text };
}
