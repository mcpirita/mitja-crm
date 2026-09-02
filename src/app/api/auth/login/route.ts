import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  checkCredentials,
  createSession,
  getCreds,
} from "@/lib/auth";

export async function POST(req: Request) {
  const creds = getCreds();
  if (!creds) {
    // Защита выключена — входить некуда и незачем.
    return NextResponse.json({ ok: true });
  }

  let body: { user?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Битый запрос" }, { status: 400 });
  }

  const user = typeof body.user === "string" ? body.user : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!checkCredentials(user, password, creds)) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSession(creds), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
