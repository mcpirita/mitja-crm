-- Mitja CRM — initial schema (migration 0001)
-- libsql / sqlite. ENUMs реализованы через CHECK constraint, чтобы можно было
-- читать значения прямо из БД без отдельного словаря.

CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT,
    website TEXT,
    country TEXT NOT NULL DEFAULT 'DE',
    city TEXT,
    segment TEXT NOT NULL CHECK (segment IN ('gastro', 'services', 'office', 'entertainment')),
    source TEXT NOT NULL DEFAULT 'other' CHECK (source IN ('linkedin', 'google', 'catalog', 'referral', 'other')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
        'new',
        'contacted',
        'awaiting_reply',
        'fup1_sent',
        'fup2_sent',
        'replied_interested',
        'replied_not_interested',
        'replied_later',
        'meeting_scheduled',
        'viewing_done',
        'in_negotiation',
        'won',
        'lost',
        'dead'
    )),
    hook_text TEXT,
    notes TEXT,
    next_action_due TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_segment ON leads(segment);
CREATE INDEX IF NOT EXISTS idx_leads_next_action_due ON leads(next_action_due);

CREATE TABLE IF NOT EXISTS outreach_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'email_sent',
        'fup1_sent',
        'fup2_sent',
        'reply_received',
        'meeting',
        'viewing',
        'note',
        'other'
    )),
    happened_at TEXT NOT NULL DEFAULT (datetime('now')),
    subject TEXT,
    body_snippet TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_lead_id ON outreach_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_events_happened_at ON outreach_events(happened_at);

CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'ru' CHECK (language IN ('ru', 'de', 'en')),
    segment TEXT NOT NULL CHECK (segment IN ('gastro', 'services', 'office', 'entertainment', 'any')),
    kind TEXT NOT NULL CHECK (kind IN ('initial', 'fup1', 'fup2')),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_templates_segment_kind ON email_templates(segment, kind);

-- Одиночная строка id=1.
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    translation_style TEXT NOT NULL DEFAULT '',
    signature_ru TEXT NOT NULL DEFAULT '',
    signature_de TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (id, translation_style, signature_ru, signature_de)
VALUES (
    1,
    'Переведи русский текст делового письма на немецкий язык. Стиль: формальный, уважительный, обращение Sie/Ihr Team. Без англицизмов и канцеляризмов. Сохраняй структуру абзацев и пустые строки исходника. Тема (Betreff) переводится отдельно и обязательно. Подпись (Mit freundlichen Grüßen + имя) добавляется автоматически — её переводить не нужно, она будет подставлена из настроек. Возвращай ТОЛЬКО переведённый текст без объяснений и комментариев.',
    'С уважением,
Дмитрий Губин
Zerrennerstraße 35, 75172 Pforzheim',
    'Mit freundlichen Grüßen
Dmitry Gubin
Zerrennerstraße 35, 75172 Pforzheim'
);
