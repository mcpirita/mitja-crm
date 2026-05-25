import type { EventType, LeadStatus } from "@/lib/schemas";

export interface ParsedEvent {
  type: EventType;
  happened_at: string;
  source_phrase: string;
}

export interface ParsedStatus {
  status: LeadStatus;
  events: ParsedEvent[];
  detected: string[];
  unparsed_dates: string[];
}

interface Marker {
  kind: "first_email" | "fup" | "presentation";
  pos: number;
  fupOrdinal: 1 | 2 | 3 | 4 | null;
  phrase: string;
}

interface DateToken {
  iso: string;
  pos: number;
}

const NEGATIVE_PHRASES = [
  "отказались",
  "отказ от",
  "не интересно",
  "не интересен",
  "не интересна",
  "нет интереса",
  "невозможно разместить",
  "не подходит",
  "не подходим",
  "ничего не можем предложить",
  "нечего не можем предложить",
  "не идут",
  "не идёт",
  "не идет",
  "не ищут",
  "будут красть",
  "слишком мало",
  "слишком близко",
  "нет такой нужды",
  "есть свое здание",
  "есть своё здание",
];

const POSITIVE_PHRASES = [
  "есть интерес",
  "интересно",
  "интересует",
  "ответили",
  "ведем переписку",
  "ведём переписку",
  "хотят обсудить",
  "хотят базироваться",
  "хотят делать",
  "предлагают сотрудничество",
  "попросили прайс",
  "прайстлист",
  "прайс-лист",
];

const LATER_PHRASES = [
  "только открываются",
  "только открылись",
  "только открыли",
  "на реконструкции",
  "не готова покрывать",
  "нет финансирования",
  "интерес слабый",
];

const AWAITING_PHRASES = [
  "ответ - пока нет",
  "ответ -  пока нет",
  "ответ пока нет",
  "пока нет ответа",
  "ответа нет",
  "ответ нет",
  "пока нет",
];

const FIRST_EMAIL_TRIGGERS = [
  /отправил\s+перв(?:ое|ый)\s+(?:пиьсмо|письмо)/iu,
  /отпавил\s+перв(?:ое|ый)\s+(?:пиьсмо|письмо)/iu,
  /отправил\s+перв(?:ое|ый)/iu,
  /отпавил\s+перв(?:ое|ый)/iu,
];

const FUP_TRIGGER = /\b(?:follow\s*-?\s*up|фоллоуап|fup|fup-up|fu)\b/iu;
const PRESENTATION_TRIGGER = /(?:отправил|отпавил)\s+(?:второе\s+письмо\s+с\s+)?презентаци|презентац/iu;

