export type TemplateVars = {
  name?: string;
  company?: string;
  city?: string;
  hook?: string;
};

export type RenderResult = {
  text: string;
  missing: string[];
};

const PLACEHOLDERS: (keyof TemplateVars)[] = ["name", "company", "city", "hook"];

export function substituteVars(body: string, vars: TemplateVars): RenderResult {
  const missing: string[] = [];
  let text = body;

  for (const key of PLACEHOLDERS) {
    const value = vars[key];
    const token = `{${key}}`;
    if (value && value.trim().length > 0) {
      text = text.split(token).join(value);
    } else if (text.includes(token)) {
      missing.push(key);
    }
  }

  return { text, missing };
}
