-- Mitja CRM — schema (migration 0002, расширили segment под реальный список арендаторов Lumiera).
-- libsql / sqlite. ENUMs реализованы через CHECK constraint.

CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL,
    email TEXT,
    website TEXT,
    country TEXT NOT NULL DEFAULT 'DE',
    city TEXT,
    -- segment теперь хранится как обычный TEXT и валидируется на уровне приложения
    -- через таблицу segments. CHECK constraint снят, чтобы можно было создавать
    -- сегменты в рантайме (см. scripts/migrate.ts → maybeRebuildLeads).
    segment TEXT NOT NULL,
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
    last_status_raw TEXT,
    next_action_due TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_segment ON leads(segment);
CREATE INDEX IF NOT EXISTS idx_leads_next_action_due ON leads(next_action_due);

-- Дополнительные контакты лида. Главный контакт остаётся в leads.name / leads.email
-- (денормализация — его используют письма, «сегодня» и списки). Здесь — все
-- остальные имена/почты компании, с которыми идёт переписка.
CREATE TABLE IF NOT EXISTS lead_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    email TEXT,
    role TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_lead ON lead_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_email ON lead_contacts(email);

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
    -- segment без CHECK (см. таблицу segments + maybeRebuildTemplates). 'any' допустим.
    segment TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('initial', 'fup1', 'fup2')),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_templates_segment_kind ON email_templates(segment, kind);

CREATE TABLE IF NOT EXISTS spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    floor TEXT,
    area_m2 REAL,
    description TEXT NOT NULL DEFAULT '',
    best_for TEXT NOT NULL DEFAULT '',
    internal_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lead_spaces (
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'considering'
        CHECK (status IN ('considering','expose_sent','rejected','accepted')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (lead_id, space_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_spaces_lead ON lead_spaces(lead_id);

-- Динамические сегменты: вынесли из CHECK constraint, чтобы можно было добавлять на лету.
CREATE TABLE IF NOT EXISTS segments (
    slug TEXT PRIMARY KEY,
    label_ru TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'zinc',
    sort_order INTEGER NOT NULL DEFAULT 100,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_segments_archived_sort ON segments(is_archived, sort_order);

INSERT OR IGNORE INTO segments (slug, label_ru, color, sort_order) VALUES
    ('climbing',     'Скалодром',            'amber',   10),
    ('padel',        'Падель',               'lime',    20),
    ('pilates',      'Пилатес',              'rose',    30),
    ('trampoline',   'Батутный центр',       'orange',  40),
    ('lasertag',     'Лазертаг',             'red',     50),
    ('comedy',       'Comedy Club',          'yellow',  60),
    ('church',       'Церкви и общины',      'stone',   70),
    ('bowling',      'Боулинг',              'blue',    80),
    ('martial_arts', 'Боевые искусства',     'zinc',    90),
    ('yoga',         'Йога',                 'emerald', 100),
    ('axe_throwing', 'Метание топора',       'orange',  110),
    ('physio',       'Физиотерапия',         'teal',    120),
    ('exit_room',    'Exit Room',            'purple',  130),
    ('vr',           'VR',                   'indigo',  140),
    ('dance',        'Танцевальная студия',  'pink',    150),
    ('training',     'Тренинги',             'sky',     160),
    ('skate',        'Скейтборд и рампы',    'cyan',    170),
    ('arcade',       'Аркада',               'fuchsia', 180),
    ('minigolf',     'Мини-гольф',           'green',   190),
    ('immersive',    'Иммерсивные выставки', 'violet',  200),
    ('crossfit',     'Кроссфит',             'red',     210),
    ('other',        'Прочее',               'zinc',    999);

-- Одиночная строка id=1.
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    translation_style TEXT NOT NULL DEFAULT '',
    signature_ru TEXT NOT NULL DEFAULT '',
    signature_de TEXT NOT NULL DEFAULT '',
    offer_description TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (id, translation_style, signature_ru, signature_de, offer_description)
VALUES (
    1,
    'Переведи русский текст делового письма на немецкий язык. Стиль: формальный, уважительный, обращение Sie/Ihr Team. Без англицизмов и канцеляризмов. Сохраняй структуру абзацев и пустые строки исходника. Тема (Betreff) переводится отдельно и обязательно. Подпись (Mit freundlichen Grüßen + имя) добавляется автоматически — её переводить не нужно, она будет подставлена из настроек. Возвращай ТОЛЬКО переведённый текст без объяснений и комментариев.',
    'С уважением,
Дмитрий Губин
Zerrennerstraße 35, 75172 Pforzheim',
    'Mit freundlichen Grüßen
Dmitry Gubin
Zerrennerstraße 35, 75172 Pforzheim',
    'Здание в Пфорцхайме (Zerrennerstraße 35, 75172 Pforzheim). Несколько площадей: бывшие кинозалы под перепрофилирование, пустые кабинеты, отдельная гастро-площадь на первом этаже, наружная площадка. Площади 100–250 м² (есть и больше). Гибкие условия аренды, готовы адаптировать помещение под бизнес арендатора. Целевые арендаторы — спорт/развлечения/комьюнити-проекты, нужны нестандартные пространства.'
);

-- Добавление поля offer_description к существующей строке (для существующих БД без offer_description).
UPDATE settings SET offer_description = COALESCE(NULLIF(offer_description, ''),
    'Здание в Пфорцхайме (Zerrennerstraße 35, 75172 Pforzheim). Несколько площадей: бывшие кинозалы под перепрофилирование, пустые кабинеты, отдельная гастро-площадь на первом этаже, наружная площадка. Площади 100–250 м² (есть и больше). Гибкие условия аренды, готовы адаптировать помещение под бизнес арендатора. Целевые арендаторы — спорт/развлечения/комьюнити-проекты, нужны нестандартные пространства.')
WHERE id = 1;
