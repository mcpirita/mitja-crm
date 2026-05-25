import { z } from "zod";
import { EventType } from "./enums";

export const OutreachEventCreate = z.object({
  lead_id: z.number().int().positive(),
  type: EventType,
  happened_at: z.string().datetime().optional(),
  subject: z.string().trim().nullable().optional(),
  body_snippet: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const OutreachEventRow = z.object({
  id: z.number().int(),
  lead_id: z.number().int(),
  type: EventType,
  happened_at: z.string(),
  subject: z.string().nullable(),
  body_snippet: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});

export type OutreachEventCreate = z.infer<typeof OutreachEventCreate>;
export type OutreachEventRow = z.infer<typeof OutreachEventRow>;
