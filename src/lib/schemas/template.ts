import { z } from "zod";
import { SegmentWithAny, TemplateKind, TemplateLanguage } from "./enums";

export const EmailTemplateCreate = z.object({
  name: z.string().trim().min(1, "Название обязательно"),
  language: TemplateLanguage.default("ru"),
  segment: SegmentWithAny,
  kind: TemplateKind,
  subject: z.string().trim().min(1, "Тема обязательна"),
  body: z.string().trim().min(1, "Тело письма обязательно"),
});

export const EmailTemplateUpdate = EmailTemplateCreate.partial();

export const EmailTemplateRow = z.object({
  id: z.number().int(),
  name: z.string(),
  language: TemplateLanguage,
  segment: SegmentWithAny,
  kind: TemplateKind,
  subject: z.string(),
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type EmailTemplateCreate = z.infer<typeof EmailTemplateCreate>;
export type EmailTemplateUpdate = z.infer<typeof EmailTemplateUpdate>;
export type EmailTemplateRow = z.infer<typeof EmailTemplateRow>;
