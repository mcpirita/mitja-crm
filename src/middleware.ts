import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, checkBasicHeader, getCreds, verifySession } from "@/lib/auth";

/** Пути, доступные без входа: сама форма, её API и иконки. */
const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);

export async function middleware(req: NextRequest) {
  const creds = getCreds();

  // Защита выключена, если креды не настроены (например, локально).
  if (!creds) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(cookie, creds)) return NextResponse.next();

  // Скрипты и curl продолжают ходить с заголовком Basic.
  if (checkBasicHeader(req.headers.get("authorization"), creds)) {
    return NextResponse.next();
  }

  // Запросы данных не редиректим: фронт должен увидеть 401, а не HTML формы.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Нужен вход" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

// Применяем ко всему, кроме статики Next и иконок с манифестом.
// Иконки и манифест браузер тянет отдельным запросом без наших кук: под 401
// вкладка осталась бы без иконки и установка бы не предлагалась.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|icon-512-maskable.png|apple-touch-icon.png|manifest.webmanifest).*)",
  ],
};
