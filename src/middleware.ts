import { NextResponse, type NextRequest } from "next/server";

// Basic Auth для всего сайта. Логин/пароль берём из env.
// Если BASIC_AUTH_USER/PASS не заданы (например, локально) — пропускаем всех.
export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // Защита выключена, если креды не настроены.
  if (!user || !pass) {
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const sep = decoded.indexOf(":");
    const u = decoded.slice(0, sep);
    const p = decoded.slice(sep + 1);
    if (u === user && p === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Mitja CRM", charset="UTF-8"' },
  });
}

// Применяем ко всему, кроме статики Next и иконок с манифестом.
// Иконки и манифест Chrome тянет отдельным запросом без наших кук и без
// Basic-заголовка: под 401 он молча оставляет вкладку без иконки и не
// предлагает установку. Поэтому эти файлы отдаём открыто — секретов в них нет.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|icon-512-maskable.png|apple-touch-icon.png|manifest.webmanifest).*)",
  ],
};