const ORDINAL_WORD_TO_NUM: Record<string, 1 | 2 | 3 | 4> = {
  первый: 1, первого: 1, первое: 1, первой: 1,
  второй: 2, второго: 2, второе: 2, второю: 2,
  третий: 3, третьего: 3, третье: 3,
  четвертый: 4, четвёртый: 4, четверый: 4, четвертого: 4, четвертое: 4,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseDateToken(token: string, refYear: number): string | null {
  const m = token.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year: number;
  if (m[3]) {
    const raw = Number(m[3]);
    year = raw < 100 ? 2000 + raw : raw;
  } else {
    year = refYear;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function extractDates(text: string, refYear: number): DateToken[] {
  const re = /\b(\d{1,2}\.\d{1,2}(?:\.\d{2,4})?)\b/g;
  const out: DateToken[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const iso = parseDateToken(m[1], refYear);
    if (iso) out.push({ iso, pos: m.index });
  }
  return out;
}

function detectFupOrdinalNear(text: string, fupPos: number): 1 | 2 | 3 | 4 | null {
  const window = text.slice(Math.max(0, fupPos - 30), fupPos).toLowerCase();
  for (const [word, idx] of Object.entries(ORDINAL_WORD_TO_NUM)) {
    if (window.includes(word)) return idx;
  }
  const numMatch = window.match(/([1-4])\s*(?:-й)?\s*$/);
  if (numMatch) return Number(numMatch[1]) as 1 | 2 | 3 | 4;
  const after = text.slice(fupPos, Math.min(text.length, fupPos + 30)).toLowerCase();
  const afterNum = after.match(/follow\s*-?\s*up\s*(?:#|№)?\s*([1-4])/);
  if (afterNum) return Number(afterNum[1]) as 1 | 2 | 3 | 4;
  if (/отправил\s+2\s+follow/i.test(text)) return 2;
  return null;
}

function extractMarkers(text: string): Marker[] {
  const markers: Marker[] = [];

  for (const re of FIRST_EMAIL_TRIGGERS) {
    const reG = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = reG.exec(text)) !== null) {
      markers.push({ kind: "first_email", pos: m.index, fupOrdinal: null, phrase: m[0] });
    }
  }

  const fupG = new RegExp(FUP_TRIGGER.source, "giu");
  let m: RegExpExecArray | null;
  while ((m = fupG.exec(text)) !== null) {
    const overlaps = markers.some(
      (x) => x.kind === "first_email" && Math.abs(x.pos - m!.index) < 40,
    );
    if (overlaps) continue;
    const ord = detectFupOrdinalNear(text, m.index);
    markers.push({ kind: "fup", pos: m.index, fupOrdinal: ord, phrase: m[0] });
  }

  const presG = new RegExp(PRESENTATION_TRIGGER.source, "giu");
  let p: RegExpExecArray | null;
  while ((p = presG.exec(text)) !== null) {
    const overlaps = markers.some(
      (x) => Math.abs(x.pos - p!.index) < 25,
    );
    if (overlaps) continue;
    markers.push({ kind: "presentation", pos: p.index, fupOrdinal: null, phrase: p[0] });
  }

  markers.sort((a, b) => a.pos - b.pos);
  const dedup: Marker[] = [];
  for (const m2 of markers) {
    if (dedup.length > 0 && dedup[dedup.length - 1].pos === m2.pos) continue;
    dedup.push(m2);
  }
  return dedup;
}

function assignDates(markers: Marker[], dates: DateToken[], refIso: string): { events: ParsedEvent[]; unparsed: string[] } {
  const used = new Set<number>();
  const events: ParsedEvent[] = [];

  let fupSeen = 0;

  for (const marker of markers) {
    let dateIso: string | null = null;
    let bestDateIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < dates.length; i++) {
      if (used.has(i)) continue;
      const d = dates[i];
      if (d.pos < marker.pos) continue;
      const dist = d.pos - marker.pos;
      if (dist < bestDist) {
        bestDist = dist;
        bestDateIdx = i;
      }
    }
    if (bestDateIdx === -1) {
      for (let i = 0; i < dates.length; i++) {
        if (used.has(i)) continue;
        const dist = Math.abs(dates[i].pos - marker.pos);
        if (dist < bestDist) {
          bestDist = dist;
          bestDateIdx = i;
        }
      }
    }

    if (bestDateIdx >= 0) {
      used.add(bestDateIdx);
      dateIso = dates[bestDateIdx].iso;
    }

    if (marker.kind === "first_email") {
      events.push({
        type: "email_sent",
        happened_at: dateIso ?? refIso,
        source_phrase: "Отправил первое письмо",
      });
    } else if (marker.kind === "fup") {
      fupSeen++;
      const ord = marker.fupOrdinal ?? fupSeen;
      const day = dateIso ?? refIso;
      if (ord === 1) {
        events.push({ type: "fup1_sent", happened_at: day, source_phrase: "fup1" });
      } else if (ord === 2) {
        events.push({ type: "fup2_sent", happened_at: day, source_phrase: "fup2" });
      } else {
        events.push({
          type: "other",
          happened_at: day,
          source_phrase: `Follow-up #${ord} (вне воронки)`,
        });
      }
    } else {
      events.push({
        type: "other",
        happened_at: dateIso ?? refIso,
        source_phrase: "Отправил презентацию",
      });
    }
  }

  const unparsed: string[] = [];
  for (let i = 0; i < dates.length; i++) {
    if (!used.has(i)) unparsed.push(dates[i].iso);
  }

  return { events, unparsed };
}

function shiftDateDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function containsAny(haystack: string, phrases: string[]): boolean {
  return phrases.some((p) => haystack.includes(p));
}

function startsWithStandaloneNo(lower: string): boolean {
  return /^нет[\s.,;:!]/.test(lower) || lower === "нет";
}

export function parseStatus(rawInput: string, referenceDate: Date): ParsedStatus {
  const raw = rawInput.trim();
  const refYear = referenceDate.getUTCFullYear();
  const refIso = referenceDate.toISOString().slice(0, 10);
  const lower = raw.toLowerCase();

  const dates = extractDates(raw, refYear);
  const markers = extractMarkers(raw);
  const { events, unparsed } = assignDates(markers, dates, refIso);
  const detected: string[] = markers.map((m) =>
    m.kind === "fup" ? `fup${m.fupOrdinal ?? "?"}` : m.kind,
  );

  const hasFupMarker = markers.some((m) => m.kind === "fup");
  const hasFirstEmailMarker = markers.some((m) => m.kind === "first_email");
  if (hasFupMarker && !hasFirstEmailMarker) {
    const firstFup = events.find(
      (e) => e.type === "fup1_sent" || e.type === "fup2_sent" || e.type === "other",
    );
    if (firstFup) {
      events.unshift({
        type: "email_sent",
        happened_at: shiftDateDays(firstFup.happened_at, -7),
        source_phrase: "Подразумеваемое первое письмо (за 7 дней до fup)",
      });
      detected.push("implied_first_email");
    }
  }

  const isLater = containsAny(lower, LATER_PHRASES);
  const isAwaiting = containsAny(lower, AWAITING_PHRASES);
  const isPositive = containsAny(lower, POSITIVE_PHRASES);
  const isNegativePhrase = containsAny(lower, NEGATIVE_PHRASES);
  const isStandaloneNo = startsWithStandaloneNo(lower);

  let status: LeadStatus;

  if (isLater) {
    status = "replied_later";
    detected.push("later");
  } else if (isAwaiting && !isNegativePhrase && !isStandaloneNo) {
    status = "awaiting_reply";
    detected.push("awaiting");
  } else if (isNegativePhrase || isStandaloneNo) {
    events.push({
      type: "reply_received",
      happened_at: events.length > 0 ? events[events.length - 1].happened_at : refIso,
      source_phrase: "Получен отрицательный ответ",
    });
    status = "replied_not_interested";
    detected.push("negative");
  } else if (isPositive) {
    events.push({
      type: "reply_received",
      happened_at: events.length > 0 ? events[events.length - 1].happened_at : refIso,
      source_phrase: "Получен положительный ответ",
    });
    status = "replied_interested";
    detected.push("positive");
  } else if (events.length > 0) {
    const last = events[events.length - 1];
    if (last.type === "fup2_sent") status = "fup2_sent";
    else if (last.type === "fup1_sent") status = "fup1_sent";
    else if (last.type === "email_sent") status = "contacted";
    else status = "contacted";
  } else {
    status = "new";
    detected.push("no_signal");
  }

  return { status, events, detected, unparsed_dates: unparsed };
}
