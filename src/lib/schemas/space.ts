import { z } from "zod";

export const LEAD_SPACE_STATUSES = [
  "considering",
  "expose_sent",
  "rejected",
  "accepted",
] as const;
export const LeadSpaceStatus = z.enum(LEAD_SPACE_STATUSES);
export type LeadSpaceStatus = z.infer<typeof LeadSpaceStatus>;

export const LEAD_SPACE_STATUS_LABELS_RU: Record<LeadSpaceStatus, string> = {
  considering: "Рассматривают",
  expose_sent: "Exposé отправлено",
  rejected: "Отказались",
  accepted: "Согласовано",
};

export const SpaceCreate = z.object({
  name: z.string().trim().min(1, "Название обязательно"),
  floor: z.string().trim().nullable().optional(),
  area_m2: z.number().nullable().optional(),
  description: z.string().trim().default(""),
  best_for: z.string().trim().default(""),
  internal_notes: z.string().trim().default(""),
});
export const SpaceUpdate = SpaceCreate.partial();
export const SpaceRow = z.object({
  id: z.number().int(),
  name: z.string(),
  floor: z.string().nullable(),
  area_m2: z.number().nullable(),
  description: z.string(),
  best_for: z.string(),
  internal_notes: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type SpaceCreate = z.infer<typeof SpaceCreate>;
export type SpaceUpdate = z.infer<typeof SpaceUpdate>;
export type SpaceRow = z.infer<typeof SpaceRow>;

export const LeadSpaceLink = z.object({
  space: SpaceRow,
  status: LeadSpaceStatus,
  created_at: z.string(),
});
export type LeadSpaceLink = z.infer<typeof LeadSpaceLink>;
