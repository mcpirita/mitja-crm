import { z } from "zod";
import { DealType, LeadStatus, Priority, Segment, Source } from "./enums";

const optionalTrimmed = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .optional();

export const LeadCreate = z.object({
  name: z.string().trim().optional().default(""),
  company: z.string().trim().min(1, "Компания обязательна"),
  email: z.string().trim().email("Некорректный email").nullable().optional(),
  website: optionalTrimmed,
  country: z.string().trim().min(2).default("DE"),
  city: optionalTrimmed,
  segment: Segment,
  source: Source.default("other"),
  status: LeadStatus.default("new"),
  deal_type: DealType.default("rent"),
  priority: Priority.default("medium"),
  hook_text: optionalTrimmed,
  notes: optionalTrimmed,
});

export const LeadUpdate = LeadCreate.partial();

export const LeadRow = z.object({
  id: z.number().int(),
  name: z.string(),
  company: z.string(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  country: z.string(),
  city: z.string().nullable(),
  segment: Segment,
  source: Source,
  status: LeadStatus,
  deal_type: DealType,
  priority: Priority,
  hook_text: z.string().nullable(),
  notes: z.string().nullable(),
  last_status_raw: z.string().nullable(),
  next_action_due: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type LeadCreate = z.infer<typeof LeadCreate>;
export type LeadUpdate = z.infer<typeof LeadUpdate>;
export type LeadRow = z.infer<typeof LeadRow>;
