/**
 * Авторизация одного пользователя.
 *
 * Раньше был Basic Auth, но Chrome не всегда показывает системный диалог —
 * в установленном как приложение окне вводить логин просто негде. Поэтому
 * основной путь теперь — форма входа и подписанная кука; заголовок
 * `Authorization: Basic` продолжаем принимать, чтобы не ломать curl и скрипты.
 *
 * Отдельного секрета не заводим: ключ подписи выводим из самих кредов, так
 * что на Vercel ничего добавлять не нужно, а смена пароля разлогинивает.
 */

export const SESSION_COOKIE = "mitja_session";

/** 90 дней: инструмент личный, каждую неделю логиниться незачем. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90;

export interface Creds {
  user: string;
  pass: string;
}

/** null — защита выключена (локально креды не заданы). */
export function getCreds(): Creds | null {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) return null;
  return { user, pass };
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(data: string, creds: Creds): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`mitja-crm:${creds.user}:${creds.pass}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}

/** Сравнение без ранних выходов — чтобы по времени ответа не подбирали подпись. */
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Токен вида `<срок в мс>.<подпись>`. */
export async function createSession(creds: Creds): Promise<string> {
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  return `${expires}.${await sign(String(expires), creds)}`;
}

export async function verifySession(
  token: string | undefined,
  creds: Creds,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expires = Number(token.slice(0, dot));
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  return equal(token.slice(dot + 1), await sign(String(expires), creds));
}

/** Совместимость со скриптами: `Authorization: Basic base64(user:pass)`. */
export function checkBasicHeader(header: string | null, creds: Creds): boolean {
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  return (
    equal(decoded.slice(0, sep), creds.user) && equal(decoded.slice(sep + 1), creds.pass)
  );
}

export function checkCredentials(
  user: string,
  pass: string,
  creds: Creds,
): boolean {
  return equal(user, creds.user) && equal(pass, creds.pass);
}
