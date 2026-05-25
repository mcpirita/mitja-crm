import Anthropic from "@anthropic-ai/sdk";
import {
  SEGMENT_LABELS_RU,
  TEMPLATE_KIND_LABELS_RU,
  type LeadRow,
  type Segment,
  type SpaceRow,
  type TemplateKind,
} from "@/lib/schemas";

const MODEL = "claude-haiku-4-5-20251001";

const NICHE_ANGLES: Record<Segment, string> = {
  pilates: "Wellness-синергия со студией Michael K; спокойное гибкое пространство.",
  yoga: "Wellness-синергия со студией Michael K; спокойное гибкое пространство.",
  trampoline: "Высокие потолки, большое открытое пространство; пересечение аудиторий «семьи + фитнес».",
  climbing: "Высокие потолки — ключевой селлинг-поинт. В городе пробел в активном досуге.",
  lasertag: "Уже затемнённые залы, профессиональное освещение и звук — готовая база.",
  exit_room: "Самостоятельные изолированные комнаты, готовая атмосферная инфраструктура.",
  vr: "Гибкая планировка, tech-friendly пространство, пересечение с аудиторией кинотеатра.",
  padel: "Открытая площадь, спорт-аудитория от Michael K.",
  crossfit: "Высокие потолки, открытое пространство, синергия с фитнес-студией.",
  comedy: "Большой зал (600 мест), удобная остановка тура между Stuttgart/Karlsruhe/Mannheim.",
  church: "Аренда под мероприятия, большой зал, гибкое расписание.",
  dance: "Гибкая планировка, спортивно-wellness синергия с Michael K.",
  martial_arts: "Открытое пространство, синергия с фитнес-аудиторией Michael K.",
  physio: "Wellness-синергия со студией Michael K; центральная локация удобна для пациентов.",
  axe_throwing: "Изолированные залы под безопасность, аудитория активного досуга.",
  skate: "Высокие потолки, открытая площадь, аудитория активного досуга города.",
  arcade: "Tech-friendly пространство, пересечение с аудиторией кинотеатра.",
  minigolf: "Гибкая планировка, семейная аудитория от кинотеатра и фитнес-студии.",
  immersive: "Готовая атмосферная инфраструктура от кинотеатра, AV-оборудование.",
  bowling: "Открытое пространство, развлекательная аудитория от кинотеатра.",
  training: "Гибкая планировка под аудитории/семинары, центральная локация, парковка.",
  other: "Подбери релевантный угол исходя из типа бизнеса арендатора.",
};

