import { z } from "zod";
import { SEGMENT_COLOR_PALETTE } from "./enums";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9_-]+$/, "slug может содержать только a-z, 0-9, _ и -");

export const SegmentCreate = z.object({
  slug: slugSchema.optional(),
  label_ru: z.string().trim().min(1, "Лейбл обязателен").max(80),
  color: z.enum(SEGMENT_COLOR_PALETTE).default("zinc"),
});

export const SegmentUpdate = z.object({
  label_ru: z.string().trim().min(1).max(80).optional(),
  color: z.enum(SEGMENT_COLOR_PALETTE).optional(),
  sort_order: z.number().int().optional(),
  is_archived: z.union([z.literal(0), z.literal(1), z.boolean()]).optional(),
});

export const SegmentRow = z.object({
  slug: z.string(),
  label_ru: z.string(),
  color: z.string(),
  sort_order: z.number().int(),
  is_archived: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type SegmentCreate = z.infer<typeof SegmentCreate>;
export type SegmentUpdate = z.infer<typeof SegmentUpdate>;
export type SegmentRow = z.infer<typeof SegmentRow>;
