import { z } from "zod";

export const SettingsUpdate = z.object({
  translation_style: z.string().trim().min(1, "Стиль перевода не может быть пустым"),
  signature_ru: z.string().trim(),
  signature_de: z.string().trim(),
  offer_description: z.string().trim(),
});

export const SettingsRow = z.object({
  id: z.literal(1),
  translation_style: z.string(),
  signature_ru: z.string(),
  signature_de: z.string(),
  offer_description: z.string(),
  updated_at: z.string(),
});

export type SettingsUpdate = z.infer<typeof SettingsUpdate>;
export type SettingsRow = z.infer<typeof SettingsRow>;
