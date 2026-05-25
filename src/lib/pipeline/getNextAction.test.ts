/**
 * Smoke-тесты для getNextAction. Запуск не настроен — это задел на будущее
 * (vitest/jest). Структура совместима с обоими.
 */
// @ts-nocheck
import { describe, it, expect } from "vitest";
import { getNextAction } from "./getNextAction";
import type { LeadRow, OutreachEventRow } from "@/lib/schemas";

function makeLead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: 1,
    name: "Test Lead",
    company: "ACME GmbH",
    email: "test@acme.de",
    website: null,
    country: "DE",
    city: null,
    segment: "gastro",
    source: "other",
    status: "new",
    hook_text: null,
    notes: null,
    next_action_due: null,
    created_at: "2026-05-01 10:00:00",
    updated_at: "2026-05-01 10:00:00",
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<OutreachEventRow> & Pick<OutreachEventRow, "type" | "happened_at">
): OutreachEventRow {
  return {
    id: 1,
    lead_id: 1,
    subject: null,
    body_snippet: null,
    notes: null,
    created_at: overrides.happened_at,
    ...overrides,
  };
}

// today = 2026-05-25 UTC
const TODAY = new Date("2026-05-25T12:00:00Z");

describe("getNextAction", () => {
  it("новый лид без событий → send_initial today", () => {
    const lead = makeLead({ status: "new" });
    const result = getNextAction(lead, [], TODAY);
    expect(result.action).toBe("send_initial");
    expect(result.due_date).toBe("2026-05-25");
    expect(result.urgency).toBe("today");
  });

  it("email_sent 8 дней назад → send_fup1 overdue", () => {
    const lead = makeLead({ status: "contacted" });
    const events: OutreachEventRow[] = [
      makeEvent({ type: "email_sent", happened_at: "2026-05-17 09:00:00" }),
    ];
    const result = getNextAction(lead, events, TODAY);
    expect(result.action).toBe("send_fup1");
    expect(result.due_date).toBe("2026-05-24");
    expect(result.urgency).toBe("overdue");
  });

  it("email_sent сегодня → send_fup1 later (через 7 дней)", () => {
    const lead = makeLead({ status: "contacted" });
    const events: OutreachEventRow[] = [
      makeEvent({ type: "email_sent", happened_at: "2026-05-25 09:00:00" }),
    ];
    const result = getNextAction(lead, events, TODAY);
    expect(result.action).toBe("send_fup1");
    expect(result.due_date).toBe("2026-06-01");
    expect(result.urgency).toBe("later");
  });

  it("fup1_sent 10 дней назад → send_fup2 today", () => {
    const lead = makeLead({ status: "fup1_sent" });
    const events: OutreachEventRow[] = [
      makeEvent({ id: 1, type: "email_sent", happened_at: "2026-05-01 09:00:00" }),
      makeEvent({ id: 2, type: "fup1_sent", happened_at: "2026-05-15 09:00:00" }),
    ];
    const result = getNextAction(lead, events, TODAY);
    expect(result.action).toBe("send_fup2");
    expect(result.due_date).toBe("2026-05-25");
    expect(result.urgency).toBe("today");
  });

  it("fup2_sent 14+ дней назад → mark_dead overdue", () => {
    const lead = makeLead({ status: "fup2_sent" });
    const events: OutreachEventRow[] = [
      makeEvent({ id: 1, type: "email_sent", happened_at: "2026-04-25 09:00:00" }),
      makeEvent({ id: 2, type: "fup1_sent", happened_at: "2026-05-02 09:00:00" }),
      makeEvent({ id: 3, type: "fup2_sent", happened_at: "2026-05-10 09:00:00" }),
    ];
    const result = getNextAction(lead, events, TODAY);
    expect(result.action).toBe("mark_dead");
    expect(result.due_date).toBe("2026-05-24");
    expect(result.urgency).toBe("overdue");
  });

  it("есть reply_received → done", () => {
    const lead = makeLead({ status: "awaiting_reply" });
    const events: OutreachEventRow[] = [
      makeEvent({ id: 1, type: "email_sent", happened_at: "2026-05-10 09:00:00" }),
      makeEvent({ id: 2, type: "reply_received", happened_at: "2026-05-15 09:00:00" }),
    ];
    const result = getNextAction(lead, events, TODAY);
    expect(result.action).toBe("done");
    expect(result.due_date).toBeNull();
    expect(result.urgency).toBeNull();
  });

  it("статус won → done без учёта событий", () => {
    const lead = makeLead({ status: "won" });
    const result = getNextAction(lead, [], TODAY);
    expect(result.action).toBe("done");
  });

  it("статус meeting_scheduled → awaiting (ручная стадия)", () => {
    const lead = makeLead({ status: "meeting_scheduled" });
    const events: OutreachEventRow[] = [
      makeEvent({ id: 1, type: "email_sent", happened_at: "2026-05-01 09:00:00" }),
    ];
    const result = getNextAction(lead, events, TODAY);
    expect(result.action).toBe("awaiting");
    expect(result.due_date).toBeNull();
    expect(result.urgency).toBeNull();
  });

  it("email_sent 3 дня назад → send_fup1 later (до due ещё 4 дня)", () => {
    const lead = makeLead({ status: "contacted" });
    const events: OutreachEventRow[] = [
      makeEvent({ type: "email_sent", happened_at: "2026-05-22 09:00:00" }),
    ];
    const result = getNextAction(lead, events, TODAY);
    expect(result.action).toBe("send_fup1");
    expect(result.due_date).toBe("2026-05-29");
    // today=05-25, soonLimit=05-28, due=05-29 → later
    expect(result.urgency).toBe("later");
  });

  it("email_sent 5 дней назад → send_fup1 soon (due через 2 дня)", () => {
    const lead = makeLead({ status: "contacted" });
    const events: OutreachEventRow[] = [
      makeEvent({ type: "email_sent", happened_at: "2026-05-20 09:00:00" }),
    ];
    const result = getNextAction(lead, events, TODAY);
    expect(result.action).toBe("send_fup1");
    expect(result.due_date).toBe("2026-05-27");
    expect(result.urgency).toBe("soon");
  });
});