const SYSTEM_PROMPT = `Ты помощник для холодного B2B-outreach Дмитрия Губина — он ищет арендаторов на недоиспользуемые кинозалы здания в центре Пфорцхайма (Zerrennerstraße 35).

ВАЖНЫЙ КОНТЕКСТ ПРОЕКТА:
- Здание — действующий кинотеатр (он продолжает работать). Ищем не «вакантные площади», а изучаем интерес к перепрофилированию отдельных залов.
- Размеры залов: 150–220 м² (малые) или до 600+ мест (большой зал).
- Высокие потолки, гибкие планировки.
- Существующие арендаторы: кинотеатр (продолжает работать) + Fitnessstudio Michael K — это якорный синергетический трафик.
- Парковка на территории, центральная локация, высокий пешеходный трафик.
- Помещение передаётся в Basiszustand (базовое состояние) — fit-out за счёт арендатора.
- Собственник занимается переменой целевого назначения (Umwidmung) с властями.
- НЕТ бюджета на ремонт со стороны собственника — не обещай fit-out support, ни в какой форме.

КРИТИЧНЫЕ ПРАВИЛА О ФАКТАХ:
- НИКОГДА не выдумывай: цены, точные расстояния, проценты выгоды, конкретные технические параметры (мощность электричества, высоту в метрах, площади залов в м² сверх диапазонов выше).
- Используй ТОЛЬКО факты, перечисленные выше, и факты из «Оффер» в контексте оффера. Если в оффере чего-то нет — НЕ упоминай.
- Не утверждай «нет конкурентов в городе» или подобное — это нельзя верифицировать.
- Не упоминай арендную ставку — Дмитрий не дал её.
- Если пользователь явно привязал к лиду список «Помещения для этого письма» — используй ИМЕННО ИХ (с площадями и описаниями из списка). Они могут включать кинозалы, Lumiera 170, гастро-площадь EG, офисы или их комбинацию. Правило «не смешивать» — это для случая БЕЗ явно выбранных помещений; когда пользователь выбрал несколько — это намеренное комбо.

ОБЯЗАТЕЛЬНАЯ СТРУКТУРА ПИСЬМА (6 секций, в этом порядке, не добавляй и не меняй):
1. Opening: коротко представить Дмитрия и контекст («ищу концепты для здания в Пфорцхайме»).
2. Hook: упомянуть конкретную нишу арендатора — показать, что именно этот тип бизнеса привлёк внимание.
3. The space: размер (выбери релевантный — малый или большой зал в зависимости от ниши), высокие потолки, гибкая планировка — адаптируй акценты под нишу.
4. Synergies: упомянуть Fitnessstudio Michael K + действующий кинотеатр как источники complementary трафика.
5. Supporting infrastructure: парковка, центральная локация, пешеходный трафик.
6. CTA: low-barrier. Предпочтительный финал: «Просто ответьте „Ja" — об остальном позаботимся.»

ТОН И СТИЛЬ:
- Лаконично и по-человечески, без корпоративного штампа.
- Обращение: «Sehr geehrte Damen und Herren» в немецком, «Здравствуйте» в русском. На «Sie» (формально). Только если по нише очевидно молодой/стартап-бренд и Дмитрий явно попросил — «ihr/euch».
- Без эмодзи. Не больше одного восклицательного знака на письмо.
- Не делать em-dash (—) в немецком тексте — это переводчик сам разберёт, но ты в русском старайся структурировать предложения так, чтобы не было длинных тире.
- Не лидируй с base condition. Если упоминаешь — позитивно: «полная свобода обустроить пространство под концепт».
- На каждом этапе ровно одна просьба:
  - initial: первое знакомство + CTA.
  - fup1: мягкое напоминание + новая релевантная зацепка.
  - fup2: финальное прощание, last chance, без давления.

ЧТО НЕЛЬЗЯ:
- Не обещать ремонт / отделку / fit-out / переоборудование.
- Не давать конкретные цены или скидки.
- Не утверждать «нет конкурентов».
- Не отправлять без чёткой структуры выше.

КАНОНИЧЕСКИЙ ОБРАЗЕЦ (Pilates, initial, формальный):
«Здравствуйте,

В поиске подходящих wellness- и фитнес-концепций для нашего здания в Пфорцхайме я обратил внимание на Pilates-студии и хотел коротко спросить, может ли такая локация быть интересной для вас.

В нашем здании на Zerrennerstraße 35, прямо в центре города, сейчас работает кинотеатр, и мы изучаем возможность перепрофилировать отдельные залы. Помещения от 150 до 220 м², с высокими потолками и гибкими планировками.

Особый плюс: в здании уже работают студия Fitnessstudio Michael K и действующий кинотеатр — это создаёт интересные синергии и стабильный поток посетителей из разных аудиторий.

В здании есть парковка, центральная локация с высоким пешеходным трафиком и базовая инфраструктура.

Было бы это в принципе интересно для вас? Можете просто ответить „Ja" — об остальном позаботимся.»

ВЫХОДНОЙ ФОРМАТ:
Возвращай СТРОГО JSON-объект {"subject": "...", "body": "..."}. Без markdown-блоков, без префиксов. Только JSON. Тема (subject) — конкретная, до 60 символов, без точки в конце. В body не включай подпись (Mit freundlichen Grüßen / С уважением) — она добавится отдельно.`;

export interface GenerateInput {
  lead: LeadRow;
  kind: TemplateKind;
  offerDescription: string;
  spaces?: SpaceRow[];
}

export interface GenerateResult {
  subject: string;
  body: string;
}

