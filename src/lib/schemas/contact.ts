import { z } from "zod";

const optionalTrimmed = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .optional();

export const ContactCreate = z.object({
  name: z.string().trim().optional().default(""),
  email: z.string().trim().email("Некорректный email").nullable().optional(),
  role: optionalTrimmed,
  notes: optionalTrimmed,
});

export const ContactUpdate = ContactCreate.partial();

export const ContactRow = z.object({
  id: z.number().int(),
  lead_id: z.number().int(),
  name: z.string(),
  email: z.string().nullable(),
  role: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});

export type ContactCreate = z.infer<typeof ContactCreate>;
export type ContactUpdate = z.infer<typeof ContactUpdate>;
export type ContactRow = z.infer<typeof ContactRow>;
