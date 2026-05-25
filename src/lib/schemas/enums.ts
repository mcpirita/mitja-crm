import { z } from "zod";

export const SEGMENT_COLOR_PALETTE = [
  "amber",
  "lime",
  "rose",
  "orange",
  "yellow",
  "stone",
  "blue",
  "zinc",
  "emerald",
  "teal",
  "purple",
  "indigo",
  "pink",
  "sky",
  "cyan",
  "fuchsia",
  "green",
  "violet",
  "red",
] as const;
export type SegmentColor = (typeof SEGMENT_COLOR_PALETTE)[number];

export const SEGMENTS = [
  "climbing",
  "padel",
  "pilates",
  "trampoline",
  "lasertag",
  "comedy",
  "church",
  "bowling",
  "martial_arts",
  "yoga",
  "axe_throwing",
  "physio",
  "exit_room",
  "vr",
  "dance",
  "training",
  "skate",
  "arcade",
  "minigolf",
  "immersive",
  "crossfit",
  "other",
] as const;
export const SEGMENT_WITH_ANY = [...SEGMENTS, "any"] as const;

export const SOURCES = ["linkedin", "google", "catalog", "referral", "other"] as const;

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "awaiting_reply",
  "fup1_sent",
  "fup2_sent",
  "replied_interested",
  "replied_not_interested",
  "replied_later",
  "meeting_scheduled",
  "viewing_done",
  "in_negotiation",
  "won",
  "lost",
  "dead",
] as const;

export const EVENT_TYPES = [
  "email_sent",
  "fup1_sent",
  "fup2_sent",
  "reply_received",
  "meeting",
  "viewing",
  "note",
  "other",
] as const;

export const TEMPLATE_KINDS = ["initial", "fup1", "fup2"] as const;
export const TEMPLATE_LANGUAGES = ["ru", "de", "en"] as const;

export const Segment = z.string().trim().min(1).max(50);
export const SegmentWithAny = z.string().trim().min(1).max(50);
export const Source = z.enum(SOURCES);
export const LeadStatus = z.enum(LEAD_STATUSES);
export const EventType = z.enum(EVENT_TYPES);
export const TemplateKind = z.enum(TEMPLATE_KINDS);
export const TemplateLanguage = z.enum(TEMPLATE_LANGUAGES);

export type Segment = z.infer<typeof Segment>;
export type SegmentWithAny = z.infer<typeof SegmentWithAny>;
export type Source = z.infer<typeof Source>;
export type LeadStatus = z.infer<typeof LeadStatus>;
export type EventType = z.infer<typeof EventType>;
export type TemplateKind = z.infer<typeof TemplateKind>;
export type TemplateLanguage = z.infer<typeof TemplateLanguage>;

export const SEGMENT_LABELS_RU: Record<Segment, string> = {
  climbing: "Скалодром",
  padel: "Падель",
  pilates: "Пилатес",
  trampoline: "Батутный центр",
  lasertag: "Лазертаг",
  comedy: "Comedy Club",
  church: "Церкви и общины",
  bowling: "Боулинг",
  martial_arts: "Боевые искусства",
  yoga: "Йога",
  axe_throwing: "Метание топора",
  physio: "Физиотерапия",
  exit_room: "Exit Room",
  vr: "VR",
  dance: "Танцевальная студия",
  training: "Тренинги",
  skate: "Скейтборд и рампы",
  arcade: "Аркада",
  minigolf: "Мини-гольф",
  immersive: "Иммерсивные выставки",
  crossfit: "Кроссфит",
  other: "Прочее",
};

export const LEAD_STATUS_LABELS_RU: Record<LeadStatus, string> = {
  new: "Новый",
  contacted: "Первое отправлено",
  awaiting_reply: "Ждём ответ",
  fup1_sent: "Фоллоуап 1 отправлен",
  fup2_sent: "Фоллоуап 2 отправлен",
  replied_interested: "Ответили — интересно",
  replied_not_interested: "Ответили — не интересно",
  replied_later: "Ответили — позже",
  meeting_scheduled: "Встреча назначена",
  viewing_done: "Просмотр состоялся",
  in_negotiation: "Переговоры",
  won: "Выиграл",
  lost: "Проиграл",
  dead: "Мёртв",
};

export const TEMPLATE_KIND_LABELS_RU: Record<TemplateKind, string> = {
  initial: "Первое письмо",
  fup1: "Фоллоуап 1",
  fup2: "Фоллоуап 2",
};