export async function generateEmail({
  lead,
  kind,
  offerDescription,
  spaces,
}: GenerateInput): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY не задан в окружении");
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await generateOnce({ lead, kind, offerDescription, spaces, apiKey });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!lastError.message.startsWith("Claude вернул")) throw lastError;
    }
  }
  throw lastError ?? new Error("Не удалось сгенерировать после 2 попыток");
}

function formatSpacesForPrompt(spaces: SpaceRow[]): string {
  const lines: string[] = ["Помещения, которые мы предлагаем именно этому лиду:"];
  spaces.forEach((s, idx) => {
    const floor = s.floor ? `этаж ${s.floor}` : "этаж —";
    const area = s.area_m2 !== null ? `площадь ${Math.round(s.area_m2)} м²` : "площадь —";
    const desc = s.description.trim().length > 0 ? s.description.trim() : "(описание не задано)";
    lines.push(`${idx + 1}. ${s.name} (${floor}, ${area}): ${desc}`);
  });
  return lines.join("\n");
}

async function generateOnce({
  lead,
  kind,
  offerDescription,
  spaces,
  apiKey,
}: GenerateInput & { apiKey: string }): Promise<GenerateResult> {
  const client = new Anthropic({ apiKey });

  const segmentLabel = SEGMENT_LABELS_RU[lead.segment] ?? lead.segment;
  const kindLabel = TEMPLATE_KIND_LABELS_RU[kind];
  const angle = NICHE_ANGLES[lead.segment] ?? NICHE_ANGLES.other;

  const hasSpaces = Array.isArray(spaces) && spaces.length > 0;

  // Оффер (общая фактура) передаём всегда, если задан.
  const offerBlock = offerDescription.trim()
    ? `\n\nДополнительный оффер (от Дмитрия, используй фактуру отсюда):\n${offerDescription}`
    : "";

  // Если есть конкретные spaces — добавляем строгое правило в system.
  const spacesRuleBlock = hasSpaces
    ? `\n\nПРАВИЛО ПО ВЫБРАННЫМ ПОМЕЩЕНИЯМ:\nПользователь явно выбрал ${spaces!.length} помещени${spaces!.length === 1 ? "е" : "й"} для этого лида. Опиши в письме именно их (с площадями и фактурой из описаний, которые передаст user). Если помещений несколько — представь их как варианты или комбо для арендатора. Не выдумывай характеристики, которых нет в описаниях. Площади и этажи бери СТРОГО из переданного списка.`
    : "";

  const spacesUserBlock = hasSpaces
    ? `\n${formatSpacesForPrompt(spaces!)}\n`
    : "";

  const userPrompt = [
    `Этап: ${kindLabel}`,
    `Niche angle (используй как угол подачи — зачем именно ЭТИ помещения подходят арендатору):`,
    `  ${angle}`,
    spacesUserBlock || null,
    "Лид:",
    `- Компания: ${lead.company}`,
    `- Контактное лицо: ${lead.name}`,
    `- Тип бизнеса: ${segmentLabel}`,
    `- Город: ${lead.city ?? "—"}`,
    `- Hook (зацепка от Дмитрия): ${lead.hook_text ?? "—"}`,
    lead.last_status_raw ? `- Текущая ситуация (что было раньше): ${lead.last_status_raw}` : null,
    "",
    `Напиши драфт письма (subject + body) на русском для этапа «${kindLabel}». Строго следуй 6-секционной структуре и niche angle. Перевод на немецкий — отдельный шаг, его делает другой инструмент.`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT + offerBlock + spacesRuleBlock,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = result.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const jsonText = extractJson(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Claude вернул не-JSON: ${raw.slice(0, 200)}`);
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).subject !== "string" ||
    typeof (parsed as Record<string, unknown>).body !== "string"
  ) {
    throw new Error("Claude вернул JSON без полей subject/body");
  }
  const obj = parsed as { subject: string; body: string };
  const subject = obj.subject.trim();
  const body = obj.body.trim();
  if (!subject || !body) {
    throw new Error("Claude вернул пустой subject или body");
  }
  return { subject, body };
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}
