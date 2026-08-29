# Mitja CRM

A cold-outreach CRM I built for my own pipeline: tracking commercial-property
leads across Germany, deciding who to contact today, and drafting the emails.

Personal tool, not a product — but a real one I use, so nothing here is a demo
stub. It replaced a spreadsheet that had stopped being readable at about
forty leads.

## What it does

**Pipeline with a memory.** Every lead carries a status — `new` → `contacted`
→ `awaiting_reply` → `replied_interested` / `replied_later` /
`replied_not_interested` / `dead` — plus a log of touches and their dates.

**A "today" view.** The core of the thing. Instead of scrolling a list and
guessing, `/today` computes the next action per lead: who has gone quiet long
enough to need a follow-up, whose deadline has slipped into overdue, what is
merely scheduled for later. The rule that decides this lives in
[`src/lib/pipeline/getNextAction.ts`](src/lib/pipeline/getNextAction.ts) and
is unit-tested — it is the one piece where a wrong answer wastes a real
opportunity.

**Email drafting.** Reusable templates with variable interpolation, rendered
per lead. Where a first draft saves the most time, the Anthropic API writes
it and translates between German and English — outreach goes out in German,
I think in Russian.

**Bulk import.** CSV in, with a parser that reads free-text status notes
("no interest", "replied, not now") and maps them onto pipeline states, plus
duplicate detection so a re-import does not fork a lead in two.

**Segments and spaces.** Leads grouped by business type, and a catalogue of
the actual rentable spaces — floor, area, what each one suits — so an offer
can be matched to a tenant instead of written from scratch.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Turso (SQLite over `@libsql/client`) · Zod · Anthropic API · Vercel

Zod schemas in `src/lib/schemas/` are the single source of truth for shape —
API routes and forms validate against the same definitions.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run migrate              # create tables in the target database
npm run dev                  # http://localhost:3002
```

| Variable | What it is |
| --- | --- |
| `LIBSQL_URL` | `file:local.db` for local work, or a Turso URL |
| `LIBSQL_AUTH_TOKEN` | Turso token; leave empty for a local file |
| `ANTHROPIC_API_KEY` | needed for email drafting and translation |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` | protects the deployed instance |

## A note on the data

The repository ships with no leads in it. The contact list this was built
around is real people at real companies, so it lives in the database and
never in git — `/data` and `*.csv` are ignored on purpose.
